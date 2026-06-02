/**
 * WebGPU Bind Group Manager
 * 
 * Responsibilities:
 * - Efficient bind group creation and reuse
 * - Manage uniform buffer bindings
 * - Handle texture and sampler bindings
 * 
 * Bind groups are expensive to create, so we cache them where possible.
 */

export interface BindGroupEntry {
  binding: number;
  resource: GPUBindingResource;
}

export class WebGPUBindGroupManager {
  private device: GPUDevice;
  
  // Cached bind groups
  private bindGroups: Map<string, GPUBindGroup> = new Map();
  
  // Layouts provided by pipeline manager
  private globalLayout: GPUBindGroupLayout | null = null;
  private objectLayout: GPUBindGroupLayout | null = null;
  
  constructor(device: GPUDevice) {
    this.device = device;
  }
  
  /**
   * Set the bind group layouts (called by renderer during init)
   */
  setLayouts(globalLayout: GPUBindGroupLayout, objectLayout: GPUBindGroupLayout): void {
    this.globalLayout = globalLayout;
    this.objectLayout = objectLayout;
  }
  
  /**
   * Create or get the global bind group (frame uniforms)
   */
  getGlobalBindGroup(frameUniformBuffer: GPUBuffer): GPUBindGroup {
    const key = 'global';
    
    if (this.bindGroups.has(key)) {
      return this.bindGroups.get(key)!;
    }
    
    if (!this.globalLayout) {
      throw new Error('Global layout not set. Call setLayouts() first.');
    }
    
    const bindGroup = this.device.createBindGroup({
      label: 'GlobalBindGroup',
      layout: this.globalLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: frameUniformBuffer
          }
        }
      ]
    });
    
    this.bindGroups.set(key, bindGroup);
    return bindGroup;
  }
  
  /**
   * Create an object bind group (per-object uniforms + texture)
   * For dynamic objects, we create a new bind group each time
   * TODO: Implement bind group pooling for better performance
   */
  createObjectBindGroup(
    objectUniformBuffer: GPUBuffer,
    sampler: GPUSampler,
    texture: GPUTextureView | null
  ): GPUBindGroup {
    if (!this.objectLayout) {
      throw new Error('Object layout not set. Call setLayouts() first.');
    }
    
    const entries: GPUBindGroupEntry[] = [
      {
        binding: 0,
        resource: {
          buffer: objectUniformBuffer
        }
      },
      {
        binding: 1,
        resource: sampler
      }
    ];
    
    // Add texture if available
    if (texture) {
      entries.push({
        binding: 2,
        resource: texture
      });
    } else {
      // Use a default 1x1 white texture
      entries.push({
        binding: 2,
        resource: this.createDefaultTexture().createView()
      });
    }
    
    return this.device.createBindGroup({
      label: 'ObjectBindGroup',
      layout: this.objectLayout,
      entries
    });
  }
  
  /**
   * Create a default 1x1 white texture for objects without textures
   */
  private createDefaultTexture(): GPUTexture {
    const texture = this.device.createTexture({
      label: 'DefaultWhiteTexture',
      size: { width: 1, height: 1 },
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });
    
    // Fill with white color
    const data = new Uint8Array([255, 255, 255, 255]);
    this.device.queue.writeTexture(
      { texture },
      data,
      { bytesPerRow: 4 },
      { width: 1, height: 1 }
    );
    
    return texture;
  }
  
  /**
   * Create a sampler with common settings for low-poly rendering
   */
  createDefaultSampler(): GPUSampler {
    return this.device.createSampler({
      label: 'LowPolySampler',
      magFilter: 'nearest',  // Nearest for crisp low-poly look
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      addressModeW: 'clamp-to-edge'
    });
  }
  
  /**
   * Clear cached bind groups (call when layouts change)
   */
  clearCache(): void {
    this.bindGroups.clear();
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.bindGroups.clear();
  }
}
