/**
 * Performance Upgrade UI
 * Tuning shop screen for selecting and installing performance parts
 */

import { 
  UpgradePart, 
  UpgradeCategory, 
  CarStats, 
  CarBuild,
  InstalledUpgrades,
  StatComparison 
} from "../types/car.types";
import { getUpgradesByCategory, calculateFinalStats } from "../types/UpgradeSystem";

export class PerformanceUpgradeUI {
  private build: CarBuild;
  private tempBuild: CarBuild | null = null;
  private selectedCategory: UpgradeCategory | null = null;
  private hoveredPart: UpgradePart | null = null;
  private selectedPart: UpgradePart | null = null;

  constructor(build: CarBuild) {
    this.build = build;
  }

  /**
   * Get available parts for a specific category
   */
  getAvailableParts(category: UpgradeCategory): UpgradePart[] {
    return getUpgradesByCategory(category);
  }

  /**
   * Get all available categories that have parts
   */
  getAvailableCategories(): UpgradeCategory[] {
    const categories: Set<UpgradeCategory> = new Set();
    const allParts = [
      ...getUpgradesByCategory("engine"),
      ...getUpgradesByCategory("turbo"),
      ...getUpgradesByCategory("intake"),
      ...getUpgradesByCategory("exhaust"),
      ...getUpgradesByCategory("transmission"),
      ...getUpgradesByCategory("suspension"),
      ...getUpgradesByCategory("tires"),
      ...getUpgradesByCategory("weightReduction"),
      ...getUpgradesByCategory("cooling"),
      ...getUpgradesByCategory("ecu")
    ];

    allParts.forEach(part => categories.add(part.category));
    return Array.from(categories);
  }

  /**
   * Get currently installed part for a category
   */
  getInstalledPart(category: UpgradeCategory): UpgradePart | undefined {
    return this.build.installedUpgrades[category as keyof InstalledUpgrades];
  }

  /**
   * Preview a part without installing it
   */
  previewPart(part: UpgradePart): void {
    this.hoveredPart = part;
    this.tempBuild = this.createBuildWithUpgrade(part);
  }

  /**
   * Select a part for potential installation
   */
  selectPart(part: UpgradePart): void {
    this.selectedPart = part;
    this.tempBuild = this.createBuildWithUpgrade(part);
  }

  /**
   * Confirm and install the selected part
   */
  confirmPart(part: UpgradePart): void {
    this.installUpgrade(part);
    this.tempBuild = null;
    this.selectedPart = null;
    this.hoveredPart = null;
  }

  /**
   * Clear preview
   */
  clearPreview(): void {
    this.tempBuild = null;
    this.hoveredPart = null;
  }

  /**
   * Get stats comparison between current and preview builds
   */
  getStatComparison(): StatComparison[] {
    const currentStats = this.getCurrentStats();
    const previewStats = this.getPreviewStats();

    return this.compareStats(currentStats, previewStats);
  }

  /**
   * Set the selected category
   */
  setSelectedCategory(category: UpgradeCategory): void {
    this.selectedCategory = category;
    this.selectedPart = null;
    this.tempBuild = null;
  }

  /**
   * Get the currently selected category
   */
  getSelectedCategory(): UpgradeCategory | null {
    return this.selectedCategory;
  }

  /**
   * Get the currently hovered part
   */
  getHoveredPart(): UpgradePart | null {
    return this.hoveredPart;
  }

  /**
   * Get the currently selected part
   */
  getSelectedPart(): UpgradePart | null {
    return this.selectedPart;
  }

  /**
   * Create a temporary build with the specified upgrade
   */
  private createBuildWithUpgrade(part: UpgradePart): CarBuild {
    const newUpgrades = { ...this.build.installedUpgrades };
    newUpgrades[part.category as keyof InstalledUpgrades] = part;

    return {
      ...this.build,
      installedUpgrades: newUpgrades
    };
  }

  /**
   * Get base stats from the car definition
   */
  private getBaseStats(): CarStats {
    // This would come from CarDefinitions based on carId
    // For now, return default stats
    return {
      topSpeed: 100,
      acceleration: 50,
      handling: 50,
      grip: 50,
      stability: 50,
      spResistance: 50
    };
  }

  /**
   * Get current stats with installed upgrades
   */
  private getCurrentStats(): CarStats {
    const base = this.getBaseStats();
    const upgrades = Object.values(this.build.installedUpgrades).filter((p): p is UpgradePart => p !== undefined);
    return calculateFinalStats(base, upgrades);
  }

  /**
   * Get preview stats (with hovered/selected part)
   */
  private getPreviewStats(): CarStats {
    if (!this.tempBuild) {
      return this.getCurrentStats();
    }

    const base = this.getBaseStats();
    const upgrades = Object.values(this.tempBuild.installedUpgrades).filter((p): p is UpgradePart => p !== undefined);
    return calculateFinalStats(base, upgrades);
  }

  /**
   * Compare two stat sets and return differences
   */
  private compareStats(before: CarStats, after: CarStats): StatComparison[] {
    const keys = Object.keys(before) as (keyof CarStats)[];
    
    return keys.map(key => ({
      stat: key,
      before: before[key],
      after: after[key],
      delta: after[key] - before[key]
    }));
  }

  /**
   * Install an upgrade to the build
   */
  private installUpgrade(part: UpgradePart): void {
    this.build.installedUpgrades[part.category as keyof InstalledUpgrades] = part;
  }
}
