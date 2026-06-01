/**
 * WebGPU Renderable
 * Combines mesh, material, and transform into a renderable scene object.
 */

import { WebGPUMesh } from './WebGPUMesh';
import { MaterialData, DEFAULT_MATERIAL, TransformData, OBJECT_UNIFORM_SIZE } from '../../types/renderer.types';
import { Transform } from '../common/Transform';

export class WebGPURenderable {
  private _id: string;
  private _mesh: WebGPUMesh;
  private _material: MaterialData;
  private _transform: Transform;
  private _visible: boolean;
  private _castShadow: boolean;
  private _receiveShadow: boolean;
  
  // Uniform buffer for this object (created on demand)
  private _uniformBuffer: GPUBuffer | null = null;
  private _uniformData: Float32Array | null = null;

  constructor(
    id: string,
    mesh: WebGPUMesh,
    material: Partial<MaterialData> = {},
    transform?: Transform
  ) {
    this._id = id;
    this._mesh = mesh;
    this._material = { ...DEFAULT_MATERIAL, ...material };
    this._transform = transform || new Transform();
    this._visible = true;
    this._castShadow = false;
    this._receiveShadow = true;
  }

  get id(): string { return this._id; }
  get mesh(): WebGPUMesh { return this._mesh; }
  get material(): MaterialData { return this._material; }
  get transform(): Transform { return this._transform; }
  get visible(): boolean { return this._visible; }
  get castShadow(): boolean { return this._castShadow; }
  get receiveShadow(): boolean { return this._receiveShadow; }

  set visible(value: boolean) { this._visible = value; }
  set castShadow(value: boolean) { this._castShadow = value; }
  set receiveShadow(value: boolean) { this._receiveShadow = value; }

  /**
   * Update material properties.
   */
  updateMaterial(updates: Partial<MaterialData>): void {
    this._material = { ...this._material, ...updates };
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
   * TODO: Add frustum culling check here
   */
  shouldBeRendered(cameraFrustum?: any): boolean {
    if (!this._visible) return false;
    
    // TODO: Implement frustum culling
    // if (cameraFrustum && !cameraFrustum.intersectsMesh(this)) return false;
    
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
