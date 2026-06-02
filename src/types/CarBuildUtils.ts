/**
 * Car Build Utilities
 * Helper functions for calculating stats and applying builds
 */

import { CarStats, UpgradePart, VisualPart, VisualSlot, UpgradeCategory } from "./car.types";

/**
 * Calculate final car stats by merging base stats with all installed upgrades
 */
export function calculateFinalStats(
  base: CarStats,
  upgrades: UpgradePart[]
): CarStats {
  const result = { ...base };

  for (const upgrade of upgrades) {
    for (const key in upgrade.statModifiers) {
      const statKey = key as keyof CarStats;
      const modifier = upgrade.statModifiers[statKey];
      if (modifier !== undefined) {
        result[statKey] += modifier;
      }
    }
  }

  return result;
}

/**
 * Get all upgrades for a specific category
 */
export function getUpgradesByCategory(
  allUpgrades: UpgradePart[],
  category: UpgradeCategory
): UpgradePart[] {
  return allUpgrades.filter((u) => u.category === category);
}

/**
 * Get visual parts for a specific slot
 */
export function getVisualsBySlot(
  allVisuals: VisualPart[],
  slot: VisualSlot
): VisualPart[] {
  return allVisuals.filter((v) => v.slot === slot);
}

/**
 * Calculate total cost of all installed upgrades
 */
export function calculateUpgradeCost(upgrades: UpgradePart[]): number {
  return upgrades.reduce((total, u) => total + u.cost, 0);
}

/**
 * Calculate total cost of all installed visual parts
 */
export function calculateVisualCost(visuals: VisualPart[]): number {
  return visuals.reduce((total, v) => {
    // Visual parts don't have cost in the current model, but we can add it later
    return total;
  }, 0);
}

/**
 * Get the highest level upgrade installed for a category
 */
export function getMaxUpgradeLevel(
  upgrades: UpgradePart[],
  category: UpgradeCategory
): number {
  const categoryUpgrades = getUpgradesByCategory(upgrades, category);
  if (categoryUpgrades.length === 0) return 0;
  return Math.max(...categoryUpgrades.map((u) => u.level));
}

/**
 * Apply visual mod to renderer (placeholder for actual renderer integration)
 * This function demonstrates the pipeline for applying visual overrides
 */
export interface RendererAPI {
  swapMesh(slot: VisualSlot, meshPath: string): void;
  applyTexture(slot: VisualSlot, texturePath: string): void;
  applyColor(slot: VisualSlot, color: string): void;
}

export function applyVisualPart(
  part: VisualPart,
  renderer: RendererAPI
): void {
  if (part.meshOverride) {
    renderer.swapMesh(part.slot, part.meshOverride);
  }

  if (part.textureOverride) {
    renderer.applyTexture(part.slot, part.textureOverride);
  }

  if (part.color) {
    renderer.applyColor(part.slot, part.color);
  }
}

/**
 * Validate if a visual part is compatible with a car's visual slots
 */
export function isVisualPartCompatible(
  part: VisualPart,
  availableSlots: Record<VisualSlot, boolean>
): boolean {
  return availableSlots[part.slot] === true;
}

/**
 * Validate if an upgrade is compatible with a car's upgrade slots
 */
export function isUpgradeCompatible(
  category: UpgradeCategory,
  availableSlots: Record<string, boolean>
): boolean {
  return availableSlots[category] === true;
}
