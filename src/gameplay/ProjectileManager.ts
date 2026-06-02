/**
 * Projectile Manager - Central management for all projectile simulation
 * Handles updates, collision detection hooks, and integration with renderer
 */

import * as THREE from 'three';
import { ProjectilePool, ProjectilePoolConfig } from './ProjectilePool';
import { ProjectileComponent, ProjectileConfig, ProjectileType } from './ProjectileComponent';
import { Profiler } from '../engine/core/Profiler';

export interface ProjectileManagerConfig {
  /** Maximum concurrent projectiles */
  maxProjectiles: number;
  /** Geometry for projectile visuals */
  geometry: THREE.BufferGeometry;
  /** Material for projectile visuals */
  material: THREE.Material;
  /** Parent group for projectiles */
  parentGroup?: THREE.Group;
  /** Optional profiler reference */
  profiler?: Profiler;
}

export interface CollisionResult {
  /** The projectile that collided */
  projectile: ProjectileComponent;
  /** The object hit (if any) */
  hitObject: THREE.Object3D | null;
  /** Hit position in world space */
  hitPosition: THREE.Vector3;
  /** Hit normal in world space */
  hitNormal: THREE.Vector3;
  /** Whether collision should destroy projectile */
  shouldDestroy: boolean;
}

export type CollisionCallback = (result: CollisionResult) => void;

/**
 * ProjectileManager - Main controller for projectile system
 * Integrates with engine update loop and renderer
 */
export class ProjectileManager {
  /** Object pool for efficient projectile allocation */
  private _pool: ProjectilePool;
  
  /** Collision callback for impact handling */
  private _onCollision?: CollisionCallback;
  
  /** Raycaster for hitscan detection */
  private _raycaster: THREE.Raycaster;
  
  /** Collision layers mask (bitmask for filtering) */
  private _collisionLayers: number = 0xffffffff;
  
  /** Temporary vectors for calculations (zero GC) */
  private static _tempVec3A = new THREE.Vector3();
  private static _tempVec3B = new THREE.Vector3();
  // private static _tempRay = new THREE.Ray();
  
  /** Optional profiler */
  private _profiler?: Profiler;
  
  /** Pre-allocated collision result object */
  private _collisionResult: CollisionResult = {
    projectile: null as any,
    hitObject: null,
    hitPosition: new THREE.Vector3(),
    hitNormal: new THREE.Vector3(),
    shouldDestroy: true,
  };

  constructor(config: ProjectileManagerConfig) {
    const poolConfig: ProjectilePoolConfig = {
      maxProjectiles: config.maxProjectiles,
      initialSize: config.maxProjectiles,
      geometry: config.geometry,
      material: config.material,
      parentGroup: config.parentGroup,
    };
    
    this._pool = new ProjectilePool(poolConfig);
    this._raycaster = new THREE.Raycaster();
    this._profiler = config.profiler;
  }

  /**
   * Fire a projectile from a position in a direction
   */
  fire(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    config: ProjectileConfig
  ): ProjectileComponent | null {
    const instance = this._pool.acquire(config);
    if (!instance) return null;
    
    // Set initial position
    instance.mesh.position.copy(position);
    instance.mesh.updateMatrix();
    
    // Align mesh to direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
    instance.mesh.setRotationFromQuaternion(quaternion);
    
    return instance.component;
  }

  /**
   * Fire a projectile from a transform (e.g., weapon mount point)
   */
  fireFromTransform(
    transform: THREE.Object3D,
    config: ProjectileConfig,
    offset?: THREE.Vector3
  ): ProjectileComponent | null {
    const position = ProjectileManager._tempVec3A.copy(transform.position);
    
    if (offset) {
      // Transform offset to world space
      const worldOffset = offset.clone().applyQuaternion(transform.quaternion);
      position.add(worldOffset);
    }
    
    const direction = ProjectileManager._tempVec3B.set(0, 0, 1);
    direction.applyQuaternion(transform.quaternion);
    
    return this.fire(position, direction, config);
  }

  /**
   * Perform instant hitscan attack
   * Returns the target hit (if any)
   */
  fireHitscan(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    damage: number,
    range: number = 100,
    targets?: THREE.Object3D[]
  ): THREE.Object3D | null {
    const normalizedDir = direction.clone().normalize();
    
    this._raycaster.set(origin, normalizedDir);
    this._raycaster.far = range;
    
    if (targets && targets.length > 0) {
      const intersects = this._raycaster.intersectObjects(targets, false);
      
      if (intersects.length > 0) {
        const hit = intersects[0];
        
        // Create collision result
        const dummyConfig: ProjectileConfig = {
          type: ProjectileType.HITSCAN,
          speed: Infinity,
          lifetime: 0,
          damage,
          direction: normalizedDir,
        };
        
        const dummyComponent = new ProjectileComponent(dummyConfig);
        
        this._collisionResult.projectile = dummyComponent;
        this._collisionResult.hitObject = hit.object;
        this._collisionResult.hitPosition.copy(hit.point);
        this._collisionResult.hitNormal.copy(hit.face?.normal ?? new THREE.Vector3(0, 1, 0));
        this._collisionResult.shouldDestroy = true;
        
        if (this._onCollision) {
          this._onCollision(this._collisionResult);
        }
        
        return hit.object;
      }
    }
    
    return null;
  }

