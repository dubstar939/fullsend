/**
 * Projectile Component - Data-only component for projectile entities
 * Used in ECS-style architecture for high-performance projectile system
 */

import * as THREE from 'three';

export enum ProjectileType {
  /** Standard projectile with linear motion */
  STANDARD = 'standard',
  /** Projectile affected by gravity (ballistic arc) */
  BALLISTIC = 'ballistic',
  /** Instant hit detection (raycast) */
  HITSCAN = 'hitscan',
}

export interface ProjectileConfig {
  /** Projectile type/movement mode */
  type: ProjectileType;
  /** Speed in units per second */
  speed: number;
  /** Lifetime in seconds before auto-removal */
  lifetime: number;
  /** Damage dealt on impact */
  damage: number;
  /** Initial direction (normalized) */
  direction: THREE.Vector3;
  /** Gravity acceleration for ballistic mode */
  gravity?: number;
  /** Radius for collision detection */
  radius?: number;
  /** Optional homing target */
  homingTarget?: THREE.Object3D;
  /** Homing turn rate (radians per second) */
  homingTurnRate?: number;
}

/**
 * ProjectileComponent - Attached to projectile entities
 * Contains all data needed for projectile simulation
 */
export class ProjectileComponent {
  /** Unique identifier */
  public readonly id: string;
  
  /** Projectile type */
  public type: ProjectileType;
  
  /** Current velocity vector */
  public velocity: THREE.Vector3;
  
  /** Current speed */
  public speed: number;
  
  /** Remaining lifetime */
  public lifetime: number;
  
  /** Max lifetime for normalization */
  public maxLifetime: number;
  
  /** Damage value */
  public damage: number;
  
  /** Collision radius */
  public radius: number;
  
  /** Gravity for ballistic projectiles */
  public gravity: number;
  
  /** Whether this is a hitscan projectile */
  public isHitscan: boolean;
  
  /** Homing target (optional) */
  public homingTarget: THREE.Object3D | null;
  
  /** Homing turn rate */
  public homingTurnRate: number;
  
  /** Whether projectile is active */
  public isActive: boolean;
  
  /** Parent object reference */
  public owner: THREE.Object3D | null;
  
  /** Impact normal from last collision */
  public impactNormal: THREE.Vector3;
  
  /** Whether projectile has impacted */
  public hasImpacted: boolean;

  constructor(config: ProjectileConfig) {
    this.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.speed = config.speed;
    this.lifetime = config.lifetime;
    this.maxLifetime = config.lifetime;
    this.damage = config.damage;
    this.velocity = config.direction.clone().multiplyScalar(config.speed);
    this.radius = config.radius ?? 0.1;
    this.gravity = config.gravity ?? 9.8;
    this.isHitscan = config.type === ProjectileType.HITSCAN;
    this.homingTarget = config.homingTarget ?? null;
    this.homingTurnRate = config.homingTurnRate ?? 0;
    this.isActive = true;
    this.owner = null;
    this.impactNormal = new THREE.Vector3();
    this.hasImpacted = false;
  }

  /**
   * Reset component for reuse (object pooling)
   */
  reset(config: ProjectileConfig): void {
    this.type = config.type;
    this.speed = config.speed;
    this.lifetime = config.lifetime;
    this.maxLifetime = config.lifetime;
    this.damage = config.damage;
    this.velocity.copy(config.direction).multiplyScalar(config.speed);
    this.radius = config.radius ?? 0.1;
    this.gravity = config.gravity ?? 9.8;
    this.isHitscan = config.type === ProjectileType.HITSCAN;
    this.homingTarget = config.homingTarget ?? null;
    this.homingTurnRate = config.homingTurnRate ?? 0;
    this.isActive = true;
    this.impactNormal.set(0, 0, 0);
    this.hasImpacted = false;
  }

  /**
   * Update velocity based on homing target
   */
  updateHoming(deltaTime: number, currentPosition: THREE.Vector3): void {
    if (!this.homingTarget || this.homingTurnRate <= 0) return;

    const targetPos = this.homingTarget.position;
    const desiredDirection = new THREE.Vector3()
      .subVectors(targetPos, currentPosition)
      .normalize();

    const currentDirection = this.velocity.clone().normalize();
    const dot = currentDirection.dot(desiredDirection);
    
    // Clamp to prevent numerical issues
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const angleToTarget = Math.acos(clampedDot);
    
    // Calculate max turn this frame
    const maxTurn = this.homingTurnRate * deltaTime;
    
    if (angleToTarget > maxTurn) {
      // Slerp towards desired direction
      const t = maxTurn / angleToTarget;
      const newDirection = currentDirection.lerp(desiredDirection, t).normalize();
      this.velocity.copy(newDirection).multiplyScalar(this.speed);
    } else {
      // Can reach target directly
      this.velocity.copy(desiredDirection).multiplyScalar(this.speed);
    }
  }

  /**
   * Apply gravity for ballistic projectiles
   */
  applyGravity(deltaTime: number): void {
    if (this.type !== ProjectileType.BALLISTIC) return;
    
    this.velocity.y -= this.gravity * deltaTime;
  }

  /**
   * Get normalized lifetime (0 = just fired, 1 = expired)
   */
  getNormalizedLifetime(): number {
    return 1 - (this.lifetime / this.maxLifetime);
  }

  /**
   * Check if projectile should be removed
   */
  shouldRemove(): boolean {
    return this.lifetime <= 0 || !this.isActive || this.hasImpacted;
  }
}

/**
 * Static factory for creating common projectile configurations
 */
export class ProjectileFactory {
  /**
   * Create a standard bullet configuration
   */
  static createBullet(
    direction: THREE.Vector3,
    speed: number = 50,
    damage: number = 10,
    lifetime: number = 3
  ): ProjectileConfig {
    return {
      type: ProjectileType.STANDARD,
      speed,
      lifetime,
      damage,
      direction: direction.clone().normalize(),
      radius: 0.05,
    };
  }

  /**
   * Create an arrow/ballistic projectile configuration
   */
  static createArrow(
    direction: THREE.Vector3,
    speed: number = 30,
    damage: number = 15,
    lifetime: number = 4,
    gravity: number = 15
  ): ProjectileConfig {
    return {
      type: ProjectileType.BALLISTIC,
      speed,
      lifetime,
      damage,
      direction: direction.clone().normalize(),
      gravity,
      radius: 0.08,
    };
  }

  /**
   * Create a rocket/homing projectile configuration
   */
  static createRocket(
    direction: THREE.Vector3,
    target: THREE.Object3D,
    speed: number = 25,
    damage: number = 25,
    lifetime: number = 5,
    turnRate: number = 3
  ): ProjectileConfig {
    return {
      type: ProjectileType.STANDARD,
      speed,
      lifetime,
      damage,
      direction: direction.clone().normalize(),
      homingTarget: target,
      homingTurnRate: turnRate,
      radius: 0.15,
    };
  }

  /**
   * Create a hitscan configuration (instant hit)
   */
  static createHitscan(
    direction: THREE.Vector3,
    damage: number = 20,
    range: number = 100
  ): ProjectileConfig {
    return {
      type: ProjectileType.HITSCAN,
      speed: Infinity,
      lifetime: range / 1000, // Very short lifetime
      damage,
      direction: direction.clone().normalize(),
      radius: 0.01,
    };
  }
}
