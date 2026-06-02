/**
 * Customization System Index
 * Export all customization UI components
 */

// Types (re-export from car.types)
export type {
  CustomizationState,
  VisualSlot,
  VisualCategory,
  VisualPart,
  VinylLayer,
  VinylLayerSave,
  VinylSet,
  CarBuild,
  CarBuildSave,
  GarageSave,
  InstalledUpgrades,
  InstalledVisuals,
  StatComparison,
  ColorFinishType,
  ColorOption
} from "../types/car.types";

// Car Preview Renderer
export { CarPreview } from "./CarPreview";
export type { IRenderer } from "./CarPreview";

// Performance Upgrade UI
export { PerformanceUpgradeUI } from "./PerformanceUpgradeUI";

// Visual Mod UI
export { VisualModUI, VISUAL_PARTS } from "./VisualModUI";

// Vinyl Editor
export { VinylEditor, VINYL_TEXTURES } from "./VinylEditor";

// Color Picker UI
export { ColorPickerUI, COLOR_OPTIONS } from "./ColorPickerUI";

// Stat Comparison
export {
  compareStats,
  formatDelta,
  getDeltaClass,
  calculatePerformanceScore,
  getPerformanceRating,
  predictBattleImpact,
  createStatTableData
} from "./StatComparison";
export type { BattleImpact, StatTableData } from "./StatComparison";

// Main Controller
export { CustomizationController } from "./CustomizationController";
export type { CustomizationControllerOptions } from "./CustomizationController";

// Garage System
export { GarageManager } from "../garage/GarageManager";