  /**
   * Update all active projectiles
   * Call every frame with deltaTime
   */
  update(deltaTime: number): void {
    const instances = this._pool.getActiveInstances();
    
    for (const instance of instances) {
      const component = instance.component;
      
      if (!component.isActive || component.hasImpacted) continue;
      
      // Update lifetime
      component.lifetime -= deltaTime;
      
      if (component.lifetime <= 0) {
        this._pool.release(instance);
        continue;
      }
      
      // Handle hitscan separately (instant resolution)
      if (component.isHitscan) {
        this._pool.release(instance);
        continue;
      }
      
      // Apply homing if configured
      if (component.homingTarget) {
        component.updateHoming(deltaTime, instance.mesh.position);
      }
      
      // Apply gravity for ballistic projectiles
      if (component.type === ProjectileType.BALLISTIC) {
        component.applyGravity(deltaTime);
      }
      
      // Move projectile
      const displacement = ProjectileManager._tempVec3B
        .copy(component.velocity)
        .multiplyScalar(deltaTime);
      
      instance.mesh.position.add(displacement);
      instance.mesh.updateMatrix();
      
      // Rotate to face velocity direction (for visual consistency)
      if (component.velocity.lengthSq() > 0.001) {
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          component.velocity.clone().normalize()
        );
        instance.mesh.setRotationFromQuaternion(quaternion);
      }
      
      // Check bounds (simple distance check from origin)
      const maxDistance = 500; // Configurable world bounds
      if (instance.mesh.position.length() > maxDistance) {
        this._pool.release(instance);
        continue;
      }
    }
    
    // Update profiler stats
    if (this._profiler) {
      // @ts-ignore - extending profiler stats for gameplay metrics
      this._profiler.activeProjectiles = this._pool.getActiveCount();
    }
  }

  /**
   * Check collisions against target objects
   * Call after update() each frame
   */
  checkCollisions(
    targets: THREE.Object3D[],
    collisionLayerMask?: number
  ): void {
    if (targets.length === 0) return;
    
    const instances = this._pool.getActiveInstances();
    const layerMask = collisionLayerMask ?? this._collisionLayers;
    
    for (const instance of instances) {
      const component = instance.component;
      
      if (!component.isActive || component.hasImpacted) continue;
      
      // Simple sphere-sphere collision check
      const projPos = instance.mesh.position;
      const projRadius = component.radius;
      
      for (const target of targets) {
        // Get target bounding sphere (cached or computed)
        let targetSphere: THREE.Sphere;
        
        if (target.userData.boundingSphere) {
          targetSphere = target.userData.boundingSphere as THREE.Sphere;
        } else {
          // Compute approximate sphere from bounding box
          const box = new THREE.Box3().setFromObject(target);
          const center = box.getCenter(ProjectileManager._tempVec3A);
          const radius = box.getSize(ProjectileManager._tempVec3B).length() / 2;
          targetSphere = new THREE.Sphere(center, radius);
          target.userData.boundingSphere = targetSphere;
        }
        
        // Check distance
        const distance = projPos.distanceTo(targetSphere.center);
        const minDistance = projRadius + targetSphere.radius;
        
        if (distance <= minDistance) {
          // Collision detected!
          component.hasImpacted = true;
          
          // Calculate impact normal
          component.impactNormal
            .subVectors(projPos, targetSphere.center)
            .normalize();
          
          // Setup collision result
          this._collisionResult.projectile = component;
          this._collisionResult.hitObject = target;
          this._collisionResult.hitPosition.copy(projPos);
          this._collisionResult.hitNormal.copy(component.impactNormal);
          this._collisionResult.shouldDestroy = true;
          
          // Invoke callback
          if (this._onCollision) {
            this._onCollision(this._collisionResult);
          }
          
          // Release projectile
          this._pool.release(instance);
          break;
        }
      }
    }
  }

  /**
   * Set collision callback
   */
  setCollisionCallback(callback: CollisionCallback): void {
    this._onCollision = callback;
  }

  /**
   * Set collision layer mask
   */
  setCollisionLayerMask(mask: number): void {
    this._collisionLayers = mask;
  }

  /**
   * Get active projectile count
   */
  getActiveCount(): number {
    return this._pool.getActiveCount();
  }

  /**
   * Get available capacity
   */
  getAvailableCapacity(): number {
    return this._pool.getAvailableCount();
  }

  /**
   * Clear all active projectiles
   */
  clearAll(): void {
    this._pool.releaseAll();
  }

  /**
   * Get the projectile pool (for advanced usage)
   */
  getPool(): ProjectilePool {
    return this._pool;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this._pool.dispose();
    this._onCollision = undefined;
  }
}

/**
 * Factory for creating common projectile manager configurations
 */
export class ProjectileManagerFactory {
  /**
   * Create a bullet manager with appropriate visuals
   */
  static createBulletManager(
    maxProjectiles: number = 300,
    parentGroup?: THREE.Group,
    profiler?: Profiler
  ): ProjectileManager {
    // Small sphere geometry for bullets
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    
    // Glowing bullet material
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.9,
    });
    
    return new ProjectileManager({
      maxProjectiles,
      geometry,
      material,
      parentGroup,
      profiler,
    });
  }

  /**
   * Create an arrow/ballistic manager
   */
  static createArrowManager(
    maxProjectiles: number = 100,
    parentGroup?: THREE.Group,
    profiler?: Profiler
  ): ProjectileManager {
    // Cone geometry for arrows
    const geometry = new THREE.ConeGeometry(0.08, 0.5, 8);
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      flatShading: true,
    });
    
    return new ProjectileManager({
      maxProjectiles,
      geometry,
      material,
      parentGroup,
      profiler,
    });
  }

  /**
   * Create an energy bolt manager
   */
  static createEnergyManager(
    maxProjectiles: number = 200,
    parentGroup?: THREE.Group,
    profiler?: Profiler,
    color: number = 0x00ffff
  ): ProjectileManager {
    // Elongated capsule-like shape
    const geometry = new THREE.CapsuleGeometry(0.1, 0.4, 4, 8);
    
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
    
    return new ProjectileManager({
      maxProjectiles,
      geometry,
      material,
      parentGroup,
      profiler,
    });
  }
}
