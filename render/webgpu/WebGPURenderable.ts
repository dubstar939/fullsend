/**
 * WebGPU Renderable
 * Combines mesh, material, and transform into a renderable scene object.
 */

import { WebGPUMesh } from './WebGPUMesh';
import { MaterialData, DEFAULT_MATERIAL, TransformData, OBJECT_UNIFORM_SIZE, BoundingSphere, LODConfig, DEFAULT_LOD_CONFIG } from '../../types/renderer.types';
import { Transform } from '../common/Transform';
import { createBoundingSphereFromVertices, distanceToSphereCenter, isSphereInFrustum, ViewFrustum } from '../common/Frustum';

export class WebGPURenderable {
  private _id: string;
  private _mesh: WebGPUMesh;
  private _material: MaterialData;
  private _transform: Transform;
  private _visible: boolean;
  private _castShadow: boolean;
  private _receiveShadow: boolean;
  
  // Bounding volume for culling
  private _boundingSphere: BoundingSphere | null = null;
  
  // LOD configuration
  private _lodConfig: LODConfig;
  private _currentLOD: number = 0;
  private _lastLODDistance: number = -1;
  
  // Uniform buffer for this object (created on demand)
  private _uniformBuffer: GPUBuffer | null = null;
  private _uniformData: Float32Array | null = null;

  constructor(
    id: string,
    mesh: WebGPUMesh,
    material: Partial<MaterialData> = {},
    transform?: Transform,
    lodConfig?: Partial<LODConfig>
  ) {
    this._id = id;
    this._mesh = mesh;
    this._material = { ...DEFAULT_MATERIAL, ...material };
    this._transform = transform || new Transform();
    this._visible = true;
    this._castShadow = false;
    this._receiveShadow = true;
    
    // Setup LOD config with defaults
    this._lodConfig = {
      distances: lodConfig?.distances ?? DEFAULT_LOD_CONFIG.distances,
      lodMeshes: lodConfig?.lodMeshes,
    };
    
    // Compute bounding sphere from mesh vertices
    this._computeBoundingSphere();
  }

  get id(): string { return this._id; }
  get mesh(): WebGPUMesh { return this._mesh; }
  get material(): MaterialData { return this._material; }
  get transform(): Transform { return this._transform; }
  get visible(): boolean { return this._visible; }
  get castShadow(): boolean { return this._castShadow; }
  get receiveShadow(): boolean { return this._receiveShadow; }
  get boundingSphere(): BoundingSphere | null { return this._boundingSphere; }
  get currentLOD(): number { return this._currentLOD; }
  get lodConfig(): LODConfig { return this._lodConfig; }

  set visible(value: boolean) { this._visible = value; }
  set castShadow(value: boolean) { this._castShadow = value; }
  set receiveShadow(value: boolean) { this._receiveShadow = value; }

  /**
   * Compute bounding sphere from mesh vertices.
   */
  private _computeBoundingSphere(): void {
    const vertexData = this._mesh.getVertexData();
    if (vertexData) {
      this._boundingSphere = createBoundingSphereFromVertices(vertexData);
    }
  }

  /**
   * Update material properties.
   */
  updateMaterial(updates: Partial<MaterialData>): void {
    this._material = { ...this._material, ...updates };
  }

  /**
   * Set custom LOD configuration.
   */
  setLODConfig(config: Partial<LODConfig>): void {
    if (config.distances) {
      this._lodConfig.distances = config.distances;
    }
    if (config.lodMeshes) {
      this._lodConfig.lodMeshes = config.lodMeshes;
    }
  }

