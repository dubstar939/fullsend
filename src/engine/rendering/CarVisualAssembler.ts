/**
 * CarVisualAssembler
 * Applies CarBuild visual configuration to a rendered car model
 */

import { CarBuild } from "../../entities/CarBuild";
import { VisualPart, VisualSlot, VinylLayerSave } from "../../types/car.types";

/**
 * Interface for the renderer that applies visual changes
 */
export interface IRenderer {
  /**
   * Apply body color to the car
   */
  applyColor(carHandle: any, hex: string): void;
  
  /**
   * Swap mesh for a specific slot
   */
  swapMesh(carHandle: any, slot: string, meshId: string): void;
  
  /**
   * Apply texture to a specific slot
   */
  applyTexture(carHandle: any, slot: string, textureId: string): void;
  
  /**
   * Apply a vinyl layer to the car
   */
  applyVinyl(carHandle: any, layer: VinylLayerSave): void;
  
  /**
   * Reset all visual modifications on the car
   */
  resetVisuals(carHandle: any): void;
}

export class CarVisualAssembler {
  constructor(private renderer: IRenderer) {}

  /**
   * Apply all visual configurations from a CarBuild to a car model
   */
  applyBuild(build: CarBuild, carHandle: any): void {
    // Reset previous visuals first
    this.renderer.resetVisuals(carHandle);

    // Apply body color
    if (build.bodyColor) {
      this.renderer.applyColor(carHandle, build.bodyColor);
    }

    // Apply visual parts
    for (const [slot, part] of Object.entries(build.installedVisuals)) {
      if (!part) continue;

      const visualPart = part as VisualPart;

      // Apply mesh override if available
      if (visualPart.meshId) {
        this.renderer.swapMesh(carHandle, slot, visualPart.meshId);
      }

      // Apply texture override if available
      if (visualPart.textureId) {
        this.renderer.applyTexture(carHandle, slot, visualPart.textureId);
      }
    }

    // Apply vinyl layers
    for (const layer of build.vinylLayers) {
      this.renderer.applyVinyl(carHandle, layer);
    }
  }

  /**
   * Apply only a specific visual part (for preview purposes)
   */
  applyVisualPart(part: VisualPart, carHandle: any): void {
    const slot = part.category as string;

    if (part.meshId) {
      this.renderer.swapMesh(carHandle, slot, part.meshId);
    }

    if (part.textureId) {
      this.renderer.applyTexture(carHandle, slot, part.textureId);
    }
  }

  /**
   * Apply only body color (for preview purposes)
   */
  applyBodyColor(hex: string, carHandle: any): void {
    this.renderer.applyColor(carHandle, hex);
  }

  /**
   * Apply vinyl layers (for preview purposes)
   */
  applyVinylLayers(layers: VinylLayerSave[], carHandle: any): void {
    for (const layer of layers) {
      this.renderer.applyVinyl(carHandle, layer);
    }
  }

  /**
   * Remove a specific visual part from a slot
   */
  removeVisualPart(slot: VisualSlot, carHandle: any): void {
    // This would typically reset the mesh/texture to default for that slot
    // Implementation depends on renderer capabilities
    this.renderer.swapMesh(carHandle, slot, `${slot}_default`);
  }

  /**
   * Get all applied visual parts as a summary
   */
  getAppliedSummary(build: CarBuild): {
    bodyColor: string;
    partCount: number;
    vinylCount: number;
    slots: Record<string, string>;
  } {
    const slots: Record<string, string> = {};
    let partCount = 0;

    for (const [slot, part] of Object.entries(build.installedVisuals)) {
      if (part) {
        slots[slot] = part.name;
        partCount++;
      }
    }

    return {
      bodyColor: build.bodyColor,
      partCount,
      vinylCount: build.vinylLayers.length,
      slots
    };
  }
}
