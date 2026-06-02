/**
 * GPU Instancing System
 * Enables efficient rendering of multiple instances of the same mesh with different transforms.
 * 
 * Performance Benefits:
 * - Reduces draw calls from N to 1 per batch
 * - Minimizes CPU-GPU synchronization
 * - Uses instance buffers for transform data
 */

import { WebGPUMesh } from './WebGPUMesh';
import { WebGPUBufferManager, BufferHandle } from './WebGPUBufferManager';
import { MaterialData, DEFAULT_MATERIAL } from '../../types/renderer.types';
import { mat4, vec3, vec4 } from 'gl-matrix';

/**
 * Instance data for a single object in an instanced batch.
 */
export interface InstanceData {
  modelMatrix: mat4;
  color: vec4;
  id: string;
  visible: boolean;
}

/**
 * Instance buffer layout for WebGPU.
 * Each instance has: modelMatrix (16 floats) + color (4 floats) = 20 floats = 80 bytes
 */
export const INSTANCE_STRIDE = 80; // bytes per instance
export const INSTANCE_VERTEX_LAYOUT = [
  { format: 'float32x4', offset: 0, shaderLocation: 4 },   // modelMatrix row 0
  { format: 'float32x4', offset: 16, shaderLocation: 5 },  // modelMatrix row 1
  { format: 'float32x4', offset: 32, shaderLocation: 6 },  // modelMatrix row 2
  { format: 'float32x4', offset: 48, shaderLocation: 7 },  // modelMatrix row 3
  { format: 'float32x4', offset: 64, shaderLocation: 8 },  // color
];

/**
 * Manages a batch of instanced objects sharing the same mesh and material.
 */
export class InstancingBatch {
  private _mesh: WebGPUMesh;
  private _material: MaterialData;
  private _instances: Map<string, InstanceData> = new Map();
  private _instanceBuffer: BufferHandle | null = null;
  private _instanceCount: number = 0;
  private _bufferManager: WebGPUBufferManager;
  private _dirty: boolean = true;
  private _maxInstances: number = 1000;

  constructor(
    bufferManager: WebGPUBufferManager,
    mesh: WebGPUMesh,
    material: Partial<MaterialData> = {},
    maxInstances: number = 1000
  ) {
    this._bufferManager = bufferManager;
    this._mesh = mesh;
    this._material = { ...DEFAULT_MATERIAL, ...material };
    this._maxInstances = maxInstances;
  }

  get mesh(): WebGPUMesh { return this._mesh; }
  get material(): MaterialData { return this._material; }
  get instanceCount(): number { return this._instanceCount; }
  get isDirty(): boolean { return this._dirty; }

  /**
   * Add an instance to the batch.
   */
  addInstance(id: string, modelMatrix: mat4, color?: vec4): void {
    if (this._instances.size >= this._maxInstances) {
      console.warn('[InstancingBatch] Max instances reached');
      return;
    }

    this._instances.set(id, {
      modelMatrix,
      color: color || [1, 1, 1, 1],
      id,
      visible: true,
    });
    this._dirty = true;
    this._instanceCount = this._instances.size;
  }

  /**
   * Remove an instance from the batch.
   */
  removeInstance(id: string): void {
    if (this._instances.delete(id)) {
      this._dirty = true;
      this._instanceCount = this._instances.size;
    }
  }

  /**
   * Update an instance's transform.
   */
  updateInstance(id: string, modelMatrix: mat4): void {
    const instance = this._instances.get(id);
    if (instance) {
      instance.modelMatrix = modelMatrix;
      this._dirty = true;
    }
  }

  /**
   * Update an instance's color.
   */
  updateInstanceColor(id: string, color: vec4): void {
    const instance = this._instances.get(id);
    if (instance) {
      instance.color = color;
      this._dirty = true;
    }
  }

  /**
   * Set instance visibility.
   */
  setInstanceVisible(id: string, visible: boolean): void {
    const instance = this._instances.get(id);
    if (instance && instance.visible !== visible) {
      instance.visible = visible;
      this._dirty = true;
    }
  }

