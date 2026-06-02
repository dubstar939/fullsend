/**
 * Headlight Flash Detector - Player challenges rival by flashing headlights
 */

import { RivalCar } from '../../entities/RivalCar';
import { PlayerCar } from '../../entities/PlayerCar';

export interface HeadlightFlashConfig {
  flashDuration: number;       // How long the flash lasts
  cooldownTime: number;        // Time between flashes
  detectionRange: {
    min: number;               // Minimum distance to challenge
    max: number;               // Maximum distance to challenge
  };
  angleThreshold: number;      // Max angle difference to target rival
}

export const DEFAULT_FLASH_CONFIG: HeadlightFlashConfig = {
  flashDuration: 0.3,
  cooldownTime: 1.0,
  detectionRange: {
    min: 5,
    max: 30,
  },
  angleThreshold: Math.PI / 6, // 30 degrees
};

export interface FlashResult {
  success: boolean;
  targetedRival: RivalCar | null;
  reason?: string;
}

export class HeadlightFlashDetector {
  private config: HeadlightFlashConfig;
  private isFlashing: boolean;
  private flashTimer: number;
  private cooldownTimer: number;
  private onFlashTriggered?: (result: FlashResult) => void;

  constructor(config: Partial<HeadlightFlashConfig> = {}) {
    this.config = { ...DEFAULT_FLASH_CONFIG, ...config };
    this.isFlashing = false;
    this.flashTimer = 0;
    this.cooldownTimer = 0;
  }

  setFlashCallback(callback: (result: FlashResult) => void): void {
    this.onFlashTriggered = callback;
  }

  /**
   * Update detector
   */
  update(deltaTime: number): void {
    // Update flash timer
    if (this.isFlashing) {
      this.flashTimer += deltaTime;
      if (this.flashTimer >= this.config.flashDuration) {
        this.isFlashing = false;
        this.flashTimer = 0;
      }
    }

    // Update cooldown timer
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= deltaTime;
    }
  }

  /**
   * Trigger headlight flash
   */
  triggerFlash(player: PlayerCar, rivals: RivalCar[]): FlashResult {
    // Check cooldown
    if (this.cooldownTimer > 0) {
      const result: FlashResult = {
        success: false,
        targetedRival: null,
        reason: 'COOLDOWN',
      };
      this.onFlashTriggered?.(result);
      return result;
    }

    // Start flash
    this.isFlashing = true;
    this.flashTimer = 0;
    this.cooldownTimer = this.config.cooldownTime;

    // Find targeted rival
    const targetedRival = this.findTargetedRival(player, rivals);

    const result: FlashResult = {
      success: targetedRival !== null,
      targetedRival,
      reason: targetedRival ? undefined : 'NO_TARGET',
    };

    this.onFlashTriggered?.(result);
    return result;
  }

  /**
   * Find the rival being targeted by the flash
   */
  private findTargetedRival(player: PlayerCar, rivals: RivalCar[]): RivalCar | null {
    const playerPos = player.getPosition();
    const playerDir = new THREE.Vector3(0, 0, -1); // Assuming car faces -Z

    let closestRival: RivalCar | null = null;
    let closestDistance = Infinity;

    for (const rival of rivals) {
      const rivalPos = rival.data.position;
      const toRival = new THREE.Vector3().subVectors(rivalPos, playerPos);
      const distance = toRival.length();

      // Check distance range
      if (distance < this.config.detectionRange.min || 
          distance > this.config.detectionRange.max) {
        continue;
      }

      // Check angle (rival should be in front of player)
      toRival.normalize();
      const angle = playerDir.angleTo(toRival);
      
      if (angle > this.config.angleThreshold) {
        continue;
      }

      // Check if rival is ahead (not behind)
      if (rivalPos.z > playerPos.z) {
        continue;
      }

      // Found a valid target - use closest one
      if (distance < closestDistance) {
        closestDistance = distance;
        closestRival = rival;
      }
    }

    return closestRival;
  }

  /**
   * Check if currently flashing
   */
  isCurrentlyFlashing(): boolean {
    return this.isFlashing;
  }

  /**
   * Get flash intensity (0-1) for visual effects
   */
  getFlashIntensity(): number {
    if (!this.isFlashing) return 0;
    
    // Pulse effect
    const pulseSpeed = 10;
    return 0.5 + 0.5 * Math.sin(this.flashTimer * pulseSpeed * Math.PI * 2);
  }

  /**
   * Get cooldown remaining
   */
  getCooldownRemaining(): number {
    return Math.max(0, this.cooldownTimer);
  }

  /**
   * Check if flash is available
   */
  isFlashAvailable(): boolean {
    return this.cooldownTimer <= 0 && !this.isFlashing;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.isFlashing = false;
    this.flashTimer = 0;
    this.cooldownTimer = 0;
  }
}

// Import THREE for vector math
import * as THREE from 'three';
