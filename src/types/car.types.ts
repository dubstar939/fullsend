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

// Upgrade System Types
export type UpgradeCategory =
  | "engine"
  | "turbo"
  | "intake"
  | "exhaust"
  | "transmission"
  | "suspension"
  | "tires"
  | "weightReduction"
  | "cooling"
  | "ecu";

export type UpgradeRarity = "common" | "rare" | "legendary";

export interface UpgradePart {
  id: string;
  name: string;
  category: UpgradeCategory;
  level: number;
  cost: number;
  statModifiers: Partial<CarStats>;
  rarity: UpgradeRarity;
}

// Visual Mod System Types
export type VisualSlot =
  | "bodyColor"
  | "vinyl"
  | "frontBumper"
  | "rearBumper"
  | "sideSkirts"
  | "spoiler"
  | "hood"
  | "wheels"
  | "exhaust";

export interface VisualPart {
  id: string;
  name: string;
  slot: VisualSlot;

  // Mesh overrides
  meshOverride?: string; // swaps model part

  // Texture overrides
  textureOverride?: string; // vinyls, decals

  // Color override
  color?: string; // hex or RGB

  // Optional metadata
  rarity?: UpgradeRarity;
}

// Car Build System - combines upgrades and visuals
export interface CarBuild {
  carId: string;
  installedUpgrades: Record<UpgradeCategory, UpgradePart | null>;
  installedVisuals: Record<VisualSlot, VisualPart | null>;
}
