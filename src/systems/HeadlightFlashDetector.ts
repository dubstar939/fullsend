/**
 * Headlight Flash Detector
 * Detects player headlight flash input and checks for rivals in forward cone
 * Tokyo Xtreme Racer-style challenge initiation system
 */

import * as THREE from 'three';
import { TRAFFIC_CONFIG } from '../config/gameConfig';

export interface FlashDetectionResult {
  hasRivalInFront: boolean;
  rivalId?: string;
  distance: number;
  angle: number;
  isInChallengeRange: boolean;
}

export interface HeadlightFlashDetectorConfig {
  /** Detection cone angle in radians */
  detectionAngle: number;
  /** Maximum detection distance */
  detectionDistance: number;
  /** Challenge initiation range */
  challengeRange: number;
  /** Flash cooldown time */
  flashCooldown: number;
  /** Minimum flash duration */
  minFlashDuration: number;
}

const DEFAULT_CONFIG: HeadlightFlashDetectorConfig = {
  detectionAngle: Math.PI / 6, // 30 degrees
  detectionDistance: 50,
  challengeRange: 30,
  flashCooldown: 1.0,
  minFlashDuration: 0.15,
};

export type FlashCallback = (result: FlashDetectionResult) => void;

export class HeadlightFlashDetector {
  private config: HeadlightFlashDetectorConfig;
  
  // State tracking
  private isFlashing: boolean = false;
  private flashStartTime: number = 0;
  private flashCooldownTimer: number = 0;
  private lastFlashTime: number = 0;
  
  // Callbacks
  private onFlashCallbacks: FlashCallback[] = [];
  private onChallengeCallbacks: ((rivalId: string) => void)[] = [];
  
  // Reference to rival spawner for challenge integration
  private getRivalsInFrontFn?: (
    position: THREE.Vector3,
    direction: THREE.Vector3,
    angle: number,
    distance: number
  ) => Array<{ id: string; position: THREE.Vector3 }>;

  constructor(config: Partial<HeadlightFlashDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update detector state
   */
  update(deltaTime: number, playerPosition: THREE.Vector3, playerDirection: THREE.Vector3): void {
    // Update cooldown timer
    if (this.flashCooldownTimer > 0) {
      this.flashCooldownTimer -= deltaTime;
    }
    
    // Check if flash ended
    if (this.isFlashing) {
      const flashDuration = performance.now() / 1000 - this.flashStartTime;
      
      if (flashDuration >= this.config.minFlashDuration) {
        // Valid flash completed
        this.onFlashCompleted(playerPosition, playerDirection);
        this.isFlashing = false;
      }
    }
  }

  /**
   * Trigger headlight flash
   */
  triggerFlash(): boolean {
    if (this.flashCooldownTimer > 0) {
      return false; // Still on cooldown
    }
    
    this.isFlashing = true;
    this.flashStartTime = performance.now() / 1000;
    this.lastFlashTime = this.flashStartTime;
    
    return true;
  }

  /**
   * Cancel current flash
   */
  cancelFlash(): void {
    this.isFlashing = false;
  }

  /**
   * Handle flash completion
   */
  private onFlashCompleted(
    playerPosition: THREE.Vector3,
    playerDirection: THREE.Vector3
  ): void {
    // Set cooldown
    this.flashCooldownTimer = this.config.flashCooldown;
    
    // Detect rivals in front
    const detectionResult = this.detectRivalInFront(playerPosition, playerDirection);
    
    // Notify callbacks
    for (const callback of this.onFlashCallbacks) {
      callback(detectionResult);
    }
    
    // If rival detected in challenge range, notify challenge callbacks
    if (detectionResult.hasRivalInFront && detectionResult.isInChallengeRange) {
      if (detectionResult.rivalId) {
        for (const callback of this.onChallengeCallbacks) {
          callback(detectionResult.rivalId!);
        }
      }
    }
  }

  /**
   * Detect rival in forward cone
   */
  detectRivalInFront(
    playerPosition: THREE.Vector3,
    playerDirection: THREE.Vector3
  ): FlashDetectionResult {
    const result: FlashDetectionResult = {
      hasRivalInFront: false,
      distance: Infinity,
      angle: 0,
      isInChallengeRange: false,
    };
    
    // Use provided function or default implementation
    if (this.getRivalsInFrontFn) {
      const rivals = this.getRivalsInFrontFn(
        playerPosition,
        playerDirection,
        this.config.detectionAngle,
        this.config.detectionDistance
      );
      
      if (rivals.length > 0) {
        // Find closest rival
        let closestRival = rivals[0];
        let closestDist = playerPosition.distanceTo(rivals[0].position);
        
        for (const rival of rivals) {
          const dist = playerPosition.distanceTo(rival.position);
          if (dist < closestDist) {
            closestDist = dist;
            closestRival = rival;
          }
        }
        
        result.hasRivalInFront = true;
        result.rivalId = closestRival.id;
        result.distance = closestDist;
        result.isInChallengeRange = closestDist <= this.config.challengeRange;
        
        // Calculate angle offset
        const toRival = new THREE.Vector3().subVectors(
          closestRival.position,
          playerPosition
        ).normalize();
        
        result.angle = Math.acos(
          Math.max(-1, Math.min(1, playerDirection.dot(toRival)))
        );
      }
    }
    
    return result;
  }

  /**
   * Check if a point is within the detection cone
   */
  isPointInCone(
    point: THREE.Vector3,
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): { inCone: boolean; distance: number; angle: number } {
    const toPoint = new THREE.Vector3().subVectors(point, origin);
    const distance = toPoint.length();
    
    if (distance > this.config.detectionDistance) {
      return { inCone: false, distance, angle: 0 };
    }
    
    toPoint.normalize();
    const cosAngle = direction.dot(toPoint);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    const inCone = angle <= this.config.detectionAngle / 2;
    
    return { inCone, distance, angle };
  }

  /**
   * Register callback for flash events
   */
  onFlash(callback: FlashCallback): void {
    this.onFlashCallbacks.push(callback);
  }

  /**
   * Register callback for challenge initiation
   */
  onChallenge(callback: (rivalId: string) => void): void {
    this.onChallengeCallbacks.push(callback);
  }

  /**
   * Set function to get rivals in front
   */
  setGetRivalsInFrontFn(
    fn: (
      position: THREE.Vector3,
      direction: THREE.Vector3,
      angle: number,
      distance: number
    ) => Array<{ id: string; position: THREE.Vector3 }>
  ): void {
    this.getRivalsInFrontFn = fn;
  }

  /**
   * Check if currently flashing
   */
  getIsFlashing(): boolean {
    return this.isFlashing;
  }

  /**
   * Check if flash is on cooldown
   */
  getIsOnCooldown(): boolean {
    return this.flashCooldownTimer > 0;
  }

  /**
   * Get remaining cooldown time
   */
  getCooldownRemaining(): number {
    return Math.max(0, this.flashCooldownTimer);
  }

  /**
   * Get time since last flash
   */
  getTimeSinceLastFlash(): number {
    if (this.lastFlashTime === 0) return Infinity;
    return performance.now() / 1000 - this.lastFlashTime;
  }

  /**
   * Is flash ready (not on cooldown)
   */
  isReady(): boolean {
    return !this.isFlashing && this.flashCooldownTimer <= 0;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.isFlashing = false;
    this.flashStartTime = 0;
    this.flashCooldownTimer = 0;
    this.lastFlashTime = 0;
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.onFlashCallbacks = [];
    this.onChallengeCallbacks = [];
  }
}

/**
 * Visual indicator for headlight flash detection cone
 */
export class FlashConeVisualizer {
  private coneMesh: THREE.Mesh | null = null;
  private scene: THREE.Scene;
  private detector: HeadlightFlashDetector;
  
