/**
 * WebGPU Frame Graph
 * Manages render passes and organizes the rendering pipeline.
 * Designed for future extensibility (post-processing, shadows, etc.)
 */

import { WebGPUDeviceManager } from './WebGPUDeviceManager';
import { LightingData, DEFAULT_LIGHTING, LIGHTING_UNIFORM_SIZE, CAMERA_UNIFORM_SIZE } from '../../types/renderer.types';

export interface RenderPassDescriptor {
  label: string;
  colorAttachments: GPURenderPassColorAttachment[];
  depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
}

export class WebGPUFrameGraph {
  private _deviceManager: WebGPUDeviceManager;
  private _lighting: LightingData;
  
  // Global uniform buffers
  private _cameraUniformBuffer: GPUBuffer | null = null;
  private _cameraUniformData: Float32Array | null = null;
  private _lightingUniformBuffer: GPUBuffer | null = null;
  private _lightingUniformData: Float32Array | null = null;
  
  // Bind groups for global uniforms
  private _globalBindGroup: GPUBindGroup | null = null;

  constructor(deviceManager: WebGPUDeviceManager) {
    this._deviceManager = deviceManager;
    this._lighting = { ...DEFAULT_LIGHTING };
  }

  /**
   * Initialize global uniform buffers.
   */
  initialize(device: GPUDevice): void {
    // Camera uniform buffer
    this._cameraUniformBuffer = device.createBuffer({
      label: 'CameraUniformBuffer',
      size: CAMERA_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._cameraUniformData = new Float32Array(CAMERA_UNIFORM_SIZE / 4);

    // Lighting uniform buffer
    this._lightingUniformBuffer = device.createBuffer({
      label: 'LightingUniformBuffer',
      size: LIGHTING_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._lightingUniformData = new Float32Array(LIGHTING_UNIFORM_SIZE / 4);

    // Update lighting data
    this._updateLightingUniforms(device);
  }

  /**
   * Create the global bind group (camera + lighting).
   */
  createGlobalBindGroup(
    device: GPUDevice,
    bindGroupLayout: GPUBindGroupLayout
  ): GPUBindGroup {
    if (!this._cameraUniformBuffer || !this._lightingUniformBuffer) {
      throw new Error('FrameGraph not initialized. Call initialize() first.');
    }

    this._globalBindGroup = device.createBindGroup({
      label: 'GlobalBindGroup',
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this._cameraUniformBuffer },
        },
        {
          binding: 1,
          resource: { buffer: this._lightingUniformBuffer },
        },
      ],
    });

    return this._globalBindGroup;
  }

  /**
   * Update camera uniforms.
   */
  updateCameraUniforms(device: GPUDevice, uniforms: {
    viewMatrix: Float32Array;
    projectionMatrix: Float32Array;
    cameraPosition: Float32Array;
  }): void {
    if (!this._cameraUniformBuffer || !this._cameraUniformData) {
      throw new Error('FrameGraph not initialized.');
    }

    const data = this._cameraUniformData;
    let offset = 0;

    // View matrix (16 floats)
    for (let i = 0; i < 16; i++) {
      data[offset++] = uniforms.viewMatrix[i];
    }

    // Projection matrix (16 floats)
    for (let i = 0; i < 16; i++) {
      data[offset++] = uniforms.projectionMatrix[i];
    }

    // Camera position (4 floats)
    data[offset++] = uniforms.cameraPosition[0];
    data[offset++] = uniforms.cameraPosition[1];
    data[offset++] = uniforms.cameraPosition[2];
    data[offset++] = uniforms.cameraPosition[3] || 0;

    device.queue.writeBuffer(this._cameraUniformBuffer, 0, data.buffer);
  }

  /**
   * Set lighting configuration.
   */
  setLighting(lighting: Partial<LightingData>): void {
    this._lighting = { ...this._lighting, ...lighting };
  }

  /**
   * Get current lighting data.
   */
  getLighting(): LightingData {
    return { ...this._lighting };
  }

  /**
   * Update lighting uniforms on GPU.
   */
  private _updateLightingUniforms(device: GPUDevice): void {
    if (!this._lightingUniformBuffer || !this._lightingUniformData) {
      throw new Error('FrameGraph not initialized.');
    }

    const data = this._lightingUniformData;
    const lighting = this._lighting;

    // Light direction (vec4: xyz = direction, w unused)
    data[0] = lighting.directional.direction[0];
    data[1] = lighting.directional.direction[1];
    data[2] = lighting.directional.direction[2];
    data[3] = 0;

    // Light color (vec4: rgb = color, w = intensity)
    data[4] = lighting.directional.color[0];
    data[5] = lighting.directional.color[1];
    data[6] = lighting.directional.color[2];
    data[7] = lighting.directional.intensity;

    // Ambient color (vec4: rgb = color, w = intensity)
    data[8] = lighting.ambient.color[0];
    data[9] = lighting.ambient.color[1];
    data[10] = lighting.ambient.color[2];
    data[11] = lighting.ambient.intensity;

    device.queue.writeBuffer(this._lightingUniformBuffer, 0, data.buffer);
  }

  /**
   * Begin the main render pass.
   */
  beginRenderPass(
    encoder: GPUCommandEncoder,
    view: GPUTextureView,
    depthView: GPUTextureView | null,
    clearColor: [number, number, number, number]
  ): GPURenderPassEncoder {
    const colorAttachment: GPURenderPassColorAttachment = {
      view,
      clearValue: { r: clearColor[0], g: clearColor[1], b: clearColor[2], a: clearColor[3] },
      loadOp: 'clear',
      storeOp: 'store',
    };

    const descriptor: GPURenderPassDescriptor = {
      label: 'MainRenderPass',
      colorAttachments: [colorAttachment],
    };

    if (depthView) {
      descriptor.depthStencilAttachment = {
        view: depthView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: 'clear',
        stencilStoreOp: 'store',
      };
    }

    return encoder.beginRenderPass(descriptor);
  }

  /**
   * Get the global bind group.
   */
  getGlobalBindGroup(): GPUBindGroup | null {
    return this._globalBindGroup;
  }

  /**
   * TODO: Add post-processing pass support
   * This would involve creating intermediate textures and additional passes.
   */
  
  /**
   * TODO: Add shadow pass support
   * This would involve rendering from light's perspective to a depth texture.
   */

  /**
   * Dispose resources.
   */
  dispose(): void {
    if (this._cameraUniformBuffer) {
      this._cameraUniformBuffer.destroy();
      this._cameraUniformBuffer = null;
    }
    if (this._lightingUniformBuffer) {
      this._lightingUniformBuffer.destroy();
      this._lightingUniformBuffer = null;
    }
    this._globalBindGroup = null;
  }
}
