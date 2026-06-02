/**
 * WebGPU Material Implementation
 * 
 * Responsibilities:
 * - Define material properties (color, roughness, metalness, emissive)
 * - Control shading mode (flat vs smooth)
 * - Manage texture bindings
 * 
 * Designed for low-poly aesthetics with simple, clean materials.
 */

import type { IMaterial } from '../../types/engine.types';
import { MaterialFlags } from '../../types/engine.types';

export interface MaterialConfig {
  name?: string;
  color?: [number, number, number, number];
  roughness?: number;
  metalness?: number;
  emissive?: [number, number, number];
  emissiveIntensity?: number;
  useFlatShading?: boolean;
  useVertexColors?: boolean;
  texture?: GPUTexture | null;
}

export class WebGPUMaterial implements IMaterial {
  name: string;
  color: [number, number, number, number];
  roughness: number;
  metalness: number;
  emissive: [number, number, number];
  emissiveIntensity: number;
  
  useFlatShading: boolean;
  useVertexColors: boolean;
  
  texture: GPUTexture | null = null;
  
  // Cached pipeline key for efficient lookup
  private pipelineKeyCache: string | null = null;
  
  constructor(config: MaterialConfig = {}) {
    this.name = config.name || 'Material';
    this.color = config.color || [1, 1, 1, 1];
    this.roughness = config.roughness ?? 0.5;
    this.metalness = config.metalness ?? 0.0;
    this.emissive = config.emissive || [0, 0, 0];
    this.emissiveIntensity = config.emissiveIntensity ?? 1.0;
    this.useFlatShading = config.useFlatShading ?? true; // Default to flat for low-poly look
    this.useVertexColors = config.useVertexColors ?? false;
    this.texture = config.texture || null;
  }
  
  /**
   * Get the pipeline key for caching
   * This determines which pipeline variant to use
   */
  getPipelineKey(): string {
    if (this.pipelineKeyCache) {
      return this.pipelineKeyCache;
    }
    
    this.pipelineKeyCache = JSON.stringify({
      flatShading: this.useFlatShading,
      vertexColors: this.useVertexColors,
      hasTexture: !!this.texture
    });
    
    return this.pipelineKeyCache;
  }
  
  /**
   * Get material flags for shader
   */
  getFlags(): number {
    let flags = 0;
    
    if (this.useFlatShading) {
      flags |= MaterialFlags.USE_FLAT_SHADING;
    }
    if (this.useVertexColors) {
      flags |= MaterialFlags.USE_VERTEX_COLORS;
    }
    if (this.texture) {
      flags |= MaterialFlags.HAS_TEXTURE;
    }
    
    return flags;
  }
  
  /**
   * Set color from hex string (convenience method)
   */
  setColorFromHex(hex: string, alpha: number = 1.0): void {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    this.color = [r, g, b, alpha];
    this.invalidateCache();
  }
  
  /**
   * Set color from RGB values (0-255)
   */
  setColorFromRGB(r: number, g: number, b: number, a: number = 255): void {
    this.color = [r / 255, g / 255, b / 255, a / 255];
    this.invalidateCache();
  }
  
  /**
   * Set texture
   */
  setTexture(texture: GPUTexture | null): void {
    this.texture = texture;
    this.invalidateCache();
  }
  
  /**
   * Clone this material
   */
  clone(): WebGPUMaterial {
    return new WebGPUMaterial({
      name: this.name + '_clone',
      color: [...this.color] as [number, number, number, number],
      roughness: this.roughness,
      metalness: this.metalness,
      emissive: [...this.emissive] as [number, number, number],
      emissiveIntensity: this.emissiveIntensity,
      useFlatShading: this.useFlatShading,
      useVertexColors: this.useVertexColors,
      texture: this.texture
    });
  }
  
  /**
   * Invalidate cached values
   */
  private invalidateCache(): void {
    this.pipelineKeyCache = null;
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    // Note: We don't destroy textures here as they may be shared
    this.texture = null;
  }
}

// ============================================================================
// Pre-defined Materials for Low-Poly Style
// ============================================================================

/**
 * Create a simple colored material (default low-poly style)
 */
export function createColoredMaterial(
  color: [number, number, number, number],
  flatShading: boolean = true
): WebGPUMaterial {
  return new WebGPUMaterial({
    name: 'Colored',
    color: color,
    roughness: 0.8,
    metalness: 0.0,
    useFlatShading: flatShading
  });
}

/**
 * Create a material with vertex colors enabled
 */
export function createVertexColorMaterial(
  flatShading: boolean = true
): WebGPUMaterial {
  return new WebGPUMaterial({
    name: 'VertexColor',
    color: [1, 1, 1, 1],
    roughness: 0.5,
    metalness: 0.0,
    useVertexColors: true,
    useFlatShading: flatShading
  });
}

/**
 * Create an emissive material (for glowing objects)
 */
export function createEmissiveMaterial(
  color: [number, number, number],
  intensity: number = 1.0,
  baseColor: [number, number, number, number] = [0.1, 0.1, 0.1, 1]
): WebGPUMaterial {
  return new WebGPUMaterial({
    name: 'Emissive',
    color: baseColor,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.2,
    metalness: 0.8,
    useFlatShading: true
  });
}

/**
 * Create a ground/terrain material
 */
export function createGroundMaterial(
  color: [number, number, number, number] = [0.3, 0.5, 0.2, 1]
): WebGPUMaterial {
  return new WebGPUMaterial({
    name: 'Ground',
    color: color,
    roughness: 1.0,
    metalness: 0.0,
    useFlatShading: false // Smooth shading for terrain
  });
}
