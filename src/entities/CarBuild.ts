/**
 * CarBuild Class
 * Represents a single customized car with upgrades, visuals, and state
 */

import { CarDefinition, CarStats, VinylLayerSave, UpgradeCategory, VisualSlot, VisualPart, UpgradePart, CarBuildSave } from "../types/car.types";
import { calculateFinalStats } from "../types/UpgradeSystem";

export class CarBuild {
  id: string;
  car: CarDefinition;

  installedUpgrades: Record<UpgradeCategory, UpgradePart | null>;
  installedVisuals: Record<VisualSlot, VisualPart | null>;

  bodyColor: string;
  vinylLayers: VinylLayerSave[];
  mileage: number;

  constructor(id: string, car: CarDefinition) {
    this.id = id;
    this.car = car;

    this.installedUpgrades = {
      engine: null,
      turbo: null,
      intake: null,
      exhaust: null,
      transmission: null,
      suspension: null,
      tires: null,
      weightReduction: null,
      cooling: null,
      ecu: null
    };

    this.installedVisuals = {
      bodyColor: null,
      vinyl: null,
      frontBumper: null,
      rearBumper: null,
      sideSkirts: null,
      spoiler: null,
      hood: null,
      wheels: null,
      exhaust: null
    };

    this.bodyColor = "#FFFFFF";
    this.vinylLayers = [];
    this.mileage = 0;
  }

  // --- Performance ---

  /**
   * Install a performance upgrade part
   */
  installUpgrade(part: UpgradePart): void {
    this.installedUpgrades[part.category] = part;
  }

  /**
   * Remove an upgrade from a specific category
   */
  removeUpgrade(category: UpgradeCategory): void {
    this.installedUpgrades[category] = null;
  }

  /**
   * Get the final stats after applying all upgrades
   */
  getFinalStats(): CarStats {
    const upgrades = Object.values(this.installedUpgrades).filter(
      (u): u is UpgradePart => u !== null
    );
    return calculateFinalStats(this.car.baseStats, upgrades);
  }

  /**
   * Get a specific installed upgrade by category
   */
  getUpgrade(category: UpgradeCategory): UpgradePart | null {
    return this.installedUpgrades[category] || null;
  }

  /**
   * Check if an upgrade is installed in a category
   */
  hasUpgrade(category: UpgradeCategory): boolean {
    return this.installedUpgrades[category] !== null;
  }

  // --- Visuals ---

  /**
   * Install a visual part
   */
  installVisual(part: VisualPart): void {
    this.installedVisuals[part.category as VisualSlot] = part;
  }

  /**
   * Remove a visual part from a slot
   */
  removeVisual(slot: VisualSlot): void {
    this.installedVisuals[slot] = null;
  }

  /**
   * Set the body color
   */
  setBodyColor(hex: string): void {
    this.bodyColor = hex;
  }

  /**
   * Get the current body color
   */
  getBodyColor(): string {
    return this.bodyColor;
  }

  /**
   * Set vinyl layers
   */
  setVinylLayers(layers: VinylLayerSave[]): void {
    this.vinylLayers = layers;
  }

  /**
   * Add a vinyl layer
   */
  addVinylLayer(layer: VinylLayerSave): void {
    this.vinylLayers.push(layer);
  }

  /**
   * Remove a vinyl layer by index
   */
  removeVinylLayer(index: number): void {
    if (index >= 0 && index < this.vinylLayers.length) {
      this.vinylLayers.splice(index, 1);
    }
  }

  /**
   * Clear all vinyl layers
   */
  clearVinylLayers(): void {
    this.vinylLayers = [];
  }

  /**
   * Get a specific installed visual by slot
   */
  getVisual(slot: VisualSlot): VisualPart | null {
    return this.installedVisuals[slot] || null;
  }

  /**
   * Check if a visual is installed in a slot
   */
  hasVisual(slot: VisualSlot): boolean {
    return this.installedVisuals[slot] !== null;
  }

  // --- Mileage ---

  /**
   * Add mileage to the car
   */
  addMileage(distance: number): void {
    this.mileage += distance;
  }

  /**
   * Get current mileage
   */
  getMileage(): number {
    return this.mileage;
  }

  // --- Save / Load ---

  /**
   * Convert to save format for persistence
   */
  toSaveFormat(name?: string): CarBuildSave {
    return {
      id: this.id,
      carId: this.car.id,
      name: name || this.car.name,
      installedUpgrades: Object.fromEntries(
        Object.entries(this.installedUpgrades).map(([k, v]) => [k, v?.id || null])
      ),
      installedVisuals: Object.fromEntries(
        Object.entries(this.installedVisuals).map(([k, v]) => [k, v?.id || null])
      ),
      bodyColor: this.bodyColor,
      vinylLayers: this.vinylLayers,
      mileage: this.mileage,
      lastUsed: Date.now()
    };
  }

  /**
   * Create a CarBuild from saved data
   */
  static fromSave(
    save: CarBuildSave,
    carDef: CarDefinition,
    upgradeLookup: (id: string) => UpgradePart | null,
    visualLookup: (id: string) => VisualPart | null
  ): CarBuild {
    const build = new CarBuild(save.id, carDef);

    // Restore upgrades
    for (const [cat, id] of Object.entries(save.installedUpgrades)) {
      if (id) {
        const part = upgradeLookup(id);
        if (part) {
          build.installedUpgrades[cat as UpgradeCategory] = part;
        }
      }
    }

    // Restore visuals
    for (const [slot, id] of Object.entries(save.installedVisuals)) {
      if (id) {
        const part = visualLookup(id);
        if (part) {
          build.installedVisuals[slot as VisualSlot] = part;
        }
      }
    }

    // Restore body color
    build.bodyColor = save.bodyColor;

    // Restore vinyl layers
    build.vinylLayers = save.vinylLayers;

    // Restore mileage
    build.mileage = save.mileage;

    return build;
  }

  /**
   * Clone this build
   */
  clone(): CarBuild {
    const cloned = new CarBuild(this.id + "_copy", this.car);
    
    // Copy upgrades
    for (const [cat, part] of Object.entries(this.installedUpgrades)) {
      if (part) {
        cloned.installedUpgrades[cat as UpgradeCategory] = part;
      }
    }

    // Copy visuals
    for (const [slot, part] of Object.entries(this.installedVisuals)) {
      if (part) {
        cloned.installedVisuals[slot as VisualSlot] = part;
      }
    }

    cloned.bodyColor = this.bodyColor;
    cloned.vinylLayers = [...this.vinylLayers];
    cloned.mileage = this.mileage;

    return cloned;
  }
}
