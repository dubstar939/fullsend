/**
 * WebGPU Pipeline Manager
 * 
 * Responsibilities:
 * - Create and cache render pipelines
 * - Manage bind group layouts
 * - Handle pipeline variants based on material properties
 * 
 * Pipelines are expensive to create, so we cache them by a key
 * derived from shader + material configuration.
 */

import { LowPolyEntryPoints } from './shaders/shaderModules';

export interface PipelineConfig {
  name: string;
  vertexEntryPoint: string;
  fragmentEntryPoint: string;
  topology?: GPUPrimitiveTopology;
  stripIndexFormat?: GPUIndexFormat;
  cullMode?: GPUCullMode;
  depthStencil?: GPUDepthStencilState | null;
  useVertexColors?: boolean;
}

export interface PipelineKey {
  shaderName: string;
  topology: string;
  cullMode: string;
  hasDepth: boolean;
  useVertexColors: boolean;
  primitiveState: string;
}

export class WebGPUPipelineManager {
  private device: GPUDevice;
  
  // Cached pipelines
  private pipelines: Map<string, GPURenderPipeline> = new Map();
  
  // Cached bind group layouts
  private bindGroupLayouts: Map<string, GPUBindGroupLayout> = new Map();
  
  // Cached pipeline layouts
  private pipelineLayouts: Map<string, GPUPipelineLayout> = new Map();
  
  constructor(device: GPUDevice) {
    this.device = device;
  }
  
  /**
   * Get or create the default low-poly pipeline
   */
  getLowPolyPipeline(
    shaderModule: GPUShaderModule,
    config: Partial<PipelineConfig> = {}
  ): GPURenderPipeline {
    const fullConfig: PipelineConfig = {
      name: 'lowpoly',
      vertexEntryPoint: LowPolyEntryPoints.standard.vertex,
      fragmentEntryPoint: LowPolyEntryPoints.standard.fragment,
      topology: 'triangle-list',
      cullMode: 'back',
      depthStencil: this.getDefaultDepthStencil(),
      useVertexColors: false,
      ...config
    };
    
    const key = this.makePipelineKey(fullConfig);
    
    if (this.pipelines.has(key)) {
      return this.pipelines.get(key)!;
    }
    
    const pipeline = this.createPipeline(shaderModule, fullConfig);
    this.pipelines.set(key, pipeline);
    
    return pipeline;
  }
  
  /**
   * Get or create flat color pipeline (for UI/debug)
   */
  getFlatColorPipeline(
    shaderModule: GPUShaderModule
  ): GPURenderPipeline {
    const config: PipelineConfig = {
      name: 'flatcolor',
      vertexEntryPoint: LowPolyEntryPoints.flatColor.vertex,
      fragmentEntryPoint: LowPolyEntryPoints.flatColor.fragment,
      topology: 'triangle-list',
      cullMode: 'back',
      depthStencil: this.getDefaultDepthStencil(),
      useVertexColors: true
    };
    
    const key = this.makePipelineKey(config);
    
    if (this.pipelines.has(key)) {
      return this.pipelines.get(key)!;
    }
    
    const pipeline = this.createPipeline(shaderModule, config);
    this.pipelines.set(key, pipeline);
    
    return pipeline;
  }
  
  /**
   * Create a render pipeline from configuration
   */
  private createPipeline(
    shaderModule: GPUShaderModule,
    config: PipelineConfig
  ): GPURenderPipeline {
    // Get or create bind group layouts
    const globalLayout = this.getGlobalBindGroupLayout();
    const objectLayout = this.getObjectBindGroupLayout();
    
    const pipelineLayout = this.device.createPipelineLayout({
      label: `${config.name}PipelineLayout`,
      bindGroupLayouts: [globalLayout, objectLayout]
    });
    
    // Vertex buffer layout for low-poly meshes
    // Layout: position(vec4), normal(vec4), uv(vec2), color(vec4)
    const vertexBufferLayout: GPUVertexBufferLayout = {
      arrayStride: 10 * 4, // 4 floats position + 4 floats normal + 2 floats uv + 4 floats color = 14 floats, but we'll use 10 for standard
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float32x4' // position
        },
        {
          shaderLocation: 1,
          offset: 4 * 4,
          format: 'float32x4' // normal
        },
        {
          shaderLocation: 2,
          offset: 8 * 4,
          format: 'float32x2' // uv
        },
        {
          shaderLocation: 3,
          offset: 10 * 4,
          format: 'float32x4' // color
        }
      ]
    };
    
    const pipeline = this.device.createRenderPipeline({
      label: `${config.name}Pipeline`,
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: config.vertexEntryPoint,
        buffers: [vertexBufferLayout]
      },
      fragment: {
        module: shaderModule,
        entryPoint: config.fragmentEntryPoint,
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              }
            },
            writeMask: GPUColorWrite.ALL
          }
        ]
      },
      primitive: {
        topology: config.topology || 'triangle-list',
        stripIndexFormat: config.stripIndexFormat,
        frontFace: 'ccw',
        cullMode: config.cullMode || 'back'
      },
      depthStencil: config.depthStencil || undefined
    });
    
    return pipeline;
  }
  
  /**
   * Get or create the global bind group layout (frame uniforms)
   * Bind Group 0: Camera matrices, lighting, time
   */
  getGlobalBindGroupLayout(): GPUBindGroupLayout {
    const key = 'global';
    
    if (this.bindGroupLayouts.has(key)) {
      return this.bindGroupLayouts.get(key)!;
    }
    
    const layout = this.device.createBindGroupLayout({
      label: 'GlobalBindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        }
      ]
    });
    
    this.bindGroupLayouts.set(key, layout);
    return layout;
  }
  
  /**
   * Get or create the object bind group layout (per-object uniforms + texture)
   * Bind Group 1: Model matrix, material properties, texture
   */
  getObjectBindGroupLayout(): GPUBindGroupLayout {
    const key = 'object';
    
    if (this.bindGroupLayouts.has(key)) {
      return this.bindGroupLayouts.get(key)!;
    }
    
    const layout = this.device.createBindGroupLayout({
      label: 'ObjectBindGroupLayout',
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: 'filtering'
          }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: 'float',
            viewDimension: '2d',
            multisampled: false
          }
        }
      ]
    });
    
    this.bindGroupLayouts.set(key, layout);
    return layout;
  }
  
  /**
   * Get default depth stencil state
   */
  private getDefaultDepthStencil(): GPUDepthStencilState {
    return {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less-equal',
      stencilFront: {
        compare: 'always',
        failOp: 'keep',
        depthFailOp: 'keep',
        passOp: 'keep'
      },
      stencilBack: {
        compare: 'always',
        failOp: 'keep',
        depthFailOp: 'keep',
        passOp: 'keep'
      },
      stencilReadMask: 0,
      stencilWriteMask: 0
    };
  }
  
  /**
   * Generate a unique key for pipeline caching
   */
  private makePipelineKey(config: PipelineConfig): string {
    return JSON.stringify({
      shader: config.name,
      vertex: config.vertexEntryPoint,
      fragment: config.fragmentEntryPoint,
      topology: config.topology,
      cullMode: config.cullMode,
      hasDepth: !!config.depthStencil,
      vertexColors: config.useVertexColors
    });
  }
  
  /**
   * Clear cached pipelines (useful for hot-reloading shaders)
   */
  clearCache(): void {
    this.pipelines.clear();
    // Don't clear layouts as they're reusable
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.pipelines.clear();
    this.bindGroupLayouts.clear();
    this.pipelineLayouts.clear();
  }
}