  /**
   * Update LOD level based on distance to camera.
   * Uses hysteresis to prevent popping.
   */
  updateLOD(cameraPosition: [number, number, number], hysteresis: number = 0.1): void {
    if (!this._boundingSphere) return;
    
    // Calculate distance to camera
    const distance = distanceToSphereCenter(cameraPosition, this._boundingSphere);
    
    // Determine appropriate LOD level
    let targetLOD = 0;
    for (let i = 0; i < this._lodConfig.distances.length; i++) {
      if (distance >= this._lodConfig.distances[i]) {
        targetLOD = i + 1;
      }
    }
    
    // Clamp to max available LOD levels
    const maxLOD = this._lodConfig.lodMeshes 
      ? this._lodConfig.lodMeshes.length - 1 
      : this._lodConfig.distances.length;
    targetLOD = Math.min(targetLOD, maxLOD);
    
    // Apply hysteresis to prevent LOD popping
    const threshold = hysteresis * (this._lodConfig.distances[targetLOD] || Infinity);
    const distanceDiff = Math.abs(distance - this._lastLODDistance);
    
    if (targetLOD !== this._currentLOD && distanceDiff > threshold) {
      this._currentLOD = targetLOD;
      this._lastLODDistance = distance;
      
      // Switch mesh if custom LOD meshes are provided
      if (this._lodConfig.lodMeshes && this._lodConfig.lodMeshes[this._currentLOD]) {
        this._mesh = this._lodConfig.lodMeshes[this._currentLOD];
      }
    } else if (targetLOD === this._currentLOD) {
      this._lastLODDistance = distance;
    }
  }

  /**
   * Get or create the uniform buffer for this object.
   */
  getUniformBuffer(device: GPUDevice): GPUBuffer {
    if (!this._uniformBuffer) {
      this._uniformBuffer = device.createBuffer({
        label: `ObjectUniform_${this._id}`,
        size: OBJECT_UNIFORM_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      this._uniformData = new Float32Array(OBJECT_UNIFORM_SIZE / 4);
    }
    return this._uniformBuffer;
  }

  /**
   * Update uniform buffer with current transform and material data.
   * Must match the ObjectUniforms struct in WGSL exactly.
   */
  updateUniforms(device: GPUDevice): void {
    const buffer = this.getUniformBuffer(device);
    if (!this._uniformData) {
      this._uniformData = new Float32Array(OBJECT_UNIFORM_SIZE / 4);
    }

    const data = this._uniformData;
    let offset = 0;

    // Model matrix (16 floats)
    const modelMatrix = this._transform.getModelMatrix();
    for (let i = 0; i < 16; i++) {
      data[offset++] = modelMatrix[i];
    }

    // Normal matrix (12 floats - we only need upper 3x4, but WGSL expects mat4x4)
    const normalMatrix = this._transform.getNormalMatrix();
    for (let i = 0; i < 16; i++) {
      data[offset++] = normalMatrix[i];
    }

    // Color (4 floats)
    data[offset++] = this._material.color[0];
    data[offset++] = this._material.color[1];
    data[offset++] = this._material.color[2];
    data[offset++] = this._material.color[3];

    // Emissive (4 floats - vec3 + padding)
    data[offset++] = this._material.emissive[0];
    data[offset++] = this._material.emissive[1];
    data[offset++] = this._material.emissive[2];
    data[offset++] = 0; // padding

    // Roughness (1 float)
    data[offset++] = this._material.roughness;

    // Metalness (1 float)
    data[offset++] = this._material.metalness;

    // Flat shading (1 float - 0 or 1)
    data[offset++] = this._material.flatShading ? 1 : 0;

    // Wireframe (1 float - 0 or 1)
    data[offset++] = this._material.wireframe ? 1 : 0;

    // Write to GPU buffer
    device.queue.writeBuffer(buffer, 0, data.buffer);
  }

  /**
   * Check if this object should be rendered.
   * Performs frustum culling against bounding sphere.
   */
  shouldBeRendered(cameraFrustum?: ViewFrustum, cameraPosition?: [number, number, number]): boolean {
    if (!this._visible) return false;
    
    // Frustum culling check
    if (cameraFrustum && this._boundingSphere) {
      if (!isSphereInFrustum(cameraFrustum, this._boundingSphere)) {
        return false;
      }
    }
    
    // Distance culling - if beyond all LOD thresholds, don't render
    if (this._boundingSphere && cameraPosition) {
      const distance = distanceToSphereCenter(cameraPosition, this._boundingSphere);
      const maxDistance = this._lodConfig.distances[this._lodConfig.distances.length - 1];
      if (distance > maxDistance) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    if (this._uniformBuffer) {
      this._uniformBuffer.destroy();
      this._uniformBuffer = null;
    }
    // Note: Mesh is shared, so we don't dispose it here
  }
}
