/**
 * Projectile Pool - High-performance object pooling for projectiles
 * Zero allocations during gameplay, pre-allocated buffers
 */

import * as THREE from 'three';
import { ProjectileComponent, ProjectileConfig } from './ProjectileComponent';

export interface ProjectileInstance {
  /** The projectile component with all simulation data */
  component: ProjectileComponent;
  /** Visual mesh/object for rendering */
  mesh: THREE.Object3D;
  /** Whether this instance is currently active */
  isActive: boolean;
}

export interface ProjectilePoolConfig {
  /** Maximum number of pooled projectiles */
  maxProjectiles: number;
  /** Initial pool size (pre-allocated) */
  initialSize?: number;
  /** Geometry template for projectile meshes */
  geometry: THREE.BufferGeometry;
  /** Material template for projectile meshes */
  material: THREE.Material;
  /** Optional parent group for all projectiles */
  parentGroup?: THREE.Group;
}

/**
 * ProjectilePool - Manages a fixed-size pool of projectile instances
 * Uses object pooling pattern to eliminate GC pressure during gameplay
 */
export class ProjectilePool {
  /** All pool instances (active + inactive) */
  private _pool: ProjectileInstance[] = [];
  
  /** Index mapping for fast lookup by component ID */
  private _instanceMap: Map<string, number> = new Map();
  
  /** Free indices for quick allocation */
  private _freeIndices: number[] = [];
  
  /** Count of active projectiles */
  private _activeCount: number = 0;
  
  /** Maximum pool capacity */
  private _maxCapacity: number;
  
  /** Shared geometry reference */
  private _geometry: THREE.BufferGeometry;
  
  /** Shared material reference */
  private _material: THREE.Material;
  
  /** Parent group for organization */
  private _parentGroup: THREE.Group;
  
  /** Pre-allocated Vector3 for calculations (avoids GC) */
  // private static _tempVec3 = new THREE.Vector3();
  
  /** Pre-allocated Matrix4 for calculations (avoids GC) */
  // private static _tempMatrix4 = new THREE.Matrix4();

  constructor(config: ProjectilePoolConfig) {
    this._maxCapacity = config.maxProjectiles;
    this._geometry = config.geometry;
    this._material = config.material;
    this._parentGroup = config.parentGroup ?? new THREE.Group();
    
    // Pre-allocate the entire pool
    const initialSize = config.initialSize ?? config.maxProjectiles;
    for (let i = 0; i < initialSize; i++) {
      const mesh = new THREE.Mesh(this._geometry, this._material);
      mesh.visible = false;
      mesh.matrixAutoUpdate = false; // Manual matrix control for performance
      
      const dummyConfig: ProjectileConfig = {
        type: 0 as any,
        speed: 0,
        lifetime: 0,
        damage: 0,
        direction: new THREE.Vector3(0, 0, 1),
      };
      
      const component = new ProjectileComponent(dummyConfig);
      component.isActive = false;
      
      const instance: ProjectileInstance = {
        component,
        mesh,
        isActive: false,
      };
      
      this._pool.push(instance);
      this._freeIndices.push(i);
    }
    
    // Add parent group to scene if provided
    if (config.parentGroup) {
      config.parentGroup.add(this._parentGroup);
    }
  }

  /**
   * Acquire a projectile instance from the pool
   * Returns null if pool is exhausted
   */
  acquire(config: ProjectileConfig): ProjectileInstance | null {
    if (this._freeIndices.length === 0) {
      console.warn('[ProjectilePool] Pool exhausted - consider increasing maxProjectiles');
      return null;
    }
    
    const index = this._freeIndices.pop()!;
    const instance = this._pool[index];
    
    // Reset and configure component
    instance.component.reset(config);
    instance.component.owner = instance.mesh;
    
    // Setup mesh
    instance.mesh.visible = true;
    instance.mesh.position.set(0, 0, 0);
    instance.mesh.rotation.set(0, 0, 0);
    instance.mesh.scale.set(1, 1, 1);
    instance.mesh.updateMatrix();
    
    // Register in map
    this._instanceMap.set(instance.component.id, index);
    instance.isActive = true;
    this._activeCount++;
    
    return instance;
  }

