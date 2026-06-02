/**
 * Customization Flow Controller
 * Main controller that ties all customization UI components together
 */

import { 
  CustomizationState, 
  CarBuild, 
  CarStats,
  UpgradeCategory,
  VisualCategory
} from "../types/car.types";
import { CarPreview, IRenderer } from "./CarPreview";
import { PerformanceUpgradeUI } from "./PerformanceUpgradeUI";
import { VisualModUI } from "./VisualModUI";
import { VinylEditor } from "./VinylEditor";
import { ColorPickerUI } from "./ColorPickerUI";
import { compareStats } from "./StatComparison";

export interface CustomizationControllerOptions {
  renderer: IRenderer;
  initialBuild: CarBuild;
  baseStats: CarStats;
}

export class CustomizationController {
  state: CustomizationState = "main";
  
  private preview: CarPreview;
  private perfUI: PerformanceUpgradeUI;
  private visualUI: VisualModUI;
  private vinylUI: VinylEditor;
  private colorUI: ColorPickerUI;
  
  private build: CarBuild;
  private originalBuild: CarBuild;
  private baseStats: CarStats;
  
  // Callbacks
  onStateChange?: (newState: CustomizationState) => void;
  onBuildModified?: (build: CarBuild) => void;
  onConfirm?: (build: CarBuild) => void;
  onCancel?: () => void;

  constructor(options: CustomizationControllerOptions) {
    this.build = { ...options.initialBuild };
    this.originalBuild = JSON.parse(JSON.stringify(options.initialBuild));
    this.baseStats = options.baseStats;
    
    // Initialize subsystems
    this.preview = new CarPreview(options.renderer);
    this.perfUI = new PerformanceUpgradeUI(this.build);
    this.visualUI = new VisualModUI(this.build, this.preview);
    this.vinylUI = new VinylEditor();
    this.colorUI = new ColorPickerUI(this.preview, this.build);
    
    // Load initial car model
    this.preview.setCarModel(options.initialBuild.carId);
    
    // Apply existing visuals
    this.applyExistingVisuals();
  }

  /**
   * Change the current UI state
   */
  setState(newState: CustomizationState): void {
    const oldState = this.state;
    this.state = newState;
    
    // Handle state transitions
    this.handleStateTransition(oldState, newState);
    
    // Notify listeners
    if (this.onStateChange) {
      this.onStateChange(newState);
    }
  }

  /**
   * Get the current UI state
   */
  getState(): CustomizationState {
    return this.state;
  }

  /**
   * Get the performance upgrade UI
   */
  getPerformanceUI(): PerformanceUpgradeUI {
    return this.perfUI;
  }

  /**
   * Get the visual mod UI
   */
  getVisualUI(): VisualModUI {
    return this.visualUI;
  }

  /**
   * Get the vinyl editor
   */
  getVinylEditor(): VinylEditor {
    return this.vinylUI;
  }

  /**
   * Get the color picker UI
   */
  getColorPicker(): ColorPickerUI {
    return this.colorUI;
  }

  /**
   * Get the car preview
   */
  getPreview(): CarPreview {
    return this.preview;
  }

  /**
   * Get current build
   */
  getBuild(): CarBuild {
    return this.build;
  }

  /**
   * Get stat comparison for current preview
   */
  getStatComparison() {
    const currentStats = this.getCurrentStats();
    const previewStats = this.getPreviewStats();
    return compareStats(currentStats, previewStats);
  }

  /**
   * Confirm all changes and save the build
   */
  confirmChanges(): void {
    // Commit preview
    this.preview.commitPreview();
    
    // Update build timestamp
    this.build.savedAt = new Date();
    
    // Notify listeners
    if (this.onConfirm) {
      this.onConfirm(this.build);
    }
    
    if (this.onBuildModified) {
      this.onBuildModified(this.build);
    }
    
    // Reset to main menu
    this.setState("main");
  }

  /**
   * Undo all changes and restore original build
   */
  undoChanges(): void {
    // Restore original build
    this.build = JSON.parse(JSON.stringify(this.originalBuild));
    
    // Reset preview
    this.preview.clearPreview();
    this.preview.setCarModel(this.build.carId);
    
    // Re-apply existing visuals
    this.applyExistingVisuals();
    
    // Reset vinyl editor
    this.vinylUI.clearAllLayers();
    
    // Notify listeners
    if (this.onCancel) {
      this.onCancel();
    }
    
    // Reset to main menu
    this.setState("main");
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.build) !== JSON.stringify(this.originalBuild);
  }

  /**
   * Get total cost of all modifications
   */
  getTotalCost(): number {
    let total = 0;
    
    // Add up performance parts cost
    Object.values(this.build.installedUpgrades).forEach(part => {
      if (part) {
        total += part.cost;
      }
    });
    
    // Add up visual parts cost
    Object.values(this.build.installedVisuals).forEach(part => {
      if (part && typeof part === 'object' && 'cost' in part) {
        total += (part as any).cost;
      }
    });
    
    return total;
  }

  /**
   * Apply existing visual parts to preview
   */
  private applyExistingVisuals(): void {
    const visuals = this.build.installedVisuals;
    
    // Apply body color
    if (visuals.bodyColor) {
      this.preview.setColor(visuals.bodyColor);
    }
    
    // Apply visual parts
    Object.values(visuals).forEach(part => {
      if (part && typeof part === 'object' && 'meshId' in part) {
        this.preview.applyVisualPart(part as any);
      }
    });
    
    // Apply vinyl layers if present
    if (visuals.vinyl && visuals.vinyl.length > 0) {
      // Vinyl rendering would be handled by the renderer
      console.log(`Loading ${visuals.vinyl.length} vinyl layers`);
    }
  }

  /**
   * Handle state transitions
   */
  private handleStateTransition(oldState: CustomizationState, newState: CustomizationState): void {
    // Clear previews when leaving certain states
    if (oldState === "performance" || oldState === "visual" || oldState === "colorPicker") {
      if (newState !== oldState) {
        // Could clear temporary previews here
      }
    }
    
    // Reset camera when entering main state
    if (newState === "main") {
      this.preview.resetCamera();
    }
  }

  /**
   * Get current stats with installed upgrades
   */
  private getCurrentStats(): CarStats {
    const upgrades = Object.values(this.build.installedUpgrades).filter((p): p is any => p !== undefined);
    
    let stats = { ...this.baseStats };
    
    for (const upgrade of upgrades) {
      for (const [key, value] of Object.entries(upgrade.statModifiers)) {
        const statKey = key as keyof CarStats;
        stats[statKey] = (stats[statKey] || 0) + ((value as number) || 0);
      }
    }
    
    return stats;
  }

  /**
   * Get preview stats (same as current for now, could include pending changes)
   */
  private getPreviewStats(): CarStats {
    return this.getCurrentStats();
  }

  /**
   * Navigate to performance category
   */
  selectPerformanceCategory(category: UpgradeCategory): void {
    this.setState("performance");
    this.perfUI.setSelectedCategory(category);
  }

  /**
   * Navigate to visual category
   */
  selectVisualCategory(category: VisualCategory): void {
    this.setState("visual");
    this.visualUI.setSelectedCategory(category);
  }

  /**
   * Enter vinyl editor mode
   */
  enterVinylEditor(): void {
    this.setState("vinyl");
  }

  /**
   * Enter color picker mode
   */
  enterColorPicker(): void {
    this.setState("colorPicker");
  }
}
