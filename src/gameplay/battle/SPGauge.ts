/**
 * SP Gauge Component - Tokyo Xtreme Racer Style Battle System
 * Manages Spirit Points (SP) for highway duels
 */

export interface SPGaugeConfig {
  maxSP: number;
  drainRate: number;           // SP drain per second at base distance
  distanceDrainMultiplier: number; // Multiplier based on distance gap
  collisionPenalty: number;    // SP lost on wall/traffic collision
  recoveryRate: number;        // SP recovery when leading
  minSPThreshold: number;      // SP threshold for battle end
}

export const DEFAULT_SP_CONFIG: SPGaugeConfig = {
  maxSP: 1000,
  drainRate: 2.5,
  distanceDrainMultiplier: 0.15,
  collisionPenalty: 150,
  recoveryRate: 5.0,
  minSPThreshold: 0,
};

export class SPGauge {
  public currentSP: number;
  public maxSP: number;
  
  private config: SPGaugeConfig;
  private isDepleting: boolean;
  private lastCollisionTime: number;
  private collisionCooldown: number;

  constructor(config: Partial<SPGaugeConfig> = {}) {
    this.config = { ...DEFAULT_SP_CONFIG, ...config };
    this.maxSP = this.config.maxSP;
    this.currentSP = this.maxSP;
    this.isDepleting = false;
    this.lastCollisionTime = -Infinity;
    this.collisionCooldown = 0.5; // Seconds between collision penalties
  }

  /**
   * Update SP based on distance gap and battle state
   * @param deltaTime - Time elapsed in seconds
   * @param distanceGap - Distance to rival (positive = behind, negative = ahead)
   * @param isLeading - Whether player is ahead of rival
   */
  update(deltaTime: number, distanceGap: number, isLeading: boolean): void {
    if (this.isDepleting) {
      let drainAmount = this.config.drainRate * deltaTime;

      // Apply distance-based drain
      if (distanceGap > 0) {
        // Behind rival - extra drain
        const distancePenalty = distanceGap * this.config.distanceDrainMultiplier;
        drainAmount += distancePenalty * deltaTime;
      } else if (distanceGap < 0 && isLeading) {
        // Ahead of rival - recover SP
        const recoveryAmount = this.config.recoveryRate * deltaTime;
        this.currentSP = Math.min(this.currentSP + recoveryAmount, this.maxSP);
        return;
      }

      this.currentSP = Math.max(this.currentSP - drainAmount, this.config.minSPThreshold);
    }
  }

  /**
   * Apply collision penalty (wall hit, traffic collision)
   */
  applyCollisionPenalty(currentTime: number): void {
    if (currentTime - this.lastCollisionTime >= this.collisionCooldown) {
      this.currentSP = Math.max(
        this.currentSP - this.config.collisionPenalty,
        this.config.minSPThreshold
      );
      this.lastCollisionTime = currentTime;
    }
  }

  /**
   * Set gauge to depleting mode (battle active)
   */
  startDepleting(): void {
    this.isDepleting = true;
  }

  /**
   * Stop depleting (battle ended or paused)
   */
  stopDepleting(): void {
    this.isDepleting = false;
  }

  /**
   * Reset SP to maximum
   */
  reset(): void {
    this.currentSP = this.maxSP;
    this.isDepleting = false;
    this.lastCollisionTime = -Infinity;
  }

  /**
   * Check if SP is depleted (battle lost)
   */
  isDepleted(): boolean {
    return this.currentSP <= this.config.minSPThreshold;
  }

  /**
   * Get SP as percentage (0-1)
   */
  getPercentage(): number {
    return this.currentSP / this.maxSP;
  }

  /**
   * Add SP (for power-ups or bonuses)
   */
  add(amount: number): void {
    this.currentSP = Math.min(this.currentSP + amount, this.maxSP);
  }

  /**
   * Remove SP directly
   */
  remove(amount: number): void {
    this.currentSP = Math.max(this.currentSP - amount, this.config.minSPThreshold);
  }

  /**
   * Get current SP value
   */
  getCurrent(): number {
    return this.currentSP;
  }

  /**
   * Get configuration
   */
  getConfig(): SPGaugeConfig {
    return this.config;
  }
}
