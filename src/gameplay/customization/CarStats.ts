/**
 * Car Stats System - Tokyo Xtreme Racer Style
 * Defines vehicle performance attributes and calculations
 */

export interface CarStatsBase {
  /** Top speed multiplier (base: 1.0) */
  topSpeed: number;
  /** Acceleration rate (higher = faster acceleration) */
  acceleration: number;
  /** Handling coefficient (0-1, higher = better cornering) */
  handling: number;
  /** Stability at high speeds (0-1) */
  stability: number;
  /** SP resistance in battles (0-1, reduces SP drain) */
  spResistance: number;
  /** Grip level (0-1) */
  grip: number;
  /** Weight class (affects collision physics) */
  weightClass: 'light' | 'medium' | 'heavy';
}

export interface CarStatsModified extends CarStatsBase {
  /** Modified top speed after parts */
  modifiedTopSpeed: number;
  /** Modified acceleration after parts */
  modifiedAcceleration: number;
  /** Modified handling after parts */
  modifiedHandling: number;
  /** Modified stability after parts */
  modifiedStability: number;
  /** Modified SP resistance after parts */
  modifiedSPResistance: number;
  /** Modified grip after parts */
  modifiedGrip: number;
}

export const DEFAULT_CAR_STATS: CarStatsBase = {
  topSpeed: 1.0,
  acceleration: 0.5,
  handling: 0.5,
  stability: 0.5,
  spResistance: 0.5,
  grip: 0.7,
  weightClass: 'medium',
};

// Predefined car stat templates
export const CAR_TEMPLATES: Record<string, CarStatsBase> = {
  // Sports Cars
  'supra_mk4': {
    topSpeed: 1.15,
    acceleration: 0.85,
    handling: 0.65,
    stability: 0.75,
    spResistance: 0.7,
    grip: 0.75,
    weightClass: 'medium',
  },
  'skyline_gtr_r34': {
    topSpeed: 1.1,
    acceleration: 0.9,
    handling: 0.7,
    stability: 0.8,
    spResistance: 0.75,
    grip: 0.8,
    weightClass: 'medium',
  },
  'nsx_nc1': {
    topSpeed: 1.2,
    acceleration: 0.95,
    handling: 0.85,
    stability: 0.7,
    spResistance: 0.65,
    grip: 0.85,
    weightClass: 'light',
  },
  'rx7_fd': {
    topSpeed: 1.1,
    acceleration: 0.88,
    handling: 0.8,
    stability: 0.65,
    spResistance: 0.6,
    grip: 0.78,
    weightClass: 'light',
  },
  
  // Tuner Cars
  'silvia_s15': {
    topSpeed: 0.9,
    acceleration: 0.75,
    handling: 0.75,
    stability: 0.6,
    spResistance: 0.55,
    grip: 0.72,
    weightClass: 'light',
  },
  'civic_type_r': {
    topSpeed: 0.85,
    acceleration: 0.8,
    handling: 0.78,
    stability: 0.55,
    spResistance: 0.5,
    grip: 0.75,
    weightClass: 'light',
  },
  'lancer_evo_x': {
    topSpeed: 0.95,
    acceleration: 0.85,
    handling: 0.82,
    stability: 0.7,
    spResistance: 0.6,
    grip: 0.8,
    weightClass: 'medium',
  },
  
  // Classic
  'ae86_trueno': {
    topSpeed: 0.7,
    acceleration: 0.6,
    handling: 0.85,
    stability: 0.5,
    spResistance: 0.45,
    grip: 0.65,
    weightClass: 'light',
  },
  
  // Muscle
  'challenger_hellcat': {
    topSpeed: 1.05,
    acceleration: 0.95,
    handling: 0.5,
    stability: 0.7,
    spResistance: 0.65,
    grip: 0.6,
    weightClass: 'heavy',
  },
  
  // Default
  'default': DEFAULT_CAR_STATS,
};

export class CarStatsSystem {
  private baseStats: CarStatsBase;
  private modifiers: {
    engine: number;
    turbo: number;
    tires: number;
    suspension: number;
    aero: number;
    weightReduction: number;
  };
  
  constructor(carModel: string = 'default') {
    this.baseStats = { ...CAR_TEMPLATES[carModel] ?? DEFAULT_CAR_STATS };
    this.modifiers = {
      engine: 0,
      turbo: 0,
      tires: 0,
      suspension: 0,
      aero: 0,
      weightReduction: 0,
    };
  }
  
  /**
   * Get current stats with all modifiers applied
   */
  getModifiedStats(): CarStatsModified {
    const stats = { ...this.baseStats };
    
    // Apply engine modifier (affects acceleration and top speed)
    stats.acceleration += this.modifiers.engine * 0.05;
    stats.topSpeed += this.modifiers.engine * 0.03;
    
    // Apply turbo modifier (affects acceleration and top speed more)
    stats.acceleration += this.modifiers.turbo * 0.08;
    stats.topSpeed += this.modifiers.turbo * 0.05;
    
    // Apply tire modifier (affects grip and handling)
    stats.grip += this.modifiers.tires * 0.06;
    stats.handling += this.modifiers.tires * 0.04;
    
    // Apply suspension modifier (affects handling and stability)
    stats.handling += this.modifiers.suspension * 0.07;
    stats.stability += this.modifiers.suspension * 0.05;
    
    // Apply aero modifier (affects stability and high-speed handling)
    stats.stability += this.modifiers.aero * 0.08;
    stats.handling += this.modifiers.aero * 0.03;
    
    // Apply weight reduction (affects acceleration and handling)
    stats.acceleration += this.modifiers.weightReduction * 0.04;
    stats.handling += this.modifiers.weightReduction * 0.03;
    
    // Clamp values
    return {
      ...stats,
      modifiedTopSpeed: Math.max(0.5, Math.min(2.0, stats.topSpeed)),
      modifiedAcceleration: Math.max(0.1, Math.min(1.0, stats.acceleration)),
      modifiedHandling: Math.max(0.1, Math.min(1.0, stats.handling)),
      modifiedStability: Math.max(0.1, Math.min(1.0, stats.stability)),
      modifiedSPResistance: Math.max(0.1, Math.min(1.0, stats.spResistance)),
      modifiedGrip: Math.max(0.1, Math.min(1.0, stats.grip)),
    };
  }
  
