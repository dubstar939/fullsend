/**
 * WebGPU Mesh
 * Represents geometry data with vertex and index buffers.
 */

import { WebGPUBufferManager, BufferHandle } from './WebGPUBufferManager';
import { LOWPOLY_VERTEX_STRIDE } from '../../types/renderer.types';

export interface MeshData {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
}

export class WebGPUMesh {
  private _vertexBuffer: BufferHandle;
  private _indexBuffer: BufferHandle;
  private _indexCount: number;
  private _indexFormat: GPUIndexFormat;
  private _bufferManager: WebGPUBufferManager;
  private _vertexData: MeshData | null = null; // Keep reference for batch merging

  constructor(
    bufferManager: WebGPUBufferManager,
    data: MeshData
  ) {
    this._bufferManager = bufferManager;
    this._vertexData = data; // Store for later access

    // Create vertex buffer
    this._vertexBuffer = bufferManager.createVertexBuffer(data.vertices.buffer);

    // Create index buffer
    const isUint32 = data.indices instanceof Uint32Array;
    this._indexBuffer = bufferManager.createIndexBuffer(
      data.indices.buffer,
      isUint32
    );
    this._indexFormat = isUint32 ? 'uint32' : 'uint16';
    this._indexCount = data.indices.length;
  }

  /**
   * Get the vertex buffer handle.
   */
  getVertexBuffer(): GPUBuffer {
    return this._vertexBuffer.buffer;
  }

  /**
   * Get the index buffer handle.
   */
  getIndexBuffer(): GPUBuffer {
    return this._indexBuffer.buffer;
  }

  /**
   * Get the number of indices.
   */
  getIndexCount(): number {
    return this._indexCount;
  }

  /**
   * Get the index format.
   */
  getIndexFormat(): GPUIndexFormat {
    return this._indexFormat;
  }

  /**
   * Get the vertex stride in bytes.
   */
  getVertexStride(): number {
    return LOWPOLY_VERTEX_STRIDE;
  }

  /**
   * Get the original vertex data (for static batching).
   */
  getVertexData(): MeshData | null {
    return this._vertexData;
  }

  /**
   * Update vertex data (for dynamic meshes).
   * Note: This assumes the new data fits in the existing buffer.
   */
  updateVertices(vertices: Float32Array): void {
    if (vertices.byteLength > this._vertexBuffer.size) {
      console.warn('[Mesh] New vertex data exceeds buffer size. Creating new buffer.');
      this._vertexBuffer = this._bufferManager.createVertexBuffer(vertices.buffer);
      if (this._vertexData) {
        this._vertexData.vertices = vertices;
      }
    } else {
      this._bufferManager.updateUniformBuffer(
        this._vertexBuffer.buffer,
        vertices.buffer
      );
      if (this._vertexData) {
        this._vertexData.vertices = vertices;
      }
    }
  }

  /**
   * Dispose mesh resources.
   */
  dispose(): void {
    this._bufferManager.destroyBuffer(this._vertexBuffer);
    this._bufferManager.destroyBuffer(this._indexBuffer);
    this._vertexData = null;
  }
}

/**
 * Helper to create a simple cube mesh (low-poly style).
 */
