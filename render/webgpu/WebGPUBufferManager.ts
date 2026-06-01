/**
 * WebGPU Buffer Manager
 * Handles vertex, index, and uniform buffer allocation and management.
 */

import {
  OBJECT_UNIFORM_SIZE,
  CAMERA_UNIFORM_SIZE,
  LIGHTING_UNIFORM_SIZE,
} from '../../types/renderer.types';

export interface BufferHandle {
  buffer: GPUBuffer;
  size: number;
  usage: GPUBufferUsageFlags;
}

export class WebGPUBufferManager {
  private _device: GPUDevice;
  private _buffers: Set<GPUBuffer> = new Set();

  constructor(device: GPUDevice) {
    this._device = device;
  }

  /**
   * Create a vertex buffer with the given data.
   */
  createVertexBuffer(data: ArrayBuffer): BufferHandle {
    const buffer = this._device.createBuffer({
      label: 'VertexBuffer',
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });

    this._device.queue.writeBuffer(buffer, 0, data);
    this._buffers.add(buffer);

    return {
      buffer,
      size: data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    };
  }

  /**
   * Create an index buffer with the given data.
   */
  createIndexBuffer(data: ArrayBuffer, isUint32: boolean = false): BufferHandle {
    const buffer = this._device.createBuffer({
      label: 'IndexBuffer',
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: false,
    });

    this._device.queue.writeBuffer(buffer, 0, data);
    this._buffers.add(buffer);

    return {
      buffer,
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    };
  }

  /**
   * Create a uniform buffer for object data.
   * Size is fixed to OBJECT_UNIFORM_SIZE.
   */
  createObjectUniformBuffer(): BufferHandle {
    const buffer = this._device.createBuffer({
      label: 'ObjectUniformBuffer',
      size: OBJECT_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this._buffers.add(buffer);

    return {
      buffer,
      size: OBJECT_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
  }

  /**
   * Create a uniform buffer for camera data.
   */
  createCameraUniformBuffer(): BufferHandle {
    const buffer = this._device.createBuffer({
      label: 'CameraUniformBuffer',
      size: CAMERA_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this._buffers.add(buffer);

    return {
      buffer,
      size: CAMERA_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
  }

  /**
   * Create a uniform buffer for lighting data.
   */
  createLightingUniformBuffer(): BufferHandle {
    const buffer = this._device.createBuffer({
      label: 'LightingUniformBuffer',
      size: LIGHTING_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this._buffers.add(buffer);

    return {
      buffer,
      size: LIGHTING_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    };
  }

  /**
   * Update a uniform buffer with new data.
   */
  updateUniformBuffer(buffer: GPUBuffer, data: ArrayBuffer): void {
    this._device.queue.writeBuffer(buffer, 0, data);
  }

  /**
   * Create a staging buffer for CPU->GPU transfers.
   * Useful for dynamic vertex data.
   */
  createStagingBuffer(size: number): BufferHandle {
    const buffer = this._device.createBuffer({
      label: 'StagingBuffer',
      size,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });

    this._buffers.add(buffer);

    return {
      buffer,
      size,
      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
    };
  }

  /**
   * Destroy a buffer handle.
   */
  destroyBuffer(handle: BufferHandle): void {
    handle.buffer.destroy();
    this._buffers.delete(handle.buffer);
  }

  /**
   * Dispose all buffers.
   */
  dispose(): void {
    for (const buffer of this._buffers) {
      buffer.destroy();
    }
    this._buffers.clear();
  }

  /**
   * Get total buffer memory allocated (approximate).
   */
  getTotalMemory(): number {
    let total = 0;
    for (const buffer of this._buffers) {
      total += buffer.size;
    }
    return total;
  }
}
