/**
 * Visual Mod UI
 * UI for choosing visual parts: bumpers, skirts, spoilers, hoods, wheels, exhausts
 */

import { VisualPart, VisualCategory, CarBuild, InstalledVisuals } from "../types/car.types";
import { CarPreview } from "./CarPreview";

// Sample visual parts catalog
export const VISUAL_PARTS: VisualPart[] = [
  // Front Bumpers
  { id: "fb_stock", name: "Stock Front Bumper", category: "frontBumper", cost: 0, rarity: "common" },
  { id: "fb_sport", name: "Sport Front Bumper", category: "frontBumper", cost: 800, rarity: "common", meshId: "fb_sport_mesh" },
  { id: "fb_aggressive", name: "Aggressive Aero Bumper", category: "frontBumper", cost: 1500, rarity: "rare", meshId: "fb_aggressive_mesh" },
  
  // Rear Bumpers
  { id: "rb_stock", name: "Stock Rear Bumper", category: "rearBumper", cost: 0, rarity: "common" },
  { id: "rb_diffuser", name: "Diffuser Rear Bumper", category: "rearBumper", cost: 900, rarity: "common", meshId: "rb_diffuser_mesh" },
  
  // Side Skirts
  { id: "ss_stock", name: "Stock Side Skirts", category: "sideSkirts", cost: 0, rarity: "common" },
  { id: "ss_racing", name: "Racing Side Skirts", category: "sideSkirts", cost: 700, rarity: "common", meshId: "ss_racing_mesh" },
  
  // Spoilers
  { id: "sp_none", name: "No Spoiler", category: "spoiler", cost: 0, rarity: "common" },
  { id: "sp_lip", name: "Trunk Lip Spoiler", category: "spoiler", cost: 500, rarity: "common", meshId: "sp_lip_mesh" },
  { id: "sp_wing", name: "GT Wing", category: "spoiler", cost: 1200, rarity: "rare", meshId: "sp_wing_mesh" },
  { id: "sp_gt", name: "Carbon GT Wing", category: "spoiler", cost: 2500, rarity: "legendary", meshId: "sp_gt_mesh" },
  
  // Hoods
  { id: "hd_stock", name: "Stock Hood", category: "hood", cost: 0, rarity: "common" },
  { id: "hd_vented", name: "Vented Hood", category: "hood", cost: 1000, rarity: "common", meshId: "hd_vented_mesh" },
  { id: "hd_carbon", name: "Carbon Fiber Hood", category: "hood", cost: 2200, rarity: "rare", meshId: "hd_carbon_mesh" },
  
  // Wheels
  { id: "wh_stock", name: "Stock Wheels", category: "wheels", cost: 0, rarity: "common" },
  { id: "wh_sport", name: "Sport Alloy Wheels", category: "wheels", cost: 1500, rarity: "common", meshId: "wh_sport_mesh" },
  { id: "wh_racing", name: "Racing Wheels", category: "wheels", cost: 2800, rarity: "rare", meshId: "wh_racing_mesh" },
  { id: "wh_forged", name: "Forged Wheels", category: "wheels", cost: 4500, rarity: "legendary", meshId: "wh_forged_mesh" },
  
  // Exhausts
  { id: "ex_stock", name: "Stock Exhaust", category: "exhaust", cost: 0, rarity: "common" },
  { id: "ex_dual", name: "Dual Exit Exhaust", category: "exhaust", cost: 600, rarity: "common", meshId: "ex_dual_mesh" },
  { id: "ex_quad", name: "Quad Exit Exhaust", category: "exhaust", cost: 1100, rarity: "rare", meshId: "ex_quad_mesh" },
  { id: "ex_titanium", name: "Titanium Track Exhaust", category: "exhaust", cost: 2000, rarity: "legendary", meshId: "ex_titanium_mesh" }
];

export class VisualModUI {
  private build: CarBuild;
  private preview: CarPreview;
  private selectedCategory: VisualCategory | null = null;
  private hoveredPart: VisualPart | null = null;
  private selectedPart: VisualPart | null = null;

  constructor(build: CarBuild, preview: CarPreview) {
    this.build = build;
    this.preview = preview;
  }

  /**
   * Get available parts for a specific visual category
   */
  getAvailableParts(category: VisualCategory): VisualPart[] {
    return VISUAL_PARTS.filter(part => part.category === category);
  }

  /**
   * Get all visual categories
   */
  getCategories(): VisualCategory[] {
    return ["frontBumper", "rearBumper", "sideSkirts", "spoiler", "hood", "wheels", "exhaust"];
  }

  /**
   * Get currently installed visual part for a category
   */
  getInstalledPart(category: VisualCategory): VisualPart | undefined {
    return this.build.installedVisuals[category as keyof InstalledVisuals] as VisualPart | undefined;
  }

  /**
   * Preview a visual part on the car
   */
  previewVisual(part: VisualPart): void {
    this.hoveredPart = part;
    this.preview.applyVisualPart(part);
  }

  /**
   * Select a part for potential installation
   */
  selectPart(part: VisualPart): void {
    this.selectedPart = part;
    this.preview.applyVisualPart(part);
  }

  /**
   * Confirm and install the visual part
   */
  confirmVisual(part: VisualPart): void {
    this.build.installedVisuals[part.category as keyof InstalledVisuals] = part;
    this.preview.commitPreview();
    this.selectedPart = null;
    this.hoveredPart = null;
  }

  /**
   * Clear preview and restore original parts
   */
  clearPreview(): void {
    this.preview.clearPreview();
    this.hoveredPart = null;
    
    // Re-apply installed visuals
    Object.entries(this.build.installedVisuals).forEach(([, part]) => {
      if (part && typeof part === 'object' && 'meshId' in part) {
        this.preview.applyVisualPart(part as VisualPart);
      }
    });
  }

  /**
   * Set the selected category and focus camera
   */
  setSelectedCategory(category: VisualCategory): void {
    this.selectedCategory = category;
    this.selectedPart = null;
    this.preview.focusSlot(category as any);
  }

  /**
   * Get the currently selected category
   */
  getSelectedCategory(): VisualCategory | null {
    return this.selectedCategory;
  }

  /**
   * Get the currently hovered part
   */
  getHoveredPart(): VisualPart | null {
    return this.hoveredPart;
  }

  /**
   * Get the currently selected part
   */
  getSelectedPart(): VisualPart | null {
    return this.selectedPart;
  }

  /**
   * Get total cost of all installed visual parts
   */
  getTotalCost(): number {
    let total = 0;
    Object.values(this.build.installedVisuals).forEach(part => {
      if (part && typeof part === 'object' && 'cost' in part) {
        total += (part as VisualPart).cost || 0;
      }
    });
    return total;
  }

  /**
   * Remove a visual part from a category
   */
  removeVisual(category: VisualCategory): void {
    const key = category as keyof InstalledVisuals;
    delete this.build.installedVisuals[key];
    
    // Reset preview to stock
    const stockPart = VISUAL_PARTS.find(p => p.category === category && p.cost === 0);
    if (stockPart) {
      this.preview.applyVisualPart(stockPart);
    }
  }
}
