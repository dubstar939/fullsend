/**
 * Camera System
 * Chase camera with speed-based FOV, shake, and smooth follow
 */

import * as THREE from 'three';
import { PHYSICS_CONFIG } from '../config/gameConfig';

export interface CameraConfig {
  followDistance: number;
  followHeight: number;
  followOffset: number;
  lookAhead: number;
  lerpFactor: number;
}

export class ChaseCamera {
  public camera: THREE.PerspectiveCamera;
  private config: CameraConfig;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private currentFOV: number;
  private shakeOffset: THREE.Vector3 = new THREE.Vector3();
  private shakeIntensity: number = 0;
  private shakeDecay: number = 5;

  constructor(fov: number = PHYSICS_CONFIG.FOV_BASE, aspect: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    this.currentFOV = fov;
    
    this.config = {
      followDistance: 12,
      followHeight: 5,
      followOffset: 0,
      lookAhead: 10,
      lerpFactor: PHYSICS_CONFIG.CAMERA_LAG_BASE,
    };
  }

  update(
    dt: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number,
    playerSteer: number
  ): void {
    // Calculate dynamic FOV based on speed
    const speedRatio = playerSpeed / PHYSICS_CONFIG.MAX_SPEED;
    const targetFOV = PHYSICS_CONFIG.FOV_BASE + (PHYSICS_CONFIG.FOV_MAX - PHYSICS_CONFIG.FOV_BASE) * speedRatio;
    this.currentFOV = THREE.MathUtils.lerp(this.currentFOV, targetFOV, dt * 2);
    this.camera.fov = this.currentFOV;
    this.camera.updateProjectionMatrix();

    // Calculate ideal camera position
    const followDistance = this.config.followDistance - playerSpeed * 2;
    const idealX = playerPosition.x + this.config.followOffset + playerSteer * 2;
    const idealY = playerPosition.y + this.config.followHeight;
    const idealZ = playerPosition.z + followDistance;

    this.targetPosition.set(idealX, idealY, idealZ);

    // Smooth follow with lerp
    this.camera.position.lerp(this.targetPosition, this.config.lerpFactor);

    // Calculate look-at point (ahead of player)
    const lookAheadDistance = this.config.lookAhead + playerSpeed * 10;
    this.targetLookAt.set(
      playerPosition.x + playerSteer * 3,
      playerPosition.y + 2,
      playerPosition.z - lookAheadDistance
    );

    this.camera.lookAt(this.targetLookAt);

    // Apply shake
    if (this.shakeIntensity > 0) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
      this.camera.position.add(this.shakeOffset);
      
      // Decay shake
      this.shakeIntensity -= this.shakeDecay * dt;
      if (this.shakeIntensity < 0) {
        this.shakeIntensity = 0;
      }
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
  }

  /**
   * Add camera shake (e.g., from collision or nitrous)
   */
  addShake(intensity: number): void {
    this.shakeIntensity = Math.min(this.shakeIntensity + intensity, 1);
  }

  /**
   * Set camera configuration
   */
  setConfig(config: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Instant snap to position (for respawns)
   */
  snapTo(playerPosition: THREE.Vector3): void {
    this.camera.position.set(
      playerPosition.x,
      playerPosition.y + this.config.followHeight,
      playerPosition.z + this.config.followDistance
    );
    this.camera.lookAt(
      playerPosition.x,
      playerPosition.y + 2,
      playerPosition.z - this.config.lookAhead
    );
  }

  /**
   * Get current camera position
   */
  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  /**
   * Get current FOV
   */
  getFOV(): number {
    return this.currentFOV;
  }
}

/**
 * Cinematic Camera for replays and cutscenes
 */
export class CinematicCamera {
  public camera: THREE.PerspectiveCamera;
  private path: THREE.Vector3[] = [];
  private currentIndex: number = 0;
  private progress: number = 0;

  constructor(aspect: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  }

  setPath(points: THREE.Vector3[]): void {
    this.path = points;
    this.currentIndex = 0;
    this.progress = 0;
  }

  update(dt: number, speed: number = 1): void {
    if (this.path.length === 0) return;

    this.progress += dt * speed;
    
    if (this.progress >= 1) {
      this.progress = 0;
      this.currentIndex = (this.currentIndex + 1) % this.path.length;
    }

    const current = this.path[this.currentIndex];
    const next = this.path[(this.currentIndex + 1) % this.path.length];

    const t = this.easeInOutQuad(this.progress);
    this.camera.position.lerpVectors(current, next, t);
    this.camera.lookAt(
      this.path[(this.currentIndex + 2) % this.path.length]
    );
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

/**
 * First-person camera inside the car
 */
export class FirstPersonCamera {
  public camera: THREE.PerspectiveCamera;
  private eyeOffset: THREE.Vector3 = new THREE.Vector3(0, 1.4, 0.5);

  constructor(aspect: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(80, aspect, 0.1, 1000);
  }

  update(playerPosition: THREE.Vector3, playerRotation: THREE.Euler): void {
    const offset = this.eyeOffset.clone();
    offset.applyEuler(playerRotation);
    
    this.camera.position.copy(playerPosition).add(offset);
    this.camera.rotation.copy(playerRotation);
  }
}
