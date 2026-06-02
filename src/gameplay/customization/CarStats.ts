/**
 * Car Stats - Vehicle performance statistics
 */

export interface BaseCarStats {
  acceleration: number;    // 0-1, how quickly car reaches top speed
  topSpeed: number;        // 0-1, maximum speed
  handling: number;        // 0-1, cornering ability
  stability: number;       // 0-1, high-speed stability
  spResistance: number;    // 0-1, SP drain resistance in battles
  braking: number;         // 0-1, braking performance
  grip: number;            // 0-1, tire grip level
}

export interface ModifiedCarStats extends BaseCarStats {
  // Calculated modifiers from parts
  accelerationBonus: number;
  topSpeedBonus: number;
  handlingBonus: number;
  stabilityBonus: number;
  spResistanceBonus: number;
  brakingBonus: number;
  gripBonus: number;
  
  // Final calculated values
  finalAcceleration: number;
  finalTopSpeed: number;
  finalHandling: number;
  finalStability: number;
  finalSPResistance: number;
  finalBraking: number;
  finalGrip: number;
}

export const DEFAULT_CAR_STATS: BaseCarStats = {
  acceleration: 0.5,
  topSpeed: 0.5,
  handling: 0.5,
  stability: 0.5,
  spResistance: 0.5,
  braking: 0.5,
  grip: 0.5,
};

export class CarStats {
  private base: BaseCarStats;
  private modifiers: Partial<BaseCarStats>;
  private isDirty: boolean;
  private cachedModified: ModifiedCarStats | null;

  constructor(baseStats: Partial<BaseCarStats> = {}) {
    this.base = { ...DEFAULT_CAR_STATS, ...baseStats };
    this.modifiers = {};
    this.isDirty = true;
    this.cachedModified = null;
  }

  /**
   * Apply a modifier to a stat
   */
  applyModifier(stat: keyof BaseCarStats, value: number): void {
    this.modifiers[stat] = (this.modifiers[stat] ?? 0) + value;
    this.isDirty = true;
  }

  /**
   * Set a modifier (replaces existing)
   */
  setModifier(stat: keyof BaseCarStats, value: number): void {
    this.modifiers[stat] = value;
    this.isDirty = true;
  }

  /**
   * Clear all modifiers
   */
  clearModifiers(): void {
    this.modifiers = {};
    this.isDirty = true;
    this.cachedModified = null;
  }

  /**
   * Get modified stats (with caching)
   */
  getModifiedStats(): ModifiedCarStats {
    if (!this.isDirty && this.cachedModified) {
      return this.cachedModified;
    }

    const result: ModifiedCarStats = {
      acceleration: this.base.acceleration,
      topSpeed: this.base.topSpeed,
      handling: this.base.handling,
      stability: this.base.stability,
      spResistance: this.base.spResistance,
      braking: this.base.braking,
      grip: this.base.grip,
      accelerationBonus: 0,
      topSpeedBonus: 0,
      handlingBonus: 0,
      stabilityBonus: 0,
      spResistanceBonus: 0,
      brakingBonus: 0,
      gripBonus: 0,
      finalAcceleration: 0,
      finalTopSpeed: 0,
      finalHandling: 0,
      finalStability: 0,
      finalSPResistance: 0,
      finalBraking: 0,
      finalGrip: 0,
    };

    // Apply modifiers and calculate finals
    for (const stat of Object.keys(this.base) as Array<keyof BaseCarStats>) {
      const bonus = this.modifiers[stat] ?? 0;
      result[`${stat}Bonus` as keyof ModifiedCarStats] = bonus as never;
      
      const finalValue = Math.max(0, Math.min(1, this.base[stat] + bonus));
      result[`final${this.capitalize(stat)}` as keyof ModifiedCarStats] = finalValue as never;
    }

    this.cachedModified = result;
    this.isDirty = false;
    
    return result;
  }

  /**
   * Get a specific base stat
   */
  getBaseStat(stat: keyof BaseCarStats): number {
    return this.base[stat];
  }

  /**
   * Get a specific final stat (with modifiers)
   */
  getFinalStat(stat: keyof BaseCarStats): number {
    return this.getModifiedStats()[`final${this.capitalize(stat)}` as keyof ModifiedCarStats] as number;
  }

  /**
   * Get stat as percentage string
   */
  getStatPercent(stat: keyof BaseCarStats): string {
    return `${Math.round(this.getFinalStat(stat) * 100)}%`;
  }

  /**
   * Compare with another car's stats
   */
  compare(other: CarStats): Record<string, number> {
    const comparison: Record<string, number> = {};
    const stats: Array<keyof BaseCarStats> = [
      'acceleration', 'topSpeed', 'handling', 
      'stability', 'spResistance', 'braking', 'grip'
    ];

    for (const stat of stats) {
      const diff = this.getFinalStat(stat) - other.getFinalStat(stat);
      comparison[stat] = diff;
    }

    return comparison;
  }

  /**
   * Reset to base stats
   */
  reset(): void {
    this.clearModifiers();
  }

  /**
   * Clone stats
   */
  clone(): CarStats {
    const cloned = new CarStats({ ...this.base });
    for (const [stat, value] of Object.entries(this.modifiers)) {
      cloned.setModifier(stat as keyof BaseCarStats, value);
    }
    return cloned;
  }

  /**
   * Serialize stats for save/load
   */
  serialize(): { base: BaseCarStats; modifiers: Partial<BaseCarStats> } {
    return {
      base: { ...this.base },
      modifiers: { ...this.modifiers },
    };
  }

  /**
   * Deserialize stats
   */
  static deserialize(data: { base: Partial<BaseCarStats>; modifiers?: Partial<BaseCarStats> }): CarStats {
    const stats = new CarStats(data.base);
    if (data.modifiers) {
      for (const [stat, value] of Object.entries(data.modifiers)) {
        stats.setModifier(stat as keyof BaseCarStats, value);
      }
    }
    return stats;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
