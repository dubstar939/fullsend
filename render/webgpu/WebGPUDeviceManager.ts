/**
 * WebGPU Device Manager
 * Handles adapter/device acquisition, canvas context, and swapchain configuration.
 */

import { RendererConfig, DEFAULT_RENDERER_CONFIG } from '../../types/renderer.types';

export interface WebGPUContext {
  device: GPUDevice;
  adapter: GPUAdapter;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  config: RendererConfig;
}

export class WebGPUDeviceManager {
  private _context: WebGPUContext | null = null;
  private _canvas: HTMLCanvasElement | null = null;
  private _errorCallback: ((error: string) => void) | null = null;

  /**
   * Initialize WebGPU with the given canvas.
   * Returns true if successful, false otherwise.
   */
  async initWebGPU(
    canvas: HTMLCanvasElement,
    config: Partial<RendererConfig> = {}
  ): Promise<boolean> {
    this._canvas = canvas;
    const fullConfig = { ...DEFAULT_RENDERER_CONFIG, ...config };

    // Check WebGPU support
    if (!navigator.gpu) {
      this._handleError('WebGPU is not supported in this browser');
      return false;
    }

    try {
      // Request adapter with appropriate power preference
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance',
      });

      if (!adapter) {
        this._handleError('Failed to get GPU adapter');
        return false;
      }

      // Request device with required features
      const device = await adapter.requestDevice({
        requiredFeatures: [],
        requiredLimits: {
          maxBufferSize: 256 * 1024 * 1024, // 256MB
          maxUniformBufferBindingSize: 65536,
        },
      });

      // Handle device loss
      device.lost.then((info) => {
        this._handleError(`Device lost: ${info.message}`);
      });

      // Get canvas context
      const context = canvas.getContext('webgpu') as GPUCanvasContext;
      if (!context) {
        this._handleError('Failed to get WebGPU canvas context');
        return false;
      }

      // Determine swap chain format
      const format = navigator.gpu.getPreferredCanvasFormat();

      // Configure context
      const alphaMode = fullConfig.clearAlpha < 1 ? 'premultiplied' : 'opaque';
      context.configure({
        device,
        format,
        alphaMode,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      this._context = {
        device,
        adapter,
        context,
        format,
        config: fullConfig,
      };

      // Handle resize
      this._setupResizeHandler();

      console.log('[WebGPU] Initialized successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this._handleError(`WebGPU initialization failed: ${message}`);
      return false;
    }
  }

  /**
   * Get the WebGPU context (throws if not initialized).
   */
  getContext(): WebGPUContext {
    if (!this._context) {
      throw new Error('WebGPU not initialized. Call initWebGPU first.');
    }
    return this._context;
  }

  /**
   * Get the GPU device (throws if not initialized).
   */
  getDevice(): GPUDevice {
    return this.getContext().device;
  }

  /**
   * Get the canvas format.
   */
  getFormat(): GPUTextureFormat {
    return this.getContext().format;
  }

  /**
   * Begin a new frame - returns command encoder and view.
   */
  beginFrame(): {
    device: GPUDevice;
    encoder: GPUCommandEncoder;
    view: GPUTextureView;
  } {
    const ctx = this.getContext();
    const texture = ctx.context.getCurrentTexture();
    const encoder = ctx.device.createCommandEncoder();
    
    return {
      device: ctx.device,
      encoder,
      view: texture.createView(),
    };
  }

  /**
   * End frame - submit commands.
   */
  endFrame(encoder: GPUCommandEncoder): void {
    const ctx = this.getContext();
    ctx.device.queue.submit([encoder.finish()]);
  }

  /**
   * Handle canvas resize.
   */
  handleResize(width: number, height: number): void {
    if (!this._canvas || !this._context) return;

    const dpr = this._context.config.pixelRatio;
    const displayWidth = Math.floor(width * dpr);
    const displayHeight = Math.floor(height * dpr);

    // Only resize if dimensions changed
    if (this._canvas.width !== displayWidth || this._canvas.height !== displayHeight) {
      this._canvas.width = displayWidth;
      this._canvas.height = displayHeight;

      // Reconfigure context with new size
      this._context.context.configure({
        device: this._context.device,
        format: this._context.format,
        alphaMode: this._context.config.clearAlpha < 1 ? 'premultiplied' : 'opaque',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });

      console.log(`[WebGPU] Resized to ${displayWidth}x${displayHeight}`);
    }
  }

  /**
   * Set error callback.
   */
  onError(callback: (error: string) => void): void {
    this._errorCallback = callback;
  }

  /**
   * Check if WebGPU is initialized.
   */
  isInitialized(): boolean {
    return this._context !== null;
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this._context = null;
    this._canvas = null;
  }

  private _handleError(message: string): void {
    console.error(`[WebGPU] ${message}`);
    if (this._errorCallback) {
      this._errorCallback(message);
    }
  }

  private _setupResizeHandler(): void {
    if (!this._canvas) return;

    // Use ResizeObserver for accurate resize detection
    const observer = new ResizeObserver(() => {
      if (this._canvas && this._context) {
        const rect = this._canvas.getBoundingClientRect();
        this.handleResize(rect.width, rect.height);
      }
    });

    observer.observe(this._canvas);
  }
}