  /**
   * Release a projectile instance back to the pool
   */
  release(instance: ProjectileInstance): void;
  release(componentId: string): void;
  release(arg: ProjectileInstance | string): void {
    let instance: ProjectileInstance | undefined;
    let index: number | undefined;
    
    if (typeof arg === 'string') {
      index = this._instanceMap.get(arg);
      if (index !== undefined) {
        instance = this._pool[index];
      }
    } else {
      instance = arg;
      index = this._instanceMap.get(instance.component.id);
    }
    
    if (!instance || index === undefined) return;
    if (!instance.isActive) return; // Already released
    
    // Hide mesh
    instance.mesh.visible = false;
    instance.isActive = false;
    instance.component.isActive = false;
    
    // Remove from map
    this._instanceMap.delete(instance.component.id);
    
    // Return to free list
    this._freeIndices.push(index);
    this._activeCount--;
  }

  /**
   * Get an active instance by component ID
   */
  getInstance(componentId: string): ProjectileInstance | null {
    const index = this._instanceMap.get(componentId);
    if (index === undefined) return null;
    const instance = this._pool[index];
    return instance?.isActive ? instance : null;
  }

  /**
   * Get all active instances
   * Returns array of references (no allocation of new objects)
   */
  getActiveInstances(): ProjectileInstance[] {
    const result: ProjectileInstance[] = [];
    for (const instance of this._pool) {
      if (instance.isActive) {
        result.push(instance);
      }
    }
    return result;
  }

  /**
   * Get count of active projectiles
   */
  getActiveCount(): number {
    return this._activeCount;
  }

  /**
   * Get count of available slots
   */
  getAvailableCount(): number {
    return this._freeIndices.length;
  }

  /**
   * Get total pool capacity
   */
  getMaxCapacity(): number {
    return this._maxCapacity;
  }

  /**
   * Update all active projectiles' matrices based on their positions
   * Called after position updates to sync with renderer
   */
  updateMatrices(): void {
    for (const instance of this._pool) {
      if (!instance.isActive) continue;
      
      // Update mesh matrix from component data
      instance.mesh.updateMatrix();
    }
  }

  /**
   * Set position and rotation for a projectile instance
   * Updates both component owner and mesh transform
   */
  setTransform(instance: ProjectileInstance, position: THREE.Vector3, rotation?: THREE.Euler): void {
    if (rotation) {
      instance.mesh.setRotationFromEuler(rotation);
    }
    instance.mesh.position.copy(position);
    instance.mesh.updateMatrix();
  }

  /**
   * Apply color tint to a projectile instance
   */
  setColor(instance: ProjectileInstance, color: THREE.Color): void {
    if (instance.mesh instanceof THREE.Mesh && instance.mesh.material) {
      const material = instance.mesh.material as THREE.MeshBasicMaterial;
      material.color.copy(color);
    }
  }

  /**
   * Release all active projectiles
   */
  releaseAll(): void {
    for (const instance of this._pool) {
      if (instance.isActive) {
        instance.mesh.visible = false;
        instance.isActive = false;
        instance.component.isActive = false;
        this._instanceMap.delete(instance.component.id);
      }
    }
    this._activeCount = 0;
    this._freeIndices = Array.from({ length: this._maxCapacity }, (_, i) => i);
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    this.releaseAll();
    
    // Dispose all meshes
    for (const instance of this._pool) {
      if (instance.mesh instanceof THREE.Mesh) {
        instance.mesh.geometry.dispose();
        if (Array.isArray(instance.mesh.material)) {
          instance.mesh.material.forEach(m => m.dispose());
        } else {
          instance.mesh.material.dispose();
        }
      }
    }
    
    this._pool = [];
    this._instanceMap.clear();
    this._freeIndices = [];
    this._activeCount = 0;
  }
}
