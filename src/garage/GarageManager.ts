/**
 * Garage Save System
 * Manages player's collection of CarBuilds with persistence
 */

import { CarBuild, CarBuildSave, GarageSave, VinylLayer, VinylLayerSave } from "../types/car.types";
import { UpgradePart, VisualPart } from "../types/car.types";

export class GarageManager {
  private builds = new Map<string, CarBuildSave>();
  private activeBuildId: string | null = null;

  constructor(private storageKey = "player_garage") {
    this.loadFromStorage();
  }

  // --- Core API ---

  /**
   * Add a new build to the garage
   */
  addBuild(build: CarBuildSave): void {
    this.builds.set(build.id, build);
    this.saveToStorage();
  }

  /**
   * Remove a build from the garage
   */
  removeBuild(id: string): void {
    this.builds.delete(id);
    if (this.activeBuildId === id) {
      this.activeBuildId = null;
    }
    this.saveToStorage();
  }

  /**
   * Set the active build (the one currently being used/viewed)
   */
  setActiveBuild(id: string): boolean {
    if (this.builds.has(id)) {
      this.activeBuildId = id;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  /**
   * Get the active build
   */
  getActiveBuild(): CarBuildSave | null {
    return this.activeBuildId ? this.builds.get(this.activeBuildId) || null : null;
  }

  /**
   * Get all builds in the garage
   */
  getAllBuilds(): CarBuildSave[] {
    return [...this.builds.values()];
  }

  /**
   * Get a specific build by ID
   */
  getBuild(id: string): CarBuildSave | undefined {
    return this.builds.get(id);
  }

  /**
   * Update an existing build
   */
  updateBuild(build: CarBuildSave): void {
    this.builds.set(build.id, build);
    this.saveToStorage();
  }

  /**
   * Check if a build exists
   */
  hasBuild(id: string): boolean {
    return this.builds.has(id);
  }

  /**
   * Get the count of builds in the garage
   */
  getBuildCount(): number {
    return this.builds.size;
  }

  // --- Persistence ---

  /**
   * Save garage data to localStorage
   */
  private saveToStorage(): void {
    const data: GarageSave = {
      builds: [...this.builds.values()],
      activeBuildId: this.activeBuildId
    };
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save garage to localStorage:", error);
    }
  }

  /**
   * Load garage data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;

      const data: GarageSave = JSON.parse(raw);
      this.activeBuildId = data.activeBuildId;

      for (const b of data.builds) {
        this.builds.set(b.id, b);
      }
    } catch (error) {
      console.error("Failed to load garage from localStorage:", error);
      // Clear corrupted data
      this.builds.clear();
      this.activeBuildId = null;
    }
  }

  // --- Conversion Helpers ---

  /**
   * Convert a CarBuild to CarBuildSave format
   */
  static toSaveFormat(build: CarBuild, id: string, name: string): CarBuildSave {
    // Convert installed upgrades to record of IDs
    const installedUpgrades: Record<string, string | null> = {};
    for (const [category, part] of Object.entries(build.installedUpgrades)) {
      installedUpgrades[category] = part ? part.id : null;
    }

    // Convert installed visuals to record of IDs
    const installedVisuals: Record<string, string | null> = {};
    for (const [slot, part] of Object.entries(build.installedVisuals)) {
      if (slot === 'bodyColor') {
        continue; // Handle separately
      }
      if (slot === 'vinyl') {
        continue; // Handle separately
      }
      installedVisuals[slot] = part ? (part as VisualPart).id : null;
    }

    // Convert vinyl layers to save format
    const vinylLayers: VinylLayerSave[] = [];
    if (build.installedVisuals.vinyl) {
      for (const layer of build.installedVisuals.vinyl) {
        vinylLayers.push({
          id: layer.id,
          texture: layer.texture,
          transform: {
            x: layer.position.x,
            y: layer.position.y,
            scale: layer.scale,
            rotation: layer.rotation
          },
          color: layer.color,
          opacity: layer.opacity
        });
      }
    }

    return {
      id,
      carId: build.carId,
      name,
      installedUpgrades,
      installedVisuals,
      bodyColor: build.installedVisuals.bodyColor || "#FFFFFF",
      vinylLayers,
      mileage: build.mileage || 0,
      lastUsed: build.lastUsed || Date.now()
    };
  }

  /**
   * Convert CarBuildSave back to CarBuild
   */
  static fromSaveFormat(
    save: CarBuildSave, 
    upgradeCatalog: Map<string, UpgradePart>,
    visualCatalog: Map<string, VisualPart>
  ): CarBuild {
    // Convert upgrade IDs back to parts
    const installedUpgrades: any = {};
    for (const [category, partId] of Object.entries(save.installedUpgrades)) {
      if (partId && upgradeCatalog.has(partId)) {
        installedUpgrades[category] = upgradeCatalog.get(partId);
      } else {
        installedUpgrades[category] = null;
      }
    }

    // Convert visual IDs back to parts
    const installedVisuals: any = {
      bodyColor: save.bodyColor
    };
    
    for (const [slot, partId] of Object.entries(save.installedVisuals)) {
      if (partId && visualCatalog.has(partId)) {
        installedVisuals[slot] = visualCatalog.get(partId);
      } else {
        installedVisuals[slot] = null;
      }
    }

    // Convert vinyl layers back to runtime format
    const vinylLayers: VinylLayer[] = [];
    for (const layerSave of save.vinylLayers) {
      vinylLayers.push({
        id: layerSave.id,
        texture: layerSave.texture,
        position: {
          x: layerSave.transform.x,
          y: layerSave.transform.y
        },
        scale: layerSave.transform.scale,
        rotation: layerSave.transform.rotation,
        color: layerSave.color,
        opacity: layerSave.opacity
      });
    }
    
    if (vinylLayers.length > 0) {
      installedVisuals.vinyl = vinylLayers;
    }

    return {
      carId: save.carId,
      installedUpgrades,
      installedVisuals,
      savedAt: new Date(),
      mileage: save.mileage,
      lastUsed: save.lastUsed
    };
  }

  // --- Utility Methods ---

  /**
   * Update mileage for the active build
   */
  addMileage(distance: number): void {
    if (this.activeBuildId) {
      const build = this.builds.get(this.activeBuildId);
      if (build) {
        build.mileage += distance;
        build.lastUsed = Date.now();
        this.updateBuild(build);
      }
    }
  }

  /**
   * Export garage data as JSON string
   */
  exportGarage(): string {
    const data: GarageSave = {
      builds: [...this.builds.values()],
      activeBuildId: this.activeBuildId
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import garage data from JSON string
   */
  importGarage(jsonString: string): boolean {
    try {
      const data: GarageSave = JSON.parse(jsonString);
      
      this.builds.clear();
      this.activeBuildId = data.activeBuildId;

      for (const b of data.builds) {
        this.builds.set(b.id, b);
      }

      this.saveToStorage();
      return true;
    } catch (error) {
      console.error("Failed to import garage data:", error);
      return false;
    }
  }

  /**
   * Clear all garage data
   */
  clearGarage(): void {
    this.builds.clear();
    this.activeBuildId = null;
    localStorage.removeItem(this.storageKey);
  }
}
