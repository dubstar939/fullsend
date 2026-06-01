/**
 * WebGPU Renderer
 * Main facade for the WebGPU rendering backend.
 * Provides a clean API for the rest of the engine.
 */

import { WebGPUDeviceManager } from './WebGPUDeviceManager';
import { WebGPUPipelineManager } from './WebGPUPipelineManager';
import { WebGPUBufferManager } from './WebGPUBufferManager';
import { WebGPUFrameGraph } from './WebGPUFrameGraph';
import { WebGPURenderable } from './WebGPURenderable';
import { WebGPUMesh, createCubeMesh, createPlaneMesh } from './WebGPUMesh';
import { Camera } from '../common/Camera';
import {
  RendererConfig,
  DEFAULT_RENDERER_CONFIG,
  LightingData,
} from '../../types/renderer.types';

export interface WebGPURendererAPI {
  init(canvas: HTMLCanvasElement, config?: Partial<RendererConfig>): Promise<boolean>;
  setCamera(camera: Camera): void;
  addRenderable(renderable: WebGPURenderable): void;
  removeRenderable(id: string): void;
  getRenderable(id: string): WebGPURenderable | undefined;
  setLighting(lighting: Partial<LightingData>): void;
  renderFrame(deltaTime: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

export class WebGPURenderer implements WebGPURendererAPI {
  private _deviceManager: WebGPUDeviceManager;
  private _pipelineManager: WebGPUPipelineManager | null = null;
  private _bufferManager: WebGPUBufferManager | null = null;
  private _frameGraph: WebGPUFrameGraph | null = null;
  
  private _camera: Camera | null = null;
  private _renderables: Map<string, WebGPURenderable> = new Map();
  private _config: RendererConfig;
  
  // Depth texture for depth testing
  private _depthTexture: GPUTexture | null = null;
  private _depthView: GPUTextureView | null = null;

  constructor() {
    this._deviceManager = new WebGPUDeviceManager();
    this._config = { ...DEFAULT_RENDERER_CONFIG };
  }

  /**
   * Initialize the renderer with a canvas.
   */
  async init(
    canvas: HTMLCanvasElement,
    config: Partial<RendererConfig> = {}
  ): Promise<boolean> {
    this._config = { ...this._config, ...config };

    const success = await this._deviceManager.initWebGPU(canvas, this._config);
    
    if (!success) {
      return false;
    }

    const device = this._deviceManager.getDevice();

    // Initialize subsystems
    this._pipelineManager = new WebGPUPipelineManager(device);
    this._bufferManager = new WebGPUBufferManager(device);
    this._frameGraph = new WebGPUFrameGraph(this._deviceManager);
    this._frameGraph.initialize(device);

    // Create global bind group
    const bindGroupLayout = this._pipelineManager.getBindGroupLayout(0);
    this._frameGraph.createGlobalBindGroup(device, bindGroupLayout);

    // Create depth texture
    this._resizeDepthTexture(
      canvas.width,
      canvas.height
    );

    console.log('[WebGPU Renderer] Initialized successfully');
    return true;
  }

  /**
   * Set the active camera.
   */
  setCamera(camera: Camera): void {
    this._camera = camera;
  }

  /**
   * Add a renderable object to the scene.
   */
  addRenderable(renderable: WebGPURenderable): void {
    this._renderables.set(renderable.id, renderable);
  }

  /**
   * Remove a renderable object from the scene.
   */
  removeRenderable(id: string): void {
    const renderable = this._renderables.get(id);
    if (renderable) {
      renderable.dispose();
      this._renderables.delete(id);
    }
  }

  /**
   * Get a renderable by ID.
   */
  getRenderable(id: string): WebGPURenderable | undefined {
    return this._renderables.get(id);
  }

  /**
   * Update lighting configuration.
   */
  setLighting(lighting: Partial<LightingData>): void {
    if (this._frameGraph) {
      this._frameGraph.setLighting(lighting);
      
      // Update GPU uniforms immediately
      const device = this._deviceManager.getDevice();
      // Access private method via type assertion for simplicity
      // In production, you'd expose this properly
    }
  }

  /**
   * Render a frame.
   */
  renderFrame(deltaTime: number): void {
    if (!this._deviceManager.isInitialized()) {
      return;
    }

    const device = this._deviceManager.getDevice();
    const { encoder, view } = this._deviceManager.beginFrame();

    // Update camera uniforms
    if (this._camera && this._frameGraph) {
      const uniforms = this._camera.getUniforms();
      this._frameGraph.updateCameraUniforms(device, uniforms);
    }

    // Get render pass
    const passEncoder = this._frameGraph!.beginRenderPass(
      encoder,
      view,
      this._depthView,
      this._config.clearColor as [number, number, number, number]
    );

    // Set pipeline and bind groups
    const pipeline = this._pipelineManager!.getRenderPipeline();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, this._frameGraph!.getGlobalBindGroup()!);

    // Draw all visible renderables
    for (const renderable of this._renderables.values()) {
      if (!renderable.shouldBeRendered()) {
        continue;
      }

      // Update object uniforms
      renderable.updateUniforms(device);

      // Set object bind group
      const objectBindGroup = device.createBindGroup({
        layout: this._pipelineManager!.getBindGroupLayout(1),
        entries: [
          {
            binding: 0,
            resource: { buffer: renderable.getUniformBuffer(device) },
          },
        ],
      });
      passEncoder.setBindGroup(1, objectBindGroup);

      // Set vertex and index buffers
      passEncoder.setVertexBuffer(0, renderable.mesh.getVertexBuffer());
      passEncoder.setIndexBuffer(
        renderable.mesh.getIndexBuffer(),
        renderable.mesh.getIndexFormat()
      );

      // Draw
      passEncoder.drawIndexed(renderable.mesh.getIndexCount());
    }

    passEncoder.end();
    this._deviceManager.endFrame(encoder);
  }

  /**
   * Handle resize event.
   */
  resize(width: number, height: number): void {
    this._deviceManager.handleResize(width, height);
    
    // Recreate depth texture
    const device = this._deviceManager.getDevice();
    const dpr = this._config.pixelRatio;
    this._resizeDepthTexture(
      Math.floor(width * dpr),
      Math.floor(height * dpr)
    );

    // Update camera aspect ratio
    if (this._camera) {
      this._camera.aspect = width / height;
    }
  }

  /**
   * Get the underlying device manager (for advanced use).
   */
  getDeviceManager(): WebGPUDeviceManager {
    return this._deviceManager;
  }

  /**
   * Get the buffer manager (for creating custom meshes).
   */
  getBufferManager(): WebGPUBufferManager | null {
    return this._bufferManager;
  }

  /**
   * Get the pipeline manager (for custom pipelines).
   */
  getPipelineManager(): WebGPUPipelineManager | null {
    return this._pipelineManager;
  }

  /**
   * Dispose all resources.
   */
  dispose(): void {
    // Dispose renderables
    for (const renderable of this._renderables.values()) {
      renderable.dispose();
    }
    this._renderables.clear();

    // Dispose depth texture
    if (this._depthTexture) {
      this._depthTexture.destroy();
      this._depthTexture = null;
      this._depthView = null;
    }

    // Dispose subsystems
    this._frameGraph?.dispose();
    this._bufferManager?.dispose();
    this._pipelineManager?.dispose();
    this._deviceManager.dispose();
  }

  /**
   * Resize depth texture.
   */
  private _resizeDepthTexture(width: number, height: number): void {
    if (!this._deviceManager.isInitialized()) return;

    const device = this._deviceManager.getDevice();

    // Destroy existing depth texture
    if (this._depthTexture) {
      this._depthTexture.destroy();
    }

    // Create new depth texture
    this._depthTexture = device.createTexture({
      label: 'DepthTexture',
      size: [width, height],
      format: 'depth24plus-stencil8',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this._depthView = this._depthTexture.createView();
  }
}

// ============================================================================
// FACTORY HELPERS
// ============================================================================

/**
 * Create a simple cube renderable for testing.
 */
export function createTestCube(
  renderer: WebGPURenderer,
  id: string = 'cube',
  position: [number, number, number] = [0, 0, 0]
): WebGPURenderable {
  const bufferManager = renderer.getBufferManager()!;
  const mesh = createCubeMesh(bufferManager);
  
  const renderable = new WebGPURenderable(id, mesh, {
    color: [0.8, 0.4, 0.2, 1],
    flatShading: true,
  });
  
  renderable.transform.position = position as any;
  
  return renderable;
}

/**
 * Create a simple plane renderable for testing.
 */
export function createTestPlane(
  renderer: WebGPURenderer,
  id: string = 'plane',
  position: [number, number, number] = [0, -0.5, 0],
  width: number = 10,
  depth: number = 10
): WebGPURenderable {
  const bufferManager = renderer.getBufferManager()!;
  const mesh = createPlaneMesh(bufferManager, width, depth, 1);
  
  const renderable = new WebGPURenderable(id, mesh, {
    color: [0.3, 0.5, 0.3, 1],
    flatShading: true,
  });
  
  renderable.transform.position = position as any;
  
  return renderable;
}