  /**
   * Get or create the instance buffer, updating if dirty.
   */
  getInstanceBuffer(device: GPUDevice): GPUBuffer {
    if (!this._instanceBuffer || this._instanceCount === 0) {
      if (this._instanceCount === 0) {
        // Create a minimal buffer for zero instances
        const emptyData = new Float32Array(INSTANCE_STRIDE / 4);
        this._instanceBuffer = this._bufferManager.createVertexBuffer(emptyData.buffer);
        return this._instanceBuffer.buffer;
      }
      
      // Create new buffer
      const bufferSize = this._maxInstances * INSTANCE_STRIDE;
      const data = new Float32Array(bufferSize / 4);
      this._packInstances(data);
      this._instanceBuffer = this._bufferManager.createVertexBuffer(data.buffer);
      return this._instanceBuffer.buffer;
    }

    if (this._dirty) {
      // Update existing buffer
      const data = new Float32Array(this._maxInstances * INSTANCE_STRIDE / 4);
      this._packInstances(data);
      device.queue.writeBuffer(this._instanceBuffer.buffer, 0, data.buffer);
      this._dirty = false;
    }

    return this._instanceBuffer.buffer;
  }

  /**
   * Pack all visible instances into a flat array for GPU upload.
   */
  private _packInstances(data: Float32Array): void {
    let offset = 0;
    for (const instance of this._instances.values()) {
      if (!instance.visible) continue;

      // Model matrix (16 floats)
      for (let i = 0; i < 16; i++) {
        data[offset++] = instance.modelMatrix[i];
      }

      // Color (4 floats)
      data[offset++] = instance.color[0];
      data[offset++] = instance.color[1];
      data[offset++] = instance.color[2];
      data[offset++] = instance.color[3];
    }
  }

  /**
   * Get the number of visible instances.
   */
  getVisibleInstanceCount(): number {
    let count = 0;
    for (const instance of this._instances.values()) {
      if (instance.visible) count++;
    }
    return count;
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    if (this._instanceBuffer) {
      this._bufferManager.destroyBuffer(this._instanceBuffer);
      this._instanceBuffer = null;
    }
    this._instances.clear();
    this._instanceCount = 0;
  }
}

/**
 * Manager for multiple instancing batches.
 * Groups objects by mesh+material combination for optimal batching.
 */
export class InstancingManager {
  private _batches: Map<string, InstancingBatch> = new Map();
  private _bufferManager: WebGPUBufferManager;

  constructor(bufferManager: WebGPUBufferManager) {
    this._bufferManager = bufferManager;
  }

  /**
   * Get or create a batch for the given mesh and material.
   */
  getOrCreateBatch(
    mesh: WebGPUMesh,
    material: Partial<MaterialData> = {},
    maxInstances: number = 1000
  ): InstancingBatch {
    const key = this._generateBatchKey(mesh, material);
    
    if (!this._batches.has(key)) {
      const batch = new InstancingBatch(this._bufferManager, mesh, material, maxInstances);
      this._batches.set(key, batch);
    }

    return this._batches.get(key)!;
  }

  /**
   * Get a batch by key.
   */
  getBatch(key: string): InstancingBatch | undefined {
    return this._batches.get(key);
  }

  /**
   * Get all batches.
   */
  getAllBatches(): IterableIterator<InstancingBatch> {
    return this._batches.values();
  }

  /**
   * Remove a batch.
   */
  removeBatch(key: string): void {
    const batch = this._batches.get(key);
    if (batch) {
      batch.dispose();
      this._batches.delete(key);
    }
  }

  /**
   * Clear all batches.
   */
  clear(): void {
    for (const batch of this._batches.values()) {
      batch.dispose();
    }
    this._batches.clear();
  }

  /**
   * Generate a unique key for mesh+material combination.
   */
  private _generateBatchKey(mesh: WebGPUMesh, material: Partial<MaterialData>): string {
    // Use mesh reference and material properties for key
    const matKey = `${material.flatShading ?? false}_${material.wireframe ?? false}`;
    return `batch_${mesh}_${matKey}`;
  }
}

/**
 * Helper to create an instance matrix from position, rotation, scale.
 */
export function createInstanceMatrix(
  position: vec3 = [0, 0, 0],
  rotation: vec3 = [0, 0, 0],
  scale: vec3 = [1, 1, 1]
): mat4 {
  const matrix = mat4.create();
  
  // Translate
  mat4.translate(matrix, matrix, position);
  
  // Rotate (YXZ order for typical game use)
  mat4.rotateY(matrix, matrix, rotation[1]);
  mat4.rotateX(matrix, matrix, rotation[0]);
  mat4.rotateZ(matrix, matrix, rotation[2]);
  
  // Scale
  mat4.scale(matrix, matrix, scale);
  
  return matrix;
}

/**
 * Extract position from instance matrix (for frustum culling).
 */
export function getInstancePosition(matrix: mat4): vec3 {
  return [matrix[12], matrix[13], matrix[14]];
}
