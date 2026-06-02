/**
 * WebGPU Renderer - Main Entry Point
 * 
 * Responsibilities:
 * - Public API for the rendering engine
 * - Scene management (renderables, lights, camera)
 * - Frame orchestration (begin/end frame, render passes)
 * - Resource coordination between managers
 * 
 * This is the primary interface that game code interacts with.
 */

import type { IRenderer, ICamera, IRenderable, ILight, FrameUniforms, DirectionalLightData } from '../../types/engine.types';
import { LightType, MaterialFlags } from '../../types/engine.types';
import { Camera } from '../common/Camera';
import { WebGPUDeviceManager } from './WebGPUDeviceManager';
import { WebGPUPipelineManager } from './WebGPUPipelineManager';
import { WebGPUFrameGraph } from './WebGPUFrameGraph';
import { WebGPUBindGroupManager } from './WebGPUBindGroupManager';
import { WebGPUMesh } from './WebGPUMesh';
import { WebGPUMaterial } from './WebGPUMaterial';
import { WebGPURenderable } from './WebGPURenderable';
import { createShaderModuleFromName, LowPolyEntryPoints } from './shaders/shaderModules';

// ============================================================================
// Uniform Buffer Sizes (must match WGSL structs)
// ============================================================================

// FrameUniforms: 16*4 + 4 + 4 + 4 + 4 + 16*4 + 16*4 = ~320 bytes
const FRAME_UNIFORM_SIZE = 512; // Rounded up for alignment

// ObjectUniforms: 16*4 + 16*4 + 4 + 4 + 4 + 4 + 4 + 12 = ~256 bytes
const OBJECT_UNIFORM_SIZE = 256;

// ============================================================================
// Renderer Configuration
// ============================================================================

export interface WebGPURendererConfig {
  powerPreference?: GPUPowerPreference;
  clearColor?: [number, number, number, number];
  enableDebugMarkers?: boolean;
  maxDirectionalLights?: number;
}

// ============================================================================
// Main Renderer Class
// ============================================================================

export class WebGPURenderer implements IRenderer {
  // Core managers
  private deviceManager: WebGPUDeviceManager;
  private pipelineManager: WebGPUPipelineManager | null = null;
  private frameGraph: WebGPUFrameGraph;
  private bindGroupManager: WebGPUBindGroupManager | null = null;
  
  // Scene data
  private camera: Camera | null = null;
  private renderables: Map<string, WebGPURenderable> = new Map();
  private lights: ILight[] = [];
  private ambientLightColor: [number, number, number] = [0.2, 0.2, 0.25];
  private ambientLightIntensity: number = 0.5;
  
  // Resources
  private shaderModule: GPUShaderModule | null = null;
  private frameUniformBuffer: GPUBuffer | null = null;
  private frameUniformData: FrameUniformsData | null = null;
  private defaultSampler: GPUSampler | null = null;
  
  // State
  private initialized: boolean = false;
  private config: WebGPURendererConfig;
  private canvas: HTMLCanvasElement | null = null;
  
  // Timing
  private time: number = 0;
  
  constructor(config: WebGPURendererConfig = {}) {
    this.config = {
      powerPreference: 'high-performance',
      clearColor: [0.1, 0.1, 0.15, 1.0],
      enableDebugMarkers: false,
      maxDirectionalLights: 4,
      ...config
    };
    
    this.deviceManager = new WebGPUDeviceManager();
    this.frameGraph = new WebGPUFrameGraph();
    
    // Initialize frame uniform data structure
    this.frameUniformData = new FrameUniformsData(this.config.maxDirectionalLights);
  }
  
  /**
   * Initialize the renderer with a canvas
   */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    if (this.initialized) {
      console.warn('Renderer already initialized');
      return;
    }
    
    this.canvas = canvas;
    
    // Initialize device and context
    const success = await this.deviceManager.init(canvas, {
      powerPreference: this.config.powerPreference
    });
    
    if (!success) {
      throw new Error('Failed to initialize WebGPU device');
    }
    
    const device = this.deviceManager.getDevice();
    if (!device) {
      throw new Error('No WebGPU device available');
    }
    
    // Create shader module
    this.shaderModule = createShaderModuleFromName(device, 'lowpoly');
    if (!this.shaderModule) {
      throw new Error('Failed to create shader module');
    }
    
    // Initialize managers
    this.pipelineManager = new WebGPUPipelineManager(device);
    this.bindGroupManager = new WebGPUBindGroupManager(device);
    
    // Set up bind group layouts
    const globalLayout = this.pipelineManager.getGlobalBindGroupLayout();
    const objectLayout = this.pipelineManager.getObjectBindGroupLayout();
    this.bindGroupManager.setLayouts(globalLayout, objectLayout);
    