  /**
   * Get base stats without modifiers
   */
  getBaseStats(): CarStatsBase {
    return { ...this.baseStats };
  }
  
  /**
   * Set modifier level for a part category (0-5)
   */
  setModifier(category: keyof typeof this.modifiers, level: number): void {
    this.modifiers[category] = Math.max(0, Math.min(5, level));
  }
  
  /**
   * Get modifier level for a part category
   */
  getModifier(category: keyof typeof this.modifiers): number {
    return this.modifiers[category];
  }
  
  /**
   * Reset all modifiers to stock
   */
  resetToStock(): void {
    this.modifiers = {
      engine: 0,
      turbo: 0,
      tires: 0,
      suspension: 0,
      aero: 0,
      weightReduction: 0,
    };
  }
  
  /**
   * Calculate performance rating (0-100)
   */
  calculatePerformanceRating(): number {
    const stats = this.getModifiedStats();
    
    const weightedSum = 
      stats.modifiedTopSpeed * 25 +
      stats.modifiedAcceleration * 25 +
      stats.modifiedHandling * 20 +
      stats.modifiedStability * 15 +
      stats.modifiedGrip * 15;
    
    return Math.round(weightedSum * 50); // Scale to 0-100
  }
  
  /**
   * Get strengths and weaknesses
   */
  analyzePerformance(): {
    strengths: string[];
    weaknesses: string[];
    balanced: string[];
  } {
    const stats = this.getModifiedStats();
    const thresholds = { strong: 0.75, weak: 0.4 };
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const balanced: string[] = [];
    
    const categories = [
      { name: 'Top Speed', value: stats.modifiedTopSpeed / 2.0 },
      { name: 'Acceleration', value: stats.modifiedAcceleration },
      { name: 'Handling', value: stats.modifiedHandling },
      { name: 'Stability', value: stats.modifiedStability },
      { name: 'Grip', value: stats.modifiedGrip },
      { name: 'SP Resistance', value: stats.modifiedSPResistance },
    ];
    
    for (const cat of categories) {
      if (cat.value >= thresholds.strong) {
        strengths.push(cat.name);
      } else if (cat.value <= thresholds.weak) {
        weaknesses.push(cat.name);
      } else {
        balanced.push(cat.name);
      }
    }
    
    return { strengths, weaknesses, balanced };
  }
  
  /**
   * Compare with another car's stats
   */
  compareWith(other: CarStatsSystem): {
    category: string;
    thisValue: number;
    otherValue: number;
    difference: number;
  }[] {
    const myStats = this.getModifiedStats();
    const otherStats = other.getModifiedStats();
    
    return [
      {
        category: 'Top Speed',
        thisValue: myStats.modifiedTopSpeed,
        otherValue: otherStats.modifiedTopSpeed,
        difference: myStats.modifiedTopSpeed - otherStats.modifiedTopSpeed,
      },
      {
        category: 'Acceleration',
        thisValue: myStats.modifiedAcceleration,
        otherValue: otherStats.modifiedAcceleration,
        difference: myStats.modifiedAcceleration - otherStats.modifiedAcceleration,
      },
      {
        category: 'Handling',
        thisValue: myStats.modifiedHandling,
        otherValue: otherStats.modifiedHandling,
        difference: myStats.modifiedHandling - otherStats.modifiedHandling,
      },
      {
        category: 'Stability',
        thisValue: myStats.modifiedStability,
        otherValue: otherStats.modifiedStability,
        difference: myStats.modifiedStability - otherStats.modifiedStability,
      },
      {
        category: 'Grip',
        thisValue: myStats.modifiedGrip,
        otherValue: otherStats.modifiedGrip,
        difference: myStats.modifiedGrip - otherStats.modifiedGrip,
      },
      {
        category: 'SP Resistance',
        thisValue: myStats.modifiedSPResistance,
        otherValue: otherStats.modifiedSPResistance,
        difference: myStats.modifiedSPResistance - otherStats.modifiedSPResistance,
      },
    ];
  }
  
  /**
   * Export stats to JSON
   */
  toJSON(): { baseStats: CarStatsBase; modifiers: typeof this.modifiers } {
    return {
      baseStats: this.baseStats,
      modifiers: { ...this.modifiers },
    };
  }
  
  /**
   * Import stats from JSON
   */
  fromJSON(data: { baseStats: CarStatsBase; modifiers: typeof this.modifiers }): void {
    this.baseStats = { ...data.baseStats };
    this.modifiers = { ...data.modifiers };
  }
}

export default CarStatsSystem;
