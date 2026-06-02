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

// Visual Part Types
export type VisualCategory = 
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
  category: VisualCategory | "bodyColor";
  cost: number;
  rarity: UpgradeRarity;
  meshId?: string;
  textureId?: string;
  colorHex?: string;
}

// Vinyl System Types
export interface VinylLayer {
  id: string;
  texture: string;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  color: string;
  opacity: number;
}

export interface VinylSet {
  id: string;
  name: string;
  layers: VinylLayer[];
}

// Car Build Types
export interface InstalledUpgrades {
  engine?: UpgradePart;
  transmission?: UpgradePart;
  suspension?: UpgradePart;
  tires?: UpgradePart;
  weightReduction?: UpgradePart;
  cooling?: UpgradePart;
  turbo?: UpgradePart;
  intake?: UpgradePart;
  exhaust?: UpgradePart;
  ecu?: UpgradePart;
}

export interface InstalledVisuals {
  bodyColor?: string;
  vinyl?: VinylLayer[];
  frontBumper?: VisualPart | null;
  rearBumper?: VisualPart | null;
  sideSkirts?: VisualPart | null;
  spoiler?: VisualPart | null;
  hood?: VisualPart | null;
  wheels?: VisualPart | null;
  exhaust?: VisualPart | null;
}

export interface CarBuild {
  carId: string;
  installedUpgrades: InstalledUpgrades;
  installedVisuals: InstalledVisuals;
  savedAt?: Date;
}

// Customization UI State
export type CustomizationState =
  | "main"
  | "performance"
  | "visual"
  | "vinyl"
  | "colorPicker"
  | "confirm";

// Stat Comparison Types
export interface StatComparison {
  stat: keyof CarStats;
  before: number;
  after: number;
  delta: number;
}

// Color Finish Types
export type ColorFinishType = "solid" | "metallic" | "pearlescent" | "matte";

export interface ColorOption {
  hex: string;
  name: string;
  finishType: ColorFinishType;
}
