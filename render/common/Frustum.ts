/**
 * View Frustum Utilities
 * Extract frustum planes from view-projection matrix and perform culling tests.
 */

import { mat4, vec3, vec4 } from 'gl-matrix';
import { ViewFrustum, FrustumPlane, BoundingSphere, BoundingBox } from '../../types/renderer.types';

/**
 * Extract frustum planes from a combined view-projection matrix.
 * The planes are oriented so that positive distance means "inside" the frustum.
 */
export function extractFrustum(viewProjectionMatrix: mat4): ViewFrustum {
  const planes: FrustumPlane[] = [];
  
  // Extract plane equations from the view-projection matrix
  // Each plane is stored as (normal.x, normal.y, normal.z, distance)
  // The matrix rows/columns depend on the coordinate system
  
  // For row-major matrices (gl-matrix default):
  // Left plane: row[3] + row[0]
  // Right plane: row[3] - row[0]
  // Bottom plane: row[3] + row[1]
  // Top plane: row[3] - row[1]
  // Near plane: row[3] + row[2]
  // Far plane: row[3] - row[2]
  
  const m = viewProjectionMatrix;
  
  // Left plane
  planes.push(normalizePlane([
    m[12] + m[0],
    m[13] + m[1],
    m[14] + m[2],
    m[15] + m[3]
  ]));
  
  // Right plane
  planes.push(normalizePlane([
    m[12] - m[0],
    m[13] - m[1],
    m[14] - m[2],
    m[15] - m[3]
  ]));
  
  // Bottom plane
  planes.push(normalizePlane([
    m[12] + m[4],
    m[13] + m[5],
    m[14] + m[6],
    m[15] + m[7]
  ]));
  
  // Top plane
  planes.push(normalizePlane([
    m[12] - m[4],
    m[13] - m[5],
    m[14] - m[6],
    m[15] - m[7]
  ]));
  
  // Near plane
  planes.push(normalizePlane([
    m[12] + m[8],
    m[13] + m[9],
    m[14] + m[10],
    m[15] + m[11]
  ]));
  
  // Far plane
  planes.push(normalizePlane([
    m[12] - m[8],
    m[13] - m[9],
    m[14] - m[10],
    m[15] - m[11]
  ]));
  
  return { planes };
}

/**
 * Normalize a plane equation (ax + by + cz + d = 0).
 * Input is [a, b, c, d], output has normalized normal vector.
 */
function normalizePlane(plane: [number, number, number, number]): FrustumPlane {
  const [a, b, c, d] = plane;
  const length = Math.sqrt(a * a + b * b + c * c);
  
  if (length === 0) {
    return { normal: [0, 0, 0], distance: 0 };
  }
  
  return {
    normal: [a / length, b / length, c / length],
    distance: d / length
  };
}

/**
 * Test if a point is inside the frustum.
 */
export function isPointInFrustum(frustum: ViewFrustum, point: vec3): boolean {
  for (const plane of frustum.planes) {
    const distance = vec3.dot(plane.normal, point) + plane.distance;
    if (distance < 0) {
      return false;
    }
  }
  return true;
}

/**
 * Test if a bounding sphere intersects the frustum.
 * Returns true if the sphere is at least partially inside.
 */
export function isSphereInFrustum(frustum: ViewFrustum, sphere: BoundingSphere): boolean {
  for (const plane of frustum.planes) {
    const distance = vec3.dot(plane.normal, sphere.center) + plane.distance;
    if (distance < -sphere.radius) {
      return false; // Sphere is completely outside this plane
    }
  }
  return true; // Sphere is inside or intersecting
}

/**
 * Test if a bounding box intersects the frustum.
 * Uses the optimized method testing the most-positive vertex.
 */
export function isBoxInFrustum(frustum: ViewFrustum, box: BoundingBox): boolean {
  for (const plane of frustum.planes) {
    // Find the most-positive vertex relative to this plane's normal
    const px = plane.normal[0] >= 0 ? box.max[0] : box.min[0];
    const py = plane.normal[1] >= 0 ? box.max[1] : box.min[1];
    const pz = plane.normal[2] >= 0 ? box.max[2] : box.min[2];
    
    const distance = plane.normal[0] * px + plane.normal[1] * py + plane.normal[2] * pz + plane.distance;
    
    if (distance < 0) {
      return false; // Box is completely outside this plane
    }
  }
  return true; // Box is inside or intersecting
}

