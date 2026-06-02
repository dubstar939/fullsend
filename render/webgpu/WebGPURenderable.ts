/**
 * WebGPU Renderable Object
 * 
 * Combines mesh, material, and transform into a single renderable entity.
 * This is what you add to the scene for rendering.
 */

import type { IRenderable, BoundingBox } from '../../types/engine.types';
import type { IMesh, IMaterial, ITransform } from '../../types/engine.types';
import { vec3 } from 'gl-matrix';

export interface RenderableConfig {
  id?: string;
  mesh: IMesh;
  material: IMaterial;
  transform: ITransform;
  visible?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export class WebGPURenderable implements IRenderable {
  id: string;
  mesh: IMesh;
  material: IMaterial;
  transform: ITransform;
  visible: boolean;
  
  // Shadow flags (for future shadow mapping)
  castShadow: boolean = false;
  receiveShadow: boolean = false;
  
  // Cached bounding box (in local space)
  private bounds: BoundingBox | null = null;
  private boundsDirty: boolean = true;
  
  constructor(config: RenderableConfig) {
    this.id = config.id || `renderable_${Date.now()}_${Math.random()}`;
    this.mesh = config.mesh;
    this.material = config.material;
    this.transform = config.transform;
    this.visible = config.visible ?? true;
    this.castShadow = config.castShadow ?? false;
    this.receiveShadow = config.receiveShadow ?? false;
  }
  
  /**
   * Get the bounding box in local space
   * TODO: Implement proper bounds calculation from mesh data
   */
  getBounds(): BoundingBox {
    if (!this.bounds || this.boundsDirty) {
      this.calculateBounds();
    }
    
    return this.bounds || {
      min: vec3.fromValues(-0.5, -0.5, -0.5),
      max: vec3.fromValues(0.5, 0.5, 0.5),
      containsPoint: () => false,
      intersects: () => false
    };
  }
  
  /**
   * Calculate bounding box from mesh vertices
   * Simplified implementation - in production, compute from actual vertex data
   */
  private calculateBounds(): void {
    // For now, use a default unit cube bounds
    // In production, iterate over mesh vertices to find actual extents
    
    this.bounds = {
      min: vec3.fromValues(-0.5, -0.5, -0.5),
      max: vec3.fromValues(0.5, 0.5, 0.5),
      
      containsPoint: (point: any): boolean => {
        if (!this.bounds) return false;
        return (
          point[0] >= this.bounds.min[0] && point[0] <= this.bounds.max[0] &&
          point[1] >= this.bounds.min[1] && point[1] <= this.bounds.max[1] &&
          point[2] >= this.bounds.min[2] && point[2] <= this.bounds.max[2]
        );
      },
      
      intersects: (other: BoundingBox): boolean => {
        if (!this.bounds) return false;
        return (
          this.bounds.min[0] <= other.max[0] && this.bounds.max[0] >= other.min[0] &&
          this.bounds.min[1] <= other.max[1] && this.bounds.max[1] >= other.min[1] &&
          this.bounds.min[2] <= other.max[2] && this.bounds.max[2] >= other.min[2]
        );
      }
    };
    
    this.boundsDirty = false;
  }
  
  /**
   * Mark bounds as dirty (call after mesh changes)
   */
  markBoundsDirty(): void {
    this.boundsDirty = true;
  }
  
  /**
   * Update the renderable (call when transform changes)
   */
  update(): void {
    // Transform is updated lazily via getWorldMatrix()
    // This method can be used for additional per-frame updates if needed
  }
  
  /**
   * Clone this renderable
   */
  clone(newId?: string): WebGPURenderable {
    return new WebGPURenderable({
      id: newId,
      mesh: this.mesh,
      material: this.material.clone(),
      transform: this.transform,
      visible: this.visible,
      castShadow: this.castShadow,
      receiveShadow: this.receiveShadow
    });
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    this.material.dispose();
    // Note: We don't dispose mesh here as it may be shared
    this.bounds = null;
  }
}

// ============================================================================
// Utility: Create renderable from primitives
// ============================================================================

import type { GPUDevice } from '@webgpu/types';
import { WebGPUMesh, createCubeMesh, createPlaneMesh } from './WebGPUMesh';
import { WebGPUMaterial, createColoredMaterial } from './WebGPUMaterial';
import { Transform } from '../common/Transform';

/**
 * Create a cube renderable
 */
export function createCubeRenderable(
  device: GPUDevice,
  color: [number, number, number, number],
  position: [number, number, number] = [0, 0, 0],
  size: number = 1
): WebGPURenderable {
  const mesh = createCubeMesh(device, size);
  const material = createColoredMaterial(color, true);
  const transform = new Transform(position);
  
  return new WebGPURenderable({
    mesh,
    material,
    transform
  });
}

/**
 * Create a plane/ground renderable
 */
export function createPlaneRenderable(
  device: GPUDevice,
  color: [number, number, number, number],
  position: [number, number, number] = [0, 0, 0],
  width: number = 10,
  height: number = 10
): WebGPURenderable {
  const mesh = createPlaneMesh(device, width, height, 4);
  const material = createColoredMaterial(color, false); // Smooth shading for ground
  const transform = new Transform(position);
  
  return new WebGPURenderable({
    mesh,
    material,
    transform
  });
}
