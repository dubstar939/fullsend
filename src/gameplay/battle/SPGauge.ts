/**
 * SP Gauge System - Tokyo Xtreme Racer Style
 * Manages Spirit Points (SP) for highway battles
 * SP drains based on distance, collisions, and time
 */

import { PerformanceMonitor } from '../engine/core/PerformanceMonitor';

export interface SPGaugeConfig {
  /** Maximum SP value */
  maxSP: number;
  /** Base drain rate per second */
  baseDrainRate: number;
  /** Distance-based drain multiplier */
  distanceDrainMultiplier: number;
  /** Wall collision SP penalty */
  wallCollisionPenalty: number;
  /** Traffic collision SP penalty */
  trafficCollisionPenalty: number;
  /** SP recovery rate when leading */
  leadRecoveryRate: number;
  /** Minimum distance to rival before bonus drain */
  minDistanceThreshold: number;
  /** Maximum distance for distance-based drain */
  maxDistanceThreshold: number;
}

const DEFAULT_CONFIG: SPGaugeConfig = {
  maxSP: 1000,
  baseDrainRate: 2.5, // SP per second
  distanceDrainMultiplier: 15.0, // SP per second per unit distance gap
  wallCollisionPenalty: 150,
  trafficCollisionPenalty: 75,
  leadRecoveryRate: 5.0, // SP per second when leading
  minDistanceThreshold: 5.0,
  maxDistanceThreshold: 50.0,
};

export enum SPState {
  NORMAL = 'NORMAL',
  DRAINING = 'DRAINING',
  RECOVERING = 'RECOVERING',
  DEPLETED = 'DEPLETED',
  CRITICAL = 'CRITICAL',
}

export interface SPGaugeData {
  currentSP: number;
  maxSP: number;
  drainRate: number;
  state: SPState;
  distanceGap: number;
  isLeading: boolean;
  lastCollisionTime: number;
  comboMultiplier: number;
}

export class SPGauge {
  private config: SPGaugeConfig;
  private data: SPGaugeData;
  private performanceMonitor: PerformanceMonitor;
  
  // Callbacks
  private onSPChanged?: (currentSP: number, maxSP: number) => void;
  private onSPDepleted?: () => void;
  private onStateChanged?: (state: SPState) => void;
  
  constructor(config: Partial<SPGaugeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.performanceMonitor = new PerformanceMonitor();
    
    this.data = {
      currentSP: this.config.maxSP,
      maxSP: this.config.maxSP,
      drainRate: this.config.baseDrainRate,
      state: SPState.NORMAL,
      distanceGap: 0,
      isLeading: false,
      lastCollisionTime: -999,
      comboMultiplier: 1.0,
    };
  }
  
