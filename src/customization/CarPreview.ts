/**
 * Car Preview Renderer
 * 3D viewport for car customization with orbit camera, zoom, and part preview
 */

import { VisualPart, VisualSlot } from "../types/car.types";

export interface IRenderer {
  loadModel(modelId: string): void;
  applyMaterialOverride(materialId: string, color: string): void;
  swapMesh(slot: string, meshId: string): void;
  setCameraPosition(x: number, y: number, z: number): void;
  setCameraTarget(x: number, y: number, z: number): void;
  highlightMesh(meshId: string, enabled: boolean): void;
}

export class CarPreview {
  private currentModelId: string | null = null;
  private previewParts: Map<string, VisualPart> = new Map();
  private appliedParts: Map<string, VisualPart> = new Map();

  constructor(private renderer: IRenderer) {}

  /**
   * Load the base car model into the preview
   */
  setCarModel(modelId: string): void {
    this.currentModelId = modelId;
    this.renderer.loadModel(modelId);
    this.previewParts.clear();
  }

  /**
   * Apply a visual part to the preview (temporary)
   */
  applyVisualPart(part: VisualPart): void {
    const slot = part.category as string;
    
    if (part.meshId) {
      this.renderer.swapMesh(slot, part.meshId);
    }
    
    this.previewParts.set(slot, part);
  }

  /**
   * Set the body color of the car
   */
  setColor(hex: string): void {
    this.renderer.applyMaterialOverride("body", hex);
  }

  /**
   * Focus the camera on a specific part slot
   */
  focusSlot(slot: VisualSlot): void {
    // Camera offsets for different slots
    const cameraOffsets: Record<VisualSlot, { x: number; y: number; z: number }> = {
      bodyColor: { x: 0, y: 1.5, z: 4 },
      vinyl: { x: 0, y: 1.5, z: 4 },
      frontBumper: { x: 0, y: 0.5, z: 3 },
      rearBumper: { x: 0, y: 0.5, z: -3 },
      sideSkirts: { x: 2.5, y: 0.5, z: 0 },
      spoiler: { x: 0, y: 2, z: -2 },
      hood: { x: 0, y: 2, z: 2 },
      wheels: { x: 2, y: 0.3, z: 1.5 },
      exhaust: { x: 0, y: 0.3, z: -2.5 }
    };

    const offset = cameraOffsets[slot];
    if (offset) {
      this.renderer.setCameraPosition(offset.x, offset.y, offset.z);
      this.renderer.setCameraTarget(0, 0.5, 0);
    }

    // Highlight the selected slot
    this.renderer.highlightMesh(slot, true);
  }

  /**
   * Reset camera to default orbit position
   */
  resetCamera(): void {
    this.renderer.setCameraPosition(3, 2, 3);
    this.renderer.setCameraTarget(0, 0.5, 0);
  }

  /**
   * Commit preview parts as applied
   */
  commitPreview(): void {
    this.appliedParts = new Map(this.previewParts);
  }

  /**
   * Clear all preview parts
   */
  clearPreview(): void {
    this.previewParts.clear();
    if (this.currentModelId) {
      this.setCarModel(this.currentModelId);
    }
  }

  /**
   * Get currently previewed part for a slot
   */
  getPreviewPart(slot: string): VisualPart | undefined {
    return this.previewParts.get(slot);
  }

  /**
   * Get currently applied part for a slot
   */
  getAppliedPart(slot: string): VisualPart | undefined {
    return this.appliedParts.get(slot);
  }
}
