/**
 * AI Component - Data component for AI-controlled entities
 * Contains all state needed for steering behaviors and path following
 */

import * as THREE from 'three';

export enum AIState {
  /** Idle, no active behavior */
  IDLE = 'idle',
  /** Moving along a path */
  PATROLLING = 'patrolling',
  /** Chasing a target */
  CHASING = 'chasing',
  /** Fleeing from a threat */
  FLEEING = 'fleeing',
  /** Avoiding an obstacle */
  AVOIDING = 'avoiding',
  /** Stopped/waiting */
  STOPPED = 'stopped',
}

export interface AIConfig {
  /** Maximum speed in units per second */
  maxSpeed: number;
  /** Maximum acceleration */
  maxAcceleration: number;
  /** Turn rate in radians per second */
  turnRate: number;
  /** Detection radius for obstacles */
  detectionRadius: number;
  /** Look-ahead distance for path following */
  pathLookAhead: number;
  /** Distance to consider waypoint reached */
  waypointReachDistance: number;
  /** Whether this AI can be targeted by towers */
  isTargetable: boolean;
  /** Enemy type identifier */
  enemyType: string;
}

/**
 * AIComponent - Attached to AI-controlled entities
 * Contains steering behavior state and configuration
 */
export class AIComponent {
  /** Unique identifier */
  public readonly id: string;
  
  /** Current AI state */
  public state: AIState;
  
  /** Current velocity */
  public velocity: THREE.Vector3;
  
  /** Current acceleration */
  public acceleration: THREE.Vector3;
  
  /** Maximum speed */
  public maxSpeed: number;
  
  /** Maximum acceleration */
  public maxAcceleration: number;
  
  /** Turn rate limit */
  public turnRate: number;
  
  /** Obstacle detection radius */
  public detectionRadius: number;
  
  /** Path follow look-ahead */
  public pathLookAhead: number;
  
  /** Waypoint reach threshold */
  public waypointReachDistance: number;
  
  /** Current target waypoint ID */
  public currentWaypointId: string | null;
  
  /** Next waypoint ID (for smooth turning) */
  public nextWaypointId: string | null;
  
  /** Current path name */
  public currentPath: string | null;
  
  /** Chase target */
  public chaseTarget: THREE.Object3D | null;
  
  /** Flee target */
  public fleeTarget: THREE.Vector3 | null;
  
  /** Whether AI is active */
  public isActive: boolean;
  
  /** Health multiplier from wave scaling */
  public healthMultiplier: number;
  
  /** Speed multiplier from wave scaling */
  public speedMultiplier: number;
  
  /** Owner entity reference */
  public owner: THREE.Object3D | null;
  
  /** Custom data for game logic */
  public userData: Record<string, unknown>;
  
  /** Last update time for delta calculations */
  private _lastUpdateTime: number = 0;

  constructor(config: AIConfig) {
    this.id = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.state = AIState.IDLE;
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = config.maxSpeed;
    this.maxAcceleration = config.maxAcceleration;
    this.turnRate = config.turnRate;
    this.detectionRadius = config.detectionRadius;
    this.pathLookAhead = config.pathLookAhead;
    this.waypointReachDistance = config.waypointReachDistance;
    this.currentWaypointId = null;
    this.nextWaypointId = null;
    this.currentPath = null;
    this.chaseTarget = null;
    this.fleeTarget = null;
    this.isActive = true;
    this.healthMultiplier = 1.0;
    this.speedMultiplier = 1.0;
    this.owner = null;
    this.userData = {};
  }

  /**
   * Reset component for reuse
   */
  reset(config: AIConfig): void {
    this.state = AIState.IDLE;
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.maxSpeed = config.maxSpeed;
    this.maxAcceleration = config.maxAcceleration;
    this.turnRate = config.turnRate;
    this.detectionRadius = config.detectionRadius;
    this.pathLookAhead = config.pathLookAhead;
    this.waypointReachDistance = config.waypointReachDistance;
    this.currentWaypointId = null;
    this.nextWaypointId = null;
    this.currentPath = null;
    this.chaseTarget = null;
    this.fleeTarget = null;
    this.isActive = true;
    this.healthMultiplier = 1.0;
    this.speedMultiplier = 1.0;
    this.userData = {};
  }

  /**
   * Apply wave scaling multipliers
   */
  applyWaveScaling(healthMult: number, speedMult: number): void {
    this.healthMultiplier = healthMult;
    this.speedMultiplier = speedMult;
  }

  /**
   * Get effective max speed with wave scaling
   */
  getEffectiveMaxSpeed(): number {
    return this.maxSpeed * this.speedMultiplier;
  }

  /**
   * Set a new state
   */
  setState(newState: AIState): void {
    this.state = newState;
    
    // Clear relevant targets on state change
    if (newState !== AIState.CHASING) {
      this.chaseTarget = null;
    }
    if (newState !== AIState.FLEEING) {
      this.fleeTarget = null;
    }
  }

