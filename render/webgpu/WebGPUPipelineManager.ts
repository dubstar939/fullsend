/**
 * WebGPU Pipeline Manager
 * Handles creation and caching of render pipelines and bind group layouts.
 */

import { LOWPOLY_SHADER_WGSL } from './shaders/lowpoly.wgsl';
import { LOWPOLY_VERTEX_LAYOUT, LOWPOLY_VERTEX_STRIDE } from '../../types/renderer.types';
import { INSTANCE_VERTEX_LAYOUT, INSTANCE_STRIDE } from './WebGPUInstancing';

export interface PipelineConfig {
  primitive: GPUPrimitiveState;
  depthStencil: GPUDepthStencilState | undefined;
  multisample: GPUMultisampleState;
}

export class WebGPUPipelineManager {
  private _device: GPUDevice;
  private _shaderModule: GPUShaderModule | null = null;
  private _pipelineCache: Map<string, GPURenderPipeline> = new Map();
  private _bindGroupLayouts: Map<string, GPUBindGroupLayout> = new Map();

  constructor(device: GPUDevice) {
    this._device = device;
  }

  /**
   * Get or create the shader module.
   */
  getShaderModule(): GPUShaderModule {
    if (!this._shaderModule) {
      this._shaderModule = this._device.createShaderModule({
        label: 'LowPolyShader',
        code: LOWPOLY_SHADER_WGSL,
      });
    }
    return this._shaderModule;
  }

  /**
   * Get or create a bind group layout.
   * Layout 0: Camera + Lighting uniforms
   * Layout 1: Object uniforms
   */
  getBindGroupLayout(groupIndex: number): GPUBindGroupLayout {
    const key = `layout_${groupIndex}`;
    
    if (!this._bindGroupLayouts.has(key)) {
      let entries: GPUBindGroupLayoutEntry[];

      if (groupIndex === 0) {
        // Global uniforms: camera + lighting
        entries = [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
        ];
      } else {
        // Per-object uniforms
        entries = [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
        ];
      }

      const layout = this._device.createBindGroupLayout({
        label: `BindGroupLayout_${groupIndex}`,
        entries,
      });

      this._bindGroupLayouts.set(key, layout);
    }

    return this._bindGroupLayouts.get(key)!;
  }

  /**
   * Create a pipeline layout from bind group layouts.
   */
  createPipelineLayout(): GPUPipelineLayout {
    return this._device.createPipelineLayout({
      label: 'LowPolyPipelineLayout',
      bindGroupLayouts: [
        this.getBindGroupLayout(0),
        this.getBindGroupLayout(1),
      ],
    });
  }

  /**
   * Get or create a render pipeline with the given configuration.
   */
  getRenderPipeline(config: {
    vertexFormat?: GPUVertexFormat;
    stripIndexFormat?: GPUIndex16Format | GPUIndex32Format;
    cullMode?: GPUCullMode;
    depthWriteEnabled?: boolean;
    compareFunction?: GPUCompareFunction;
    instanced?: boolean; // Enable instanced rendering
  } = {}): GPURenderPipeline {
    const key = JSON.stringify(config);
    
    if (!this._pipelineCache.has(key)) {
      const pipeline = this._createPipeline(config);
      this._pipelineCache.set(key, pipeline);
    }

    return this._pipelineCache.get(key)!;
  }

  /**
   * Create a new render pipeline.
   */
  private _createPipeline(config: {
    vertexFormat?: GPUVertexFormat;
    stripIndexFormat?: GPUIndex16Format | GPUIndex32Format;
    cullMode?: GPUCullMode;
    depthWriteEnabled?: boolean;
    compareFunction?: GPUCompareFunction;
    instanced?: boolean;
  }): GPURenderPipeline {
    const shaderModule = this.getShaderModule();
    const layout = this.createPipelineLayout();

    // Build vertex buffer layouts
    const vertexBuffers: GPUVertexBufferLayout[] = [];
    
    // Base vertex buffer (always present)
    vertexBuffers.push({
      arrayStride: LOWPOLY_VERTEX_STRIDE,
      stepMode: 'vertex',
      attributes: LOWPOLY_VERTEX_LAYOUT.map((attr) => ({
        format: attr.format,
        offset: attr.offset,
        shaderLocation: attr.shaderLocation,
      })),
    });

    // Instance buffer (only for instanced pipelines)
    if (config.instanced) {
      vertexBuffers.push({
        arrayStride: INSTANCE_STRIDE,
        stepMode: 'instance',
        attributes: INSTANCE_VERTEX_LAYOUT.map((attr) => ({
          format: attr.format as GPUVertexFormat,
          offset: attr.offset,
          shaderLocation: attr.shaderLocation,
        })),
      });
    }

    return this._device.createRenderPipeline({
      label: config.instanced ? 'LowPolyPipeline_Instanced' : 'LowPolyPipeline',
      layout,
      vertex: {
        module: shaderModule,
        entryPoint: config.instanced ? 'vertexMainInstanced' : 'vertexMain',
        buffers: vertexBuffers,
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this._device.presentationFormat || 'bgra8unorm',
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: config.stripIndexFormat ? 'triangle-strip' : 'triangle-list',
        stripIndexFormat: config.stripIndexFormat,
        frontFace: 'ccw',
        cullMode: config.cullMode || 'back',
      },
      depthStencil: config.depthWriteEnabled !== false ? {
        depthWriteEnabled: config.depthWriteEnabled ?? true,
        depthCompare: config.compareFunction || 'less',
        format: 'depth24plus-stencil8',
      } : undefined,
      multisample: {
        count: 1,
        mask: 0xffffffff,
        alphaToCoverageEnabled: false,
      },
    });
  }

  /**
   * Clear pipeline cache (useful for hot-reloading shaders).
   */
  clearCache(): void {
    this._pipelineCache.clear();
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this._pipelineCache.clear();
    this._bindGroupLayouts.clear();
    this._shaderModule = null;
  }
}