export function createCubeMesh(bufferManager: WebGPUBufferManager): WebGPUMesh {
  // Cube vertices: position(3) + normal(3) + uv(2) + color(4) = 12 floats per vertex
  const half = 0.5;
  
  // Positions for 6 faces (2 triangles each = 4 vertices per face with degenerate or 6 unique)
  // Using unique vertices per face for proper flat shading normals
  const positions = [
    // Front (z = +half)
    [-half, -half, half], [half, -half, half], [half, half, half], [-half, half, half],
    // Back (z = -half)
    [half, -half, -half], [-half, -half, -half], [-half, half, -half], [half, half, -half],
    // Top (y = +half)
    [-half, half, half], [half, half, half], [half, half, -half], [-half, half, -half],
    // Bottom (y = -half)
    [-half, -half, -half], [half, -half, -half], [half, -half, half], [-half, -half, half],
    // Right (x = +half)
    [half, -half, half], [half, -half, -half], [half, half, -half], [half, half, half],
    // Left (x = -half)
    [-half, -half, -half], [-half, -half, half], [-half, half, half], [-half, half, -half],
  ];

  const normals = [
    // Front
    [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
    // Back
    [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
    // Top
    [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
    // Bottom
    [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0],
    // Right
    [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
    // Left
    [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
  ];

  const uvs = [
    // Front
    [0, 0], [1, 0], [1, 1], [0, 1],
    // Back
    [0, 0], [1, 0], [1, 1], [0, 1],
    // Top
    [0, 0], [1, 0], [1, 1], [0, 1],
    // Bottom
    [0, 0], [1, 0], [1, 1], [0, 1],
    // Right
    [0, 0], [1, 0], [1, 1], [0, 1],
    // Left
    [0, 0], [1, 0], [1, 1], [0, 1],
  ];

  // White color for all vertices
  const colors = Array(24).fill([1, 1, 1, 1]);

  // Interleave vertex data
  const vertices = new Float32Array(24 * 12); // 24 vertices, 12 floats each
  for (let i = 0; i < 24; i++) {
    const offset = i * 12;
    vertices[offset + 0] = positions[i][0];
    vertices[offset + 1] = positions[i][1];
    vertices[offset + 2] = positions[i][2];
    vertices[offset + 3] = normals[i][0];
    vertices[offset + 4] = normals[i][1];
    vertices[offset + 5] = normals[i][2];
    vertices[offset + 6] = uvs[i][0];
    vertices[offset + 7] = uvs[i][1];
    vertices[offset + 8] = colors[i][0];
    vertices[offset + 9] = colors[i][1];
    vertices[offset + 10] = colors[i][2];
    vertices[offset + 11] = colors[i][3];
  }

  // Indices for 6 faces (2 triangles per face)
  const indices = new Uint16Array([
    // Front
    0, 1, 2, 0, 2, 3,
    // Back
    4, 5, 6, 4, 6, 7,
    // Top
    8, 9, 10, 8, 10, 11,
    // Bottom
    12, 13, 14, 12, 14, 15,
    // Right
    16, 17, 18, 16, 18, 19,
    // Left
    20, 21, 22, 20, 22, 23,
  ]);

  return new WebGPUMesh(bufferManager, { vertices, indices });
}

/**
 * Helper to create a simple plane mesh.
 */
export function createPlaneMesh(
  bufferManager: WebGPUBufferManager,
  width: number = 1,
  depth: number = 1,
  subdivisions: number = 1
): WebGPUMesh {
  const halfW = width / 2;
  const halfD = depth / 2;
  const stepX = width / subdivisions;
  const stepZ = depth / subdivisions;

  const vertices: number[] = [];
  const indices: number[] = [];

  // Generate vertices
  for (let z = 0; z <= subdivisions; z++) {
    for (let x = 0; x <= subdivisions; x++) {
      const px = -halfW + x * stepX;
      const pz = -halfD + z * stepZ;
      
      // Position
      vertices.push(px, 0, pz);
      // Normal (up)
      vertices.push(0, 1, 0);
      // UV
      vertices.push(x / subdivisions, z / subdivisions);
      // Color (white)
      vertices.push(1, 1, 1, 1);
    }
  }

  // Generate indices
  for (let z = 0; z < subdivisions; z++) {
    for (let x = 0; x < subdivisions; x++) {
      const i0 = z * (subdivisions + 1) + x;
      const i1 = i0 + 1;
      const i2 = i0 + subdivisions + 1;
      const i3 = i2 + 1;

      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }

  return new WebGPUMesh(bufferManager, {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  });
}