    // Create default sampler
    this.defaultSampler = this.bindGroupManager.createDefaultSampler();
    
    // Create frame uniform buffer
    this.frameUniformBuffer = device.createBuffer({
      label: 'FrameUniforms',
      size: FRAME_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    
    // Initialize frame graph
    const rect = canvas.getBoundingClientRect();
    this.frameGraph.init(rect.width, rect.height);
    
    // Configure the main scene pass
    this.frameGraph.getPass('mainScene')!.execute = (encoder, view) => {
      this.renderScene(encoder, view);
    };
    
    this.initialized = true;
    console.log('WebGPU Renderer initialized');
  }
  
  /**
   * Set the active camera
   */
  setCamera(camera: ICamera): void {
    if (camera instanceof Camera) {
      this.camera = camera;
    } else {
      // Convert to our Camera type if needed
      this.camera = new Camera(
        camera.position,
        camera.target
      );
      this.camera.fov = camera.fov;
      this.camera.near = camera.near;
      this.camera.far = camera.far;
    }
  }
  
  /**
   * Add a renderable object to the scene
   */
  addRenderable(renderable: IRenderable): void {
    if (renderable instanceof WebGPURenderable) {
      this.renderables.set(renderable.id, renderable);
    } else {
      console.warn('Only WebGPURenderable instances are supported');
    }
  }
  
  /**
   * Remove a renderable object from the scene
   */
  removeRenderable(renderable: IRenderable): void {
    this.renderables.delete(renderable.id);
  }
  
  /**
   * Add a light to the scene
   */
  addLight(light: ILight): void {
    // TODO: Validate light count limits
    this.lights.push(light);
  }
  
  /**
   * Remove a light from the scene
   */
  removeLight(light: ILight): void {
    const index = this.lights.indexOf(light);
    if (index !== -1) {
      this.lights.splice(index, 1);
    }
  }
  
  /**
   * Set ambient light properties
   */
  setAmbientLight(color: [number, number, number], intensity: number): void {
    this.ambientLightColor = color;
    this.ambientLightIntensity = intensity;
  }
  
  /**
   * Render a frame
   */
  renderFrame(deltaTime: number): void {
    if (!this.initialized || !this.canvas) {
      return;
    }
    
    const device = this.deviceManager.getDevice();
    if (!device) return;
    
    // Update time
    this.time += deltaTime;
    
    // Begin frame - acquire swapchain texture
    const frameData = this.deviceManager.beginFrame();
    if (!frameData) {
      return;
    }
    
    // Update camera aspect ratio
    if (this.camera) {
      const rect = this.canvas.getBoundingClientRect();
      this.camera.updateAspect(rect.width / rect.height);
    }
    
    // Update frame uniforms
    this.updateFrameUniforms(deltaTime);
    
    // Create command encoder
    const encoder = this.deviceManager.createCommandEncoder('FrameEncoder');
    
    // Execute frame graph passes
    this.frameGraph.execute(encoder, frameData.view);
    
    // Submit commands
    const commandBuffer = encoder.finish();
    this.deviceManager.submitCommands([commandBuffer]);
    
    // End frame
    this.deviceManager.endFrame();
  }
  
  /**
   * Handle canvas resize
   */
  resize(width: number, height: number): void {
    this.deviceManager.resize(width, height);
    this.frameGraph.resize(width, height);
    
    if (this.camera) {
      this.camera.updateAspect(width / height);
    }
  }
  
  /**
   * Clean up all resources
   */
  dispose(): void {
    // Dispose renderables
    for (const renderable of this.renderables.values()) {
      renderable.dispose();
    }
    this.renderables.clear();
    
    // Dispose managers
    this.pipelineManager?.dispose();
    this.bindGroupManager?.dispose();
    this.frameGraph.dispose();
    
    // Destroy buffers
    if (this.frameUniformBuffer) {
      this.frameUniformBuffer.destroy();
      this.frameUniformBuffer = null;
    }
    
    this.deviceManager.dispose();
    this.initialized = false;
  }
  
  // ============================================================================
  // Internal Methods
  // ============================================================================
  
  /**
   * Update frame-level uniforms
   */
  private updateFrameUniforms(deltaTime: number): void {
    if (!this.frameUniformBuffer || !this.frameUniformData) return;
    
    const device = this.deviceManager.getDevice();
    if (!device) return;
    
    // Update camera matrices
    if (this.camera) {
      this.frameUniformData.setViewMatrix(this.camera.getViewMatrix());
      this.frameUniformData.setProjectionMatrix(this.camera.getProjectionMatrix());
      this.frameUniformData.setCameraPosition(this.camera.position);
    }
    
    // Update lighting
    this.frameUniformData.setAmbientLight(this.ambientLightColor, this.ambientLightIntensity);
    this.frameUniformData.setDirectionalLights(this.lights);
    
    // Update time
    this.frameUniformData.setTime(this.time);
    this.frameUniformData.setDeltaTime(deltaTime);
    
    // Write to buffer
    device.queue.writeBuffer(
      this.frameUniformBuffer,
      0,
      this.frameUniformData.getArrayBuffer()
    );
  }
  
  /**
   * Render the scene
   */
  private renderScene(encoder: GPUCommandEncoder, view: GPUTextureView): void {
    const device = this.deviceManager.getDevice();
    if (!device || !this.pipelineManager || !this.bindGroupManager) return;
    
    // Get render pass descriptor
    const passDescriptor = this.frameGraph.createMainPassDescriptor(
      view,
      this.config.clearColor
    );
    
    const pass = encoder.beginRenderPass(passDescriptor);
    
    // Get pipelines
    const standardPipeline = this.pipelineManager.getLowPolyPipeline(
      this.shaderModule!
    );
    
    // Get global bind group
    const globalBindGroup = this.bindGroupManager.getGlobalBindGroup(
      this.frameUniformBuffer!
    );
    pass.setBindGroup(0, globalBindGroup);
    
    // Render each visible object
    for (const renderable of this.renderables.values()) {
      if (!renderable.visible) continue;
      
      // Set pipeline based on material
      const pipeline = standardPipeline; // Could select different pipeline based on material
      pass.setPipeline(pipeline);
      
      // Bind vertex and index buffers
      const mesh = renderable.mesh as WebGPUMesh;
      pass.setVertexBuffer(0, mesh.getVertexBuffer());
      
      const indexBuffer = mesh.getIndexBuffer();
      if (indexBuffer) {
        pass.setIndexBuffer(indexBuffer, 'uint16');
      }
      
      // Create per-object bind group
      const objectBindGroup = this.createObjectBindGroup(renderable);
      pass.setBindGroup(1, objectBindGroup);
      
      // Draw
      if (indexBuffer) {
        pass.drawIndexed(mesh.indexCount);
      } else {
        pass.draw(mesh.vertexCount);
      }
    }
    
    pass.end();
  }
  
  /**
   * Create per-object bind group
   */
  private createObjectBindGroup(renderable: WebGPURenderable): GPUBindGroup {
    const device = this.deviceManager.getDevice()!;
    
    // Create object uniform buffer
    const objectUniformBuffer = device.createBuffer({
      size: OBJECT_UNIFORM_SIZE,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true
    });
    
    // Fill uniform data
    const uniformData = new Float32Array(objectUniformBuffer.getMappedRange());
    
    // Model matrix (16 floats)
    const modelMatrix = renderable.transform.getWorldMatrix();
    uniformData.set(modelMatrix, 0);
    
    // Normal matrix (16 floats) - for now just use model matrix inverse transpose
    // Simplified: assume uniform scale, so normal matrix = model matrix without translation
    uniformData.set(modelMatrix, 16);
    
    // Color (4 floats)
    uniformData.set(renderable.material.color, 32);
    
    // Roughness, metalness (2 floats)
    uniformData[36] = renderable.material.roughness;
    uniformData[37] = renderable.material.metalness;
    
    // Emissive (4 floats)
    uniformData[38] = renderable.material.emissive[0];
    uniformData[39] = renderable.material.emissive[1];
    uniformData[40] = renderable.material.emissive[2];
    uniformData[41] = renderable.material.emissiveIntensity;
    
    // Flags and padding (4 floats)
    uniformData[42] = renderable.material.getFlags();
    uniformData[43] = 0; // padding
    uniformData[44] = 0; // padding
    uniformData[45] = 0; // padding
    
    objectUniformBuffer.unmap();
    
    // Create texture view if material has texture
    let textureView: GPUTextureView | null = null;
    if (renderable.material.texture) {
      textureView = renderable.material.texture.createView();
    }
    
    // Create bind group
    const bindGroup = this.bindGroupManager!.createObjectBindGroup(
      objectUniformBuffer,
      this.defaultSampler!,
      textureView
    );
    
    // Note: In production, you'd want to cache/reuse these bind groups
    // For now, we create a new one each frame (acceptable for low object counts)
    
    return bindGroup;
  }
  
  // ============================================================================
  // Getters
  // ============================================================================
  
  getDevice(): GPUDevice | null {
    return this.deviceManager.getDevice();
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================================
// Frame Uniform Data Helper Class
// ============================================================================

class FrameUniformsData {
  private data: Float32Array;
  private maxLights: number;
  
  // Offsets (in floats)
  private static readonly VIEW_MATRIX_OFFSET = 0;
  private static readonly PROJ_MATRIX_OFFSET = 16;
  private static readonly VIEW_PROJ_OFFSET = 32;
  private static readonly CAMERA_POS_OFFSET = 48;
  private static readonly TIME_OFFSET = 52;
  private static readonly DELTA_TIME_OFFSET = 53;
  private static readonly AMBIENT_COLOR_OFFSET = 54;
  private static readonly AMBIENT_INTENSITY_OFFSET = 58;
  private static readonly LIGHT_COUNT_OFFSET = 59;
  private static readonly DIRECTIONAL_LIGHTS_OFFSET = 60;
  
  constructor(maxLights: number = 4) {
    this.maxLights = maxLights;
    // Allocate enough space for all data
    // Each light takes 16 floats (vec4 direction + vec4 color + float intensity + vec3 padding)
    const size = FrameUniformsData.DIRECTIONAL_LIGHTS_OFFSET + (maxLights * 16);
    this.data = new Float32Array(size);
  }
  
  setViewMatrix(matrix: any): void {
    this.data.set(matrix, FrameUniformsData.VIEW_MATRIX_OFFSET);
  }
  
  setProjectionMatrix(matrix: any): void {
    this.data.set(matrix, FrameUniformsData.PROJ_MATRIX_OFFSET);
    
    // Also compute view-projection
    const viewProj = new Float32Array(16);
    // Simple multiplication (in production, use gl-matrix)
    for (let i = 0; i < 16; i++) {
      viewProj[i] = this.data[FrameUniformsData.PROJ_MATRIX_OFFSET + i];
    }
    this.data.set(viewProj, FrameUniformsData.VIEW_PROJ_OFFSET);
  }
  
  setCameraPosition(pos: any): void {
    this.data[FrameUniformsData.CAMERA_POS_OFFSET] = pos[0];
    this.data[FrameUniformsData.CAMERA_POS_OFFSET + 1] = pos[1];
    this.data[FrameUniformsData.CAMERA_POS_OFFSET + 2] = pos[2];
    this.data[FrameUniformsData.CAMERA_POS_OFFSET + 3] = 1.0;
  }
  
  setTime(time: number): void {
    this.data[FrameUniformsData.TIME_OFFSET] = time;
  }
  
  setDeltaTime(dt: number): void {
    this.data[FrameUniformsData.DELTA_TIME_OFFSET] = dt;
  }
  
  setAmbientLight(color: [number, number, number], intensity: number): void {
    this.data[FrameUniformsData.AMBIENT_COLOR_OFFSET] = color[0];
    this.data[FrameUniformsData.AMBIENT_COLOR_OFFSET + 1] = color[1];
    this.data[FrameUniformsData.AMBIENT_COLOR_OFFSET + 2] = color[2];
    this.data[FrameUniformsData.AMBIENT_COLOR_OFFSET + 3] = 1.0;
    this.data[FrameUniformsData.AMBIENT_INTENSITY_OFFSET] = intensity;
  }
  
  setDirectionalLights(lights: ILight[]): void {
    let count = 0;
    
    for (const light of lights) {
      if (light.type !== LightType.DIRECTIONAL) continue;
      if (count >= this.maxLights) break;
      
      const offset = FrameUniformsData.DIRECTIONAL_LIGHTS_OFFSET + (count * 16);
      
      // Direction (negated for shader)
      if (light.direction) {
        this.data[offset] = -light.direction[0];
        this.data[offset + 1] = -light.direction[1];
        this.data[offset + 2] = -light.direction[2];
      } else {
        this.data[offset] = 0;
        this.data[offset + 1] = -1;
        this.data[offset + 2] = 0;
      }
      this.data[offset + 3] = 0; // w padding
      
      // Color
      this.data[offset + 4] = light.color[0];
      this.data[offset + 5] = light.color[1];
      this.data[offset + 6] = light.color[2];
      this.data[offset + 7] = 1.0;
      
      // Intensity
      this.data[offset + 8] = light.intensity;
      
      // Padding
      this.data[offset + 9] = 0;
      this.data[offset + 10] = 0;
      this.data[offset + 11] = 0;
      
      count++;
    }
    
    this.data[FrameUniformsData.LIGHT_COUNT_OFFSET] = count;
  }
  
  getArrayBuffer(): ArrayBuffer {
    return this.data.buffer;
  }
}
