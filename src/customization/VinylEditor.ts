/**
 * Vinyl Editor UI
 * Layer-based decal system for custom car liveries
 */

import { VinylLayer, VinylSet } from "../types/car.types";

export class VinylEditor {
  layers: VinylLayer[] = [];
  private selectedLayerId: string | null = null;
  private layerCounter: number = 0;

  /**
   * Add a new vinyl layer
   */
  addLayer(texture: string): VinylLayer {
    const id = `vinyl_${Date.now()}_${this.layerCounter++}`;
    const newLayer: VinylLayer = {
      id,
      texture,
      position: { x: 0, y: 0 },
      scale: 1,
      rotation: 0,
      color: "#FFFFFF",
      opacity: 1
    };
    
    this.layers.push(newLayer);
    this.selectedLayerId = id;
    return newLayer;
  }

  /**
   * Remove a vinyl layer by ID
   */
  deleteLayer(id: string): boolean {
    const index = this.layers.findIndex(layer => layer.id === id);
    if (index !== -1) {
      this.layers.splice(index, 1);
      if (this.selectedLayerId === id) {
        this.selectedLayerId = null;
      }
      return true;
    }
    return false;
  }

  /**
   * Transform a layer (position, scale, rotation)
   */
  transformLayer(id: string, transform: Partial<{ 
    position: { x: number; y: number }; 
    scale: number; 
    rotation: number 
  }>): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      if (transform.position) {
        layer.position = transform.position;
      }
      if (transform.scale !== undefined) {
        layer.scale = Math.max(0.1, Math.min(5, transform.scale));
      }
      if (transform.rotation !== undefined) {
        layer.rotation = transform.rotation % 360;
      }
    }
  }

  /**
   * Change layer color
   */
  setLayerColor(id: string, color: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.color = color;
    }
  }

  /**
   * Change layer opacity
   */
  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * Change layer texture
   */
  setLayerTexture(id: string, texture: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.texture = texture;
    }
  }

  /**
   * Select a layer for editing
   */
  selectLayer(id: string | null): void {
    this.selectedLayerId = id;
  }

  /**
   * Get the currently selected layer
   */
  getSelectedLayer(): VinylLayer | null {
    if (!this.selectedLayerId) return null;
    return this.layers.find(l => l.id === this.selectedLayerId) || null;
  }

  /**
   * Get all layers
   */
  getAllLayers(): VinylLayer[] {
    return [...this.layers];
  }

  /**
   * Move layer up in render order
   */
  moveLayerUp(id: string): void {
    const index = this.layers.findIndex(l => l.id === id);
    if (index > 0 && index < this.layers.length - 1) {
      [this.layers[index], this.layers[index + 1]] = [this.layers[index + 1], this.layers[index]];
    }
  }

  /**
   * Move layer down in render order
   */
  moveLayerDown(id: string): void {
    const index = this.layers.findIndex(l => l.id === id);
    if (index > 0 && index < this.layers.length) {
      [this.layers[index], this.layers[index - 1]] = [this.layers[index - 1], this.layers[index]];
    }
  }

  /**
   * Duplicate a layer
   */
  duplicateLayer(id: string): VinylLayer | null {
    const original = this.layers.find(l => l.id === id);
    if (!original) return null;

    const newId = `vinyl_${Date.now()}_${this.layerCounter++}`;
    const duplicate: VinylLayer = {
      ...original,
      id: newId,
      position: { 
        x: original.position.x + 0.1, 
        y: original.position.y + 0.1 
      }
    };

    const index = this.layers.findIndex(l => l.id === id);
    this.layers.splice(index + 1, 0, duplicate);
    this.selectedLayerId = newId;
    return duplicate;
  }

  /**
   * Clear all layers
   */
  clearAllLayers(): void {
    this.layers = [];
    this.selectedLayerId = null;
    this.layerCounter = 0;
  }

  /**
   * Save current layers as a vinyl set
   */
  saveAsVinylSet(name: string): VinylSet {
    return {
      id: `set_${Date.now()}`,
      name,
      layers: this.getAllLayers()
    };
  }

  /**
   * Load a vinyl set
   */
  loadVinylSet(vinylSet: VinylSet): void {
    this.clearAllLayers();
    this.layers = vinylSet.layers.map(layer => ({ ...layer }));
    this.layerCounter = this.layers.length;
  }

  /**
   * Export layers as JSON
   */
  exportToJSON(): string {
    return JSON.stringify({
      layers: this.layers,
      count: this.layers.length
    }, null, 2);
  }

  /**
   * Import layers from JSON
   */
  importFromJSON(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (data.layers && Array.isArray(data.layers)) {
        this.clearAllLayers();
        this.layers = data.layers;
        this.layerCounter = this.layers.length;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}

// Predefined vinyl textures
export const VINYL_TEXTURES: string[] = [
  "stripe_racing",
  "stripe_center",
  "stripe_side",
  "flame_left",
  "flame_right",
  "checkered_flag",
  "number_circle",
  "sponsor_logo_1",
  "sponsor_logo_2",
  "carbon_fiber_pattern",
  "camouflage",
  "gradient_horizontal",
  "gradient_vertical",
  "tribal_design",
  "lightning_bolt"
];