  constructor(
    scene: THREE.Scene,
    detector: HeadlightFlashDetector,
    color: number = 0xffffaa
  ) {
    this.scene = scene;
    this.detector = detector;
    
    this.createConeMesh(color);
  }
  
  private createConeMesh(color: number): void {
    // Create cone geometry for visualization
    const geometry = new THREE.ConeGeometry(
      Math.tan(Math.PI / 12) * DEFAULT_CONFIG.detectionDistance,
      DEFAULT_CONFIG.detectionDistance,
      32,
      1,
      true
    );
    
    // Rotate to point forward
    geometry.rotateX(Math.PI / 2);
    
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    
    this.coneMesh = new THREE.Mesh(geometry, material);
    this.coneMesh.visible = false;
    this.scene.add(this.coneMesh);
  }
  
  update(position: THREE.Vector3, direction: THREE.Vector3): void {
    if (!this.coneMesh) return;
    
    this.coneMesh.position.copy(position);
    this.coneMesh.lookAt(position.clone().add(direction));
    
    // Show when ready to flash
    this.coneMesh.visible = this.detector.isReady();
    
    // Pulse effect when on cooldown
    if (this.detector.getIsOnCooldown()) {
      const cooldownProgress = 1 - (
        this.detector.getCooldownRemaining() / DEFAULT_CONFIG.flashCooldown
      );
      if (this.coneMesh.material instanceof THREE.MeshBasicMaterial) {
        this.coneMesh.material.opacity = 0.05 + Math.sin(cooldownProgress * Math.PI) * 0.1;
      }
    }
  }
  
  showFlashEffect(): void {
    if (!this.coneMesh) return;
    
    // Bright flash
    if (this.coneMesh.material instanceof THREE.MeshBasicMaterial) {
      this.coneMesh.material.opacity = 0.8;
      this.coneMesh.material.color.setHex(0xffffff);
      
      // Fade back
      setTimeout(() => {
        if (this.coneMesh && this.coneMesh.material instanceof THREE.MeshBasicMaterial) {
          this.coneMesh.material.opacity = 0.15;
          this.coneMesh.material.color.setHex(0xffffaa);
        }
      }, 100);
    }
  }
  
  dispose(): void {
    if (this.coneMesh) {
      this.coneMesh.geometry.dispose();
      if (this.coneMesh.material instanceof THREE.Material) {
        this.coneMesh.material.dispose();
      }
      this.scene.remove(this.coneMesh);
      this.coneMesh = null;
    }
  }
}