/**
 * Compute the squared distance from a point to a bounding sphere.
 * Returns 0 if the point is inside the sphere.
 */
export function distanceToPointSquared(point: vec3, sphere: BoundingSphere): number {
  const dx = point[0] - sphere.center[0];
  const dy = point[1] - sphere.center[1];
  const dz = point[2] - sphere.center[2];
  const distSq = dx * dx + dy * dy + dz * dz;
  const radiusSq = sphere.radius * sphere.radius;
  
  if (distSq <= radiusSq) {
    return 0; // Point is inside sphere
  }
  
  return Math.sqrt(distSq) - sphere.radius;
}

/**
 * Compute the distance from a point to a bounding sphere center.
 */
export function distanceToSphereCenter(point: vec3, sphere: BoundingSphere): number {
  const dx = point[0] - sphere.center[0];
  const dy = point[1] - sphere.center[1];
  const dz = point[2] - sphere.center[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Create a bounding sphere from vertices.
 * Uses a simple centroid-based approach (not optimal but fast).
 */
export function createBoundingSphereFromVertices(vertices: Float32Array): BoundingSphere {
  const numVerts = vertices.length / 3;
  
  // Compute centroid
  const center: vec3 = [0, 0, 0];
  for (let i = 0; i < numVerts; i++) {
    center[0] += vertices[i * 3];
    center[1] += vertices[i * 3 + 1];
    center[2] += vertices[i * 3 + 2];
  }
  center[0] /= numVerts;
  center[1] /= numVerts;
  center[2] /= numVerts;
  
  // Compute max distance from centroid
  let maxDistSq = 0;
  for (let i = 0; i < numVerts; i++) {
    const dx = vertices[i * 3] - center[0];
    const dy = vertices[i * 3 + 1] - center[1];
    const dz = vertices[i * 3 + 2] - center[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > maxDistSq) {
      maxDistSq = distSq;
    }
  }
  
  return {
    center: vec3.clone(center),
    radius: Math.sqrt(maxDistSq)
  };
}

/**
 * Create a bounding box from vertices.
 */
export function createBoundingBoxFromVertices(vertices: Float32Array): BoundingBox {
  const numVerts = vertices.length / 3;
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < numVerts; i++) {
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    const z = vertices[i * 3 + 2];
    
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ]
  };
}

/**
 * Transform a bounding sphere by a matrix.
 * Note: This assumes uniform scaling. For non-uniform scaling, use AABB.
 */
export function transformBoundingSphere(sphere: BoundingSphere, matrix: mat4): BoundingSphere {
  // Transform center
  const transformedCenter = vec4.create();
  vec4.transformMat4(transformedCenter, [...sphere.center, 1], matrix);
  
  // Scale radius by the maximum scale factor from the matrix
  const scaleX = vec3.len([matrix[0], matrix[1], matrix[2]]);
  const scaleY = vec3.len([matrix[4], matrix[5], matrix[6]]);
  const scaleZ = vec3.len([matrix[8], matrix[9], matrix[10]]);
  const maxScale = Math.max(scaleX, scaleY, scaleZ);
  
  return {
    center: [transformedCenter[0], transformedCenter[1], transformedCenter[2]],
    radius: sphere.radius * maxScale
  };
}

/**
 * Transform a bounding box by a matrix.
 */
export function transformBoundingBox(box: BoundingBox, matrix: mat4): BoundingBox {
  const corners: vec3[] = [
    [box.min[0], box.min[1], box.min[2]],
    [box.max[0], box.min[1], box.min[2]],
    [box.min[0], box.max[1], box.min[2]],
    [box.max[0], box.max[1], box.min[2]],
    [box.min[0], box.min[1], box.max[2]],
    [box.max[0], box.min[1], box.max[2]],
    [box.min[0], box.max[1], box.max[2]],
    [box.max[0], box.max[1], box.max[2]]
  ];
  
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (const corner of corners) {
    const transformed = vec4.create();
    vec4.transformMat4(transformed, [...corner, 1], matrix);
    
    const x = transformed[0];
    const y = transformed[1];
    const z = transformed[2];
    
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  
  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ]
  };
}
