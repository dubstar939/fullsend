/**
 * Car Types and Interfaces
 * Type definitions for car definitions, stats, and customization
 */

export interface CarStats {
  topSpeed: number;
  acceleration: number;
  handling: number;
  grip: number;
  stability: number;
  spResistance: number;
}

export interface UpgradeSlots {
  engine: boolean;
  transmission: boolean;
  suspension: boolean;
  tires: boolean;
  weightReduction: boolean;
  cooling: boolean;
}

export interface VisualSlots {
  bodyColor: boolean;
  vinyl: boolean;
  frontBumper: boolean;
  rearBumper: boolean;
  sideSkirts: boolean;
  spoiler: boolean;
  hood: boolean;
  wheels: boolean;
  exhaust: boolean;
}

export interface CarDefinition {
  id: string;
  name: string;
  manufacturer: string;
  year: number;
  drivetrain: 'FWD' | 'RWD' | 'AWD';
  weightClass: 'light' | 'medium' | 'heavy';
  baseStats: CarStats;
  upgradeSlots: UpgradeSlots;
  visualSlots: VisualSlots;
}