  /**
   * Start patrolling a path
   */
  startPatrolling(pathName: string, startWaypointId?: string): void {
    this.currentPath = pathName;
    this.currentWaypointId = startWaypointId ?? null;
    this.setState(AIState.PATROLLING);
  }

  /**
   * Start chasing a target
   */
  startChasing(target: THREE.Object3D): void {
    this.chaseTarget = target;
    this.setState(AIState.CHASING);
  }

  /**
   * Start fleeing from a position
   */
  startFleeing(fromPosition: THREE.Vector3): void {
    if (!this.fleeTarget) {
      this.fleeTarget = new THREE.Vector3();
    }
    this.fleeTarget.copy(fromPosition);
    this.setState(AIState.FLEEING);
  }

  /**
   * Stop all movement
   */
  stop(): void {
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.setState(AIState.STOPPED);
  }

  /**
   * Check if at or near a waypoint
   */
  hasReachedWaypoint(currentPos: THREE.Vector3, waypointPos: THREE.Vector3): boolean {
    return currentPos.distanceToSquared(waypointPos) <= this.waypointReachDistance ** 2;
  }

  /**
   * Get desired direction towards a target
   */
  getDesiredDirection(toTarget: THREE.Vector3): THREE.Vector3 {
    return toTarget.clone().normalize();
  }

  /**
   * Calculate steering force needed to reach desired velocity
   */
  calculateSteering(desiredVelocity: THREE.Vector3): THREE.Vector3 {
    const steering = desiredVelocity.clone().sub(this.velocity);
    steering.clampLength(0, this.maxAcceleration);
    return steering;
  }

  /**
   * Limit velocity to max speed
   */
  limitVelocity(): void {
    this.velocity.clampLength(0, this.getEffectiveMaxSpeed());
  }

  /**
   * Apply acceleration to velocity
   */
  applyAcceleration(deltaTime: number): void {
    this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
    this.limitVelocity();
  }

  /**
   * Move owner based on velocity
   */
  moveOwner(deltaTime: number): void {
    if (!this.owner) return;
    
    const displacement = this.velocity.clone().multiplyScalar(deltaTime);
    this.owner.position.add(displacement);
    
    // Rotate to face movement direction
    if (this.velocity.lengthSq() > 0.01) {
      const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      const currentRotation = this.owner.rotation.y;
      
      // Smooth rotation towards target
      let rotDiff = targetRotation - currentRotation;
      
      // Normalize to -PI to PI
      while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      
      // Apply turn rate limit
      const maxRot = this.turnRate * deltaTime;
      if (Math.abs(rotDiff) > maxRot) {
        rotDiff = Math.sign(rotDiff) * maxRot;
      }
      
      this.owner.rotation.y = currentRotation + rotDiff;
    }
  }

  /**
   * Clear all forces and stop
   */
  clearForces(): void {
    this.acceleration.set(0, 0, 0);
  }
}

/**
 * Factory for creating common AI configurations
 */
export class AIConfigFactory {
  /**
   * Create config for a basic enemy car
   */
  static createBasicCar(
    maxSpeed: number = 15,
    maxAcceleration: number = 8,
    turnRate: number = 2
  ): AIConfig {
    return {
      maxSpeed,
      maxAcceleration,
      turnRate,
      detectionRadius: 5,
      pathLookAhead: 10,
      waypointReachDistance: 2,
      isTargetable: true,
      enemyType: 'basic_car',
    };
  }

  /**
   * Create config for a fast scout enemy
   */
  static createScout(
    maxSpeed: number = 25,
    maxAcceleration: number = 12,
    turnRate: number = 4
  ): AIConfig {
    return {
      maxSpeed,
      maxAcceleration,
      turnRate,
      detectionRadius: 8,
      pathLookAhead: 15,
      waypointReachDistance: 3,
      isTargetable: true,
      enemyType: 'scout',
    };
  }

  /**
   * Create config for a heavy/tank enemy
   */
  static createTank(
    maxSpeed: number = 8,
    maxAcceleration: number = 4,
    turnRate: number = 1
  ): AIConfig {
    return {
      maxSpeed,
      maxAcceleration,
      turnRate,
      detectionRadius: 6,
      pathLookAhead: 8,
      waypointReachDistance: 3,
      isTargetable: true,
      enemyType: 'tank',
    };
  }

  /**
   * Create config for a boss enemy
   */
  static createBoss(
    maxSpeed: number = 10,
    maxAcceleration: number = 5,
    turnRate: number = 1.5
  ): AIConfig {
    return {
      maxSpeed,
      maxAcceleration,
      turnRate,
      detectionRadius: 10,
      pathLookAhead: 12,
      waypointReachDistance: 4,
      isTargetable: true,
      enemyType: 'boss',
    };
  }
}
