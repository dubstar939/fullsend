/**
 * Camera System - Chase camera with smooth follow and effects
 */

import * as THREE from 'three';

export interface CameraConfig {
  followDistance: number;
  followHeight: number;
  followOffset: number;
  lookAhead: number;
  lerpFactor: number;
  fovBase: number;
  fovMax: number;
}

export class CameraSystem {
  public readonly camera: THREE.PerspectiveCamera;
  private config: CameraConfig;
  private target: THREE.Object3D | null = null;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private shakeOffset: THREE.Vector3 = new THREE.Vector3();
  private shakeIntensity: number = 0;
  private shakeDecay: number = 5;

  constructor(camera?: THREE.PerspectiveCamera) {
    this.camera = camera ?? new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    
    this.config = {
      followDistance: 12,
      followHeight: 5,
      followOffset: 0,
      lookAhead: 10,
      lerpFactor: 0.08,
      fovBase: 75,
      fovMax: 100,
    };
  }

  /**
   * Set the camera's follow target
   */
  setTarget(target: THREE.Object3D): void {
    this.target = target;
  }

  /**
   * Update camera position and orientation
   */
  update(deltaTime: number, playerSpeed: number = 0, playerSteer: number = 0): void {
    if (!this.target) return;

    // Dynamic FOV based on speed
    const speedRatio = playerSpeed / 2.8; // Normalize to max speed
    const targetFOV = this.config.fovBase + (this.config.fovMax - this.config.fovBase) * speedRatio;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, deltaTime * 2);
    this.camera.updateProjectionMatrix();

    // Calculate ideal camera position
    const followDistance = this.config.followDistance - playerSpeed * 2;
    const idealX = this.target.position.x + this.config.followOffset + playerSteer * 2;
    const idealY = this.target.position.y + this.config.followHeight;
    const idealZ = this.target.position.z + followDistance;

    this.targetPosition.set(idealX, idealY, idealZ);

    // Smooth follow with lerp
    this.camera.position.lerp(this.targetPosition, this.config.lerpFactor);

    // Calculate look-at point (ahead of target)
    const lookAheadDistance = this.config.lookAhead + playerSpeed * 10;
    this.targetLookAt.set(
      this.target.position.x + playerSteer * 3,
      this.target.position.y + 2,
      this.target.position.z - lookAheadDistance
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
      this.shakeIntensity -= this.shakeDecay * deltaTime;
      if (this.shakeIntensity < 0) {
        this.shakeIntensity = 0;
      }
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
  }

  /**
   * Add camera shake
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
   * Instant snap to target position
   */
  snapToTarget(): void {
    if (!this.target) return;
    
    this.camera.position.set(
      this.target.position.x,
      this.target.position.y + this.config.followHeight,
      this.target.position.z + this.config.followDistance
    );
    this.camera.lookAt(
      this.target.position.x,
      this.target.position.y + 2,
      this.target.position.z - this.config.lookAhead
    );
  }

  /**
   * Set aspect ratio
   */
  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Get camera position
   */
  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  /**
   * Get current FOV
   */
  getFOV(): number {
    return this.camera.fov;
  }
}