  /**
   * Update SP gauge based on battle conditions
   */
  update(
    deltaTime: number,
    playerPosition: { z: number },
    rivalPosition: { z: number },
    hasCollision: boolean,
    collisionType?: 'wall' | 'traffic'
  ): void {
    this.performanceMonitor.beginFrame();
    
    const { data, config } = this;
    
    // Calculate distance gap (absolute value)
    data.distanceGap = Math.abs(playerPosition.z - rivalPosition.z);
    
    // Determine if player is leading (ahead means lower Z in our coordinate system)
    data.isLeading = playerPosition.z < rivalPosition.z;
    
    // Calculate effective drain rate
    let effectiveDrainRate = config.baseDrainRate;
    
    // Apply distance-based drain
    if (data.distanceGap > config.minDistanceThreshold) {
      const normalizedGap = Math.min(
        (data.distanceGap - config.minDistanceThreshold) / 
        (config.maxDistanceThreshold - config.minDistanceThreshold),
        1.0
      );
      
      // Exponential drain increase with distance
      const distanceDrain = config.distanceDrainMultiplier * Math.pow(normalizedGap, 1.5);
      effectiveDrainRate += distanceDrain;
      
      if (data.state === SPState.NORMAL || data.state === SPState.RECOVERING) {
        this.setState(SPState.DRAINING);
      }
    } else if (data.isLeading && data.state === SPState.DRAINING) {
      // Recovering when leading and close
      effectiveDrainRate = -config.leadRecoveryRate; // Negative = recovery
      this.setState(SPState.RECOVERING);
    }
    
    // Apply combo multiplier (increases drain as battle progresses)
    effectiveDrainRate *= data.comboMultiplier;
    
    // Apply collision penalties
    if (hasCollision && Date.now() - data.lastCollisionTime > 500) {
      data.lastCollisionTime = Date.now();
      
      if (collisionType === 'wall') {
        this.addSP(-config.wallCollisionPenalty);
      } else if (collisionType === 'traffic') {
        this.addSP(-config.trafficCollisionPenalty);
      }
      
      // Reset combo on collision
      data.comboMultiplier = 1.0;
    }
    
    // Apply drain/recovery
    const spChange = effectiveDrainRate * deltaTime;
    this.addSP(spChange);
    
    // Increase combo multiplier over time
    if (!hasCollision) {
      data.comboMultiplier = Math.min(data.comboMultiplier + (deltaTime * 0.01), 3.0);
    }
    
    // Check state transitions
    this.checkStateTransitions();
    
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Add or subtract SP
   */
  addSP(amount: number): void {
    const previousSP = this.data.currentSP;
    this.data.currentSP = Math.max(0, Math.min(this.config.maxSP, this.data.currentSP + amount));
    
    // Trigger callback if changed significantly
    if (Math.abs(this.data.currentSP - previousSP) > 0.1) {
      if (this.onSPChanged) {
        this.onSPChanged(this.data.currentSP, this.data.maxSP);
      }
    }
  }
  
  /**
   * Set SP to specific value
   */
  setSP(value: number): void {
    this.data.currentSP = Math.max(0, Math.min(this.config.maxSP, value));
    
    if (this.onSPChanged) {
      this.onSPChanged(this.data.currentSP, this.data.maxSP);
    }
    
    this.checkStateTransitions();
  }
  
  /**
   * Get SP as percentage (0-1)
   */
  getPercentage(): number {
    return this.data.currentSP / this.data.maxSP;
  }
  
  /**
   * Check if SP is depleted (battle loss condition)
   */
  isDepleted(): boolean {
    return this.data.currentSP <= 0;
  }
  
  /**
   * Check if in critical state (low SP)
   */
  isCritical(): boolean {
    return this.data.currentSP < (this.data.maxSP * 0.2);
  }
  
  /**
   * Get current state
   */
  getState(): SPState {
    return this.data.state;
  }
  
  /**
   * Get distance gap to rival
   */
  getDistanceGap(): number {
    return this.data.distanceGap;
  }
  
  /**
   * Check if player is leading
   */
  isPlayerLeading(): boolean {
    return this.data.isLeading;
  }
  
  /**
   * Get combo multiplier
   */
  getComboMultiplier(): number {
    return this.data.comboMultiplier;
  }
  
  /**
   * Get current drain rate (SP per second)
   */
  getCurrentDrainRate(): number {
    return this.data.drainRate;
  }
  
  /**
   * Get estimated time until depletion at current drain rate
   */
  getTimeToDepletion(): number {
    if (this.data.drainRate <= 0) {
      return Infinity;
    }
    return this.data.currentSP / this.data.drainRate;
  }
  
  /**
   * Reset SP gauge to full
   */
  reset(): void {
    this.data.currentSP = this.config.maxSP;
    this.data.drainRate = this.config.baseDrainRate;
    this.data.state = SPState.NORMAL;
    this.data.distanceGap = 0;
    this.data.isLeading = false;
    this.data.comboMultiplier = 1.0;
    this.data.lastCollisionTime = -999;
    
    if (this.onSPChanged) {
      this.onSPChanged(this.data.currentSP, this.data.maxSP);
    }
    
    if (this.onStateChanged) {
      this.onStateChanged(SPState.NORMAL);
    }
  }
  
  /**
   * Set max SP (for different difficulty levels)
   */
  setMaxSP(maxSP: number): void {
    this.config.maxSP = maxSP;
    this.data.maxSP = maxSP;
    this.data.currentSP = Math.min(this.data.currentSP, maxSP);
    
    if (this.onSPChanged) {
      this.onSPChanged(this.data.currentSP, this.data.maxSP);
    }
  }
  
  /**
   * Apply temporary drain rate modifier
   */
  modifyDrainRate(multiplier: number, duration: number): void {
    const originalRate = this.data.drainRate;
    this.data.drainRate *= multiplier;
    
    // Reset after duration
    setTimeout(() => {
      this.data.drainRate = originalRate;
    }, duration * 1000);
  }
  
  /**
   * Register SP change callback
   */
  onSPChange(callback: (currentSP: number, maxSP: number) => void): void {
    this.onSPChanged = callback;
  }
  
  /**
   * Register SP depleted callback
   */
  onSPDeplete(callback: () => void): void {
    this.onSPDepleted = callback;
  }
  
  /**
   * Register state change callback
   */
  onStateChange(callback: (state: SPState) => void): void {
    this.onStateChanged = callback;
  }
  
  /**
   * Get gauge data for serialization/debugging
   */
  getData(): SPGaugeData {
    return { ...this.data };
  }
  
  /**
   * Set state and trigger callback
   */
  private setState(newState: SPState): void {
    if (this.data.state !== newState) {
      this.data.state = newState;
      
      if (this.onStateChanged) {
        this.onStateChanged(newState);
      }
      
      // Trigger depletion event
      if (newState === SPState.DEPLETED && this.onSPDepleted) {
        this.onSPDepleted();
      }
    }
  }
  
  /**
   * Check and update state based on current conditions
   */
  private checkStateTransitions(): void {
    const { data } = this;
    
    if (data.currentSP <= 0) {
      this.setState(SPState.DEPLETED);
    } else if (data.currentSP < data.maxSP * 0.2) {
      this.setState(SPState.CRITICAL);
    } else if (data.state === SPState.DEPLETED || data.state === SPState.CRITICAL) {
      this.setState(SPState.NORMAL);
    }
  }
}

export default SPGauge;
