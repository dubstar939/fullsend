/**
 * WebGPU Device Manager
 * 
 * Responsibilities:
 * - Adapter/device acquisition
 * - Canvas context configuration
 * - Swapchain management
 * - Error handling and device loss recovery
 * 
 * This is the foundation layer that sets up WebGPU for rendering.
 */

export interface WebGPUDeviceConfig {
  powerPreference?: GPUPowerPreference;
  requiredFeatures?: GPUFeatureName[];
  requiredLimits?: GPUSupportedLimits;
}

export interface WebGPUCanvasConfig {
  format?: GPUTextureFormat;
  usage?: GPUTextureUsageFlags;
  alphaMode?: GPUCanvasAlphaMode;
}

export class WebGPUDeviceManager {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private canvasConfig: WebGPUCanvasConfig = {};
  
  // Current swapchain texture
  private currentTexture: GPUTexture | null = null;
  private currentView: GPUTextureView | null = null;
  
  // Device lost handling
  private onDeviceLost: ((reason: GPUDeviceLostInfo) => void) | null = null;
  
  /**
   * Initialize WebGPU adapter and device
   */
  async init(
    canvas: HTMLCanvasElement,
    config: WebGPUDeviceConfig = {}
  ): Promise<boolean> {
    // Check WebGPU support
    if (!navigator.gpu) {
      console.error('WebGPU not supported in this browser');
      return false;
    }
    
    // Request adapter
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: config.powerPreference || 'high-performance',
      compatibleSurface: canvas.getContext('webgpu')
    });
    
    if (!adapter) {
      console.error('Failed to get GPU adapter');
      return false;
    }
    
    this.adapter = adapter;
    
    // Log adapter info for debugging
    const adapterInfo = (adapter as any).info;
    if (adapterInfo) {
      console.log(`GPU Adapter: ${adapterInfo.description}`);
      console.log(`GPU Vendor: ${adapterInfo.vendor}`);
      console.log(`GPU Architecture: ${adapterInfo.architecture}`);
    }
    
    // Request device with features and limits
    const deviceDescriptor: GPUDeviceDescriptor = {
      label: 'LowPolyRenderer Device',
      requiredFeatures: config.requiredFeatures || [],
      requiredLimits: config.requiredLimits || {}
    };
    
    // Add commonly needed features for low-poly rendering
    const features: GPUFeatureName[] = [
      // Texture compression formats for memory efficiency
      'texture-compression-bc',
      'texture-compression-etc2',
      'texture-compression-astc'
    ];
    
    for (const feature of features) {
      if (adapter.features.has(feature)) {
        deviceDescriptor.requiredFeatures?.push(feature);
      }
    }
    
    const device = await adapter.requestDevice(deviceDescriptor);
    this.device = device;
    
    // Set up device lost callback
    device.lost.then((info) => {
      console.error('Device lost:', info.reason, info.message);
      if (this.onDeviceLost) {
        this.onDeviceLost(info);
      }
    });
    
    // Configure canvas context
    await this.configureCanvas(canvas, this.canvasConfig);
    
    return true;
  }
  
  /**
   * Configure the canvas context for rendering
   */
  async configureCanvas(
    canvas: HTMLCanvasElement,
    config: WebGPUCanvasConfig = {}
  ): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized. Call init() first.');
    }
    
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!context) {
      throw new Error('Failed to get WebGPU canvas context');
    }
    
    this.context = context;
    this.canvasConfig = config;
    
    // Determine preferred format
    const format = config.format || navigator.gpu.getPreferredCanvasFormat();
    
    // Configure the swapchain
    context.configure({
      device: this.device,
      format: format,
      usage: config.usage || (GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING),
      alphaMode: config.alphaMode || 'opaque',
      colorSpace: 'srgb'
    });
    
    console.log(`Canvas configured with format: ${format}`);
  }
  
  /**
   * Begin a new frame - acquire the next texture from swapchain
   */
  beginFrame(): { texture: GPUTexture; view: GPUTextureView } | null {
    if (!this.context || !this.device) {
      return null;
    }
    
    // Clean up previous frame
    this.endFrame();
    
    // Get current texture
    const texture = this.context.getCurrentTexture();
    const view = texture.createView();
    
    this.currentTexture = texture;
    this.currentView = view;
    
    return { texture, view };
  }
  
  /**
   * End frame - release resources (called automatically on next beginFrame)
   */
  endFrame(): void {
    // Views should be released after command encoder submission
    // In WebGPU, we don't manually destroy swapchain textures
    this.currentView = null;
    this.currentTexture = null;
  }
  
  /**
   * Handle window resize
   */
  resize(width: number, height: number): void {
    if (!this.context) return;
    
    // The canvas size is controlled by CSS/display size
    // WebGPU automatically handles the backing store
    console.log(`Resize: ${width}x${height}`);
  }
  
  /**
   * Create a command encoder for recording commands
   */
  createCommandEncoder(label?: string): GPUCommandEncoder {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createCommandEncoder({ label });
  }
  
  /**
   * Submit command buffer to queue
   */
  submitCommands(commands: GPUCommandBuffer[]): void {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    this.device.queue.submit(commands);
  }
  
  /**
   * Create a buffer
   */
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createBuffer(descriptor);
  }
  
  /**
   * Create a texture
   */
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createTexture(descriptor);
  }
  
  /**
   * Create a sampler
   */
  createSampler(descriptor: GPUSamplerDescriptor): GPUSampler {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createSampler(descriptor);
  }
  
  /**
   * Create a bind group layout
   */
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createBindGroupLayout(descriptor);
  }
  
  /**
   * Create a bind group
   */
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createBindGroup(descriptor);
  }
  
  /**
   * Create a pipeline layout
   */
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createPipelineLayout(descriptor);
  }
  
  /**
   * Create a render pipeline
   */
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
    if (!this.device) {
      throw new Error('Device not initialized');
    }
    return this.device.createRenderPipeline(descriptor);
  }
  
  /**
   * Query adapter limits
   */
  getLimits(): GPUSupportedLimits {
    if (!this.adapter) {
      throw new Error('Adapter not initialized');
    }
    return this.adapter.limits;
  }
  
  /**
   * Check if a feature is supported
   */
  hasFeature(feature: GPUFeatureName): boolean {
    if (!this.device) return false;
    return this.device.features.has(feature);
  }
  
  /**
   * Get the configured canvas format
   */
  getCanvasFormat(): GPUTextureFormat {
    return this.canvasConfig.format || navigator.gpu.getPreferredCanvasFormat();
  }
  
  // ============================================================================
  // Getters
  // ============================================================================
  
  getDevice(): GPUDevice | null {
    return this.device;
  }
  
  getAdapter(): GPUAdapter | null {
    return this.adapter;
  }
  
  getContext(): GPUCanvasContext | null {
    return this.context;
  }
  
  getCurrentView(): GPUTextureView | null {
    return this.currentView;
  }
  
  setOnDeviceLost(callback: (reason: GPUDeviceLostInfo) => void): void {
    this.onDeviceLost = callback;
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.currentView = null;
    this.currentTexture = null;
    
    // Note: We don't destroy the device here as it may be shared
    // In a full implementation, track all created resources and destroy them
    this.device = null;
    this.adapter = null;
    this.context = null;
  }
}
