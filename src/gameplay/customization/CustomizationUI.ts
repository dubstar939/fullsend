/**
 * Customization UI Logic - Tokyo Xtreme Racer Style
 * Handles car customization interface logic (no rendering)
 */

import { CarStatsSystem, CarStatsModified } from './CarStats';
import { PartsSystem, PartCategory, PartDefinition, PartTier } from './PartsSystem';

export interface CustomizationState {
  selectedCategory: PartCategory | 'visual';
  selectedPartId: string | null;
  previewColor: string;
  previewDecal: string | null;
  isComparing: boolean;
  comparisonPartId: string | null;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  price: number;
  unlocked: boolean;
}

export interface DecalOption {
  id: string;
  name: string;
  type: 'stripe' | 'flame' | 'tribal' | 'number' | 'sponsor';
  price: number;
  unlocked: boolean;
  position: 'hood' | 'roof' | 'sides' | 'full';
}

export const DEFAULT_COLORS: ColorOption[] = [
  { id: 'white', name: 'Crystal White', hex: '#ffffff', price: 0, unlocked: true },
  { id: 'black', name: 'Phantom Black', hex: '#1a1a1a', price: 0, unlocked: true },
  { id: 'silver', name: 'Metallic Silver', hex: '#c0c0c0', price: 500, unlocked: true },
  { id: 'red', name: 'Racing Red', hex: '#cc0000', price: 1000, unlocked: true },
  { id: 'blue', name: 'Midnight Blue', hex: '#003366', price: 1000, unlocked: true },
  { id: 'yellow', name: 'Sunshine Yellow', hex: '#ffcc00', price: 1500, unlocked: false },
  { id: 'green', name: 'British Green', hex: '#004225', price: 1500, unlocked: false },
  { id: 'orange', name: 'Flame Orange', hex: '#ff6600', price: 2000, unlocked: false },
  { id: 'purple', name: 'Deep Purple', hex: '#4b0082', price: 2000, unlocked: false },
  { id: 'pink', name: 'Sakura Pink', hex: '#ffb7c5', price: 2500, unlocked: false },
  { id: 'gold', name: 'Champion Gold', hex: '#ffd700', price: 5000, unlocked: false },
  { id: 'chrome', name: 'Mirror Chrome', hex: '#e8e8e8', price: 10000, unlocked: false },
];

export const DEFAULT_DECALS: DecalOption[] = [
  { id: 'none', name: 'No Decal', type: 'stripe', price: 0, unlocked: true, position: 'sides' },
  { id: 'stripe_center', name: 'Center Stripe', type: 'stripe', price: 500, unlocked: true, position: 'hood' },
  { id: 'stripe_dual', name: 'Dual Stripes', type: 'stripe', price: 800, unlocked: true, position: 'hood' },
  { id: 'flame_basic', name: 'Basic Flames', type: 'flame', price: 1500, unlocked: false, position: 'sides' },
  { id: 'flame_advanced', name: 'Racing Flames', type: 'flame', price: 2500, unlocked: false, position: 'sides' },
  { id: 'tribal_simple', name: 'Simple Tribal', type: 'tribal', price: 2000, unlocked: false, position: 'sides' },
  { id: 'number_01', name: 'Number 01', type: 'number', price: 1000, unlocked: false, position: 'hood' },
  { id: 'number_86', name: 'Number 86', type: 'number', price: 1000, unlocked: false, position: 'hood' },
  { id: 'sponsor_trust', name: 'TRUST Logo', type: 'sponsor', price: 3000, unlocked: false, position: 'hood' },
  { id: 'sponsor_hks', name: 'HKS Logo', type: 'sponsor', price: 3000, unlocked: false, position: 'hood' },
  { id: 'sponsor_recaro', name: 'RECARO Logo', type: 'sponsor', price: 3000, unlocked: false, position: 'sides' },
];

export class CustomizationUI {
  private state: CustomizationState;
  private statsSystem: CarStatsSystem;
  private partsSystem: PartsSystem;
  
  // Player data
  private playerCoins: number;
  private ownedColors: Set<string>;
  private ownedDecals: Set<string>;
  
  // Callbacks
  private onStatChange?: (stats: CarStatsModified) => void;
  private onCoinsChange?: (coins: number) => void;
  private onPartInstall?: (part: PartDefinition) => void;
  private onVisualChange?: (color: string, decal: string | null) => void;
  
  constructor(
    statsSystem: CarStatsSystem,
    partsSystem: PartsSystem,
    initialCoins: number = 0
  ) {
    this.statsSystem = statsSystem;
    this.partsSystem = partsSystem;
    this.playerCoins = initialCoins;
    
    this.state = {
      selectedCategory: 'engine',
      selectedPartId: null,
      previewColor: '#ffffff',
      previewDecal: null,
      isComparing: false,
      comparisonPartId: null,
    };
    
    this.ownedColors = new Set(['white', 'black', 'silver', 'red', 'blue']);
    this.ownedDecals = new Set(['none', 'stripe_center', 'stripe_dual']);
  }
  
  /**
   * Select a category to view
   */
  selectCategory(category: PartCategory | 'visual'): void {
    this.state.selectedCategory = category;
    this.state.selectedPartId = null;
    this.state.isComparing = false;
    this.state.comparisonPartId = null;
  }
  
  /**
   * Select a part to view/install
   */
  selectPart(partId: string): void {
    if (this.state.selectedCategory === 'visual') return;
    
    this.state.selectedPartId = partId;
  }
  
  /**
   * Toggle comparison mode
   */
  toggleComparison(partId: string): void {
    if (this.state.isComparing && this.state.comparisonPartId === partId) {
      this.state.isComparing = false;
      this.state.comparisonPartId = null;
    } else {
      this.state.isComparing = true;
      this.state.comparisonPartId = partId;
    }
  }
  
  /**
   * Install selected part
   */
  installSelectedPart(): { success: boolean; reason?: string } {
    if (!this.state.selectedPartId) {
      return { success: false, reason: 'No part selected' };
    }
    
    const result = this.partsSystem.installPart(this.state.selectedPartId);
    
    if (result.success && this.onStatChange) {
      this.onStatChange(this.statsSystem.getModifiedStats());
    }
    
    if (result.success && this.onPartInstall) {
      const part = this.partsSystem.getPartById(this.state.selectedPartId!);
      if (part) {
        this.onPartInstall(part);
      }
    }
    
    return result;
  }
  
  /**
   * Buy selected part
   */
  buySelectedPart(): { success: boolean; newCoins: number; reason?: string } {
    if (!this.state.selectedPartId) {
      return { success: false, newCoins: this.playerCoins, reason: 'No part selected' };
    }
    
    const part = this.partsSystem.getPartById(this.state.selectedPartId);
    if (!part) {
      return { success: false, newCoins: this.playerCoins, reason: 'Part not found' };
    }
    
    const result = this.partsSystem.buyPart(part, this.playerCoins);
    
    if (result.success) {
      this.playerCoins = result.newCoins;
      this.ownedColors.add(part.id);
      
      if (this.onCoinsChange) {
        this.onCoinsChange(this.playerCoins);
      }
    }
    
    return result;
  }
  
  /**
   * Select color preview
   */
  selectColor(colorId: string): void {
    const color = DEFAULT_COLORS.find(c => c.id === colorId);
    if (!color) return;
    
    if (!this.ownedColors.has(colorId)) {
      // Preview only, don't apply
      this.state.previewColor = color.hex;
    } else {
      this.state.previewColor = color.hex;
      this.applyVisualChanges();
    }
  }
  
  /**
   * Buy color
   */
  buyColor(colorId: string): { success: boolean; newCoins: number; reason?: string } {
    const color = DEFAULT_COLORS.find(c => c.id === colorId);
    if (!color) {
      return { success: false, newCoins: this.playerCoins, reason: 'Color not found' };
    }
    
    if (this.ownedColors.has(colorId)) {
      return { success: false, newCoins: this.playerCoins, reason: 'Already owned' };
    }
    
    if (this.playerCoins < color.price) {
      return { 
        success: false, 
        newCoins: this.playerCoins, 
        reason: `Need ${color.price - this.playerCoins} more coins` 
      };
    }
    
    this.playerCoins -= color.price;
    this.ownedColors.add(colorId);
    
    if (this.onCoinsChange) {
      this.onCoinsChange(this.playerCoins);
    }
    
    return { success: true, newCoins: this.playerCoins };
  }
  
  /**
   * Select decal preview
   */
  selectDecal(decalId: string): void {
    const decal = DEFAULT_DECALS.find(d => d.id === decalId);
    if (!decals) return;
    
    this.state.previewDecal = decalId;
    
    if (this.ownedDecals.has(decalId)) {
      this.applyVisualChanges();
    }
  }
  
  /**
   * Buy decal
   */
  buyDecal(decalId: string): { success: boolean; newCoins: number; reason?: string } {
    const decal = DEFAULT_DECALS.find(d => d.id === decalId);
    if (!decal) {
      return { success: false, newCoins: this.playerCoins, reason: 'Decal not found' };
    }
    
    if (this.ownedDecals.has(decalId)) {
      return { success: false, newCoins: this.playerCoins, reason: 'Already owned' };
    }
    
    if (this.playerCoins < decal.price) {
      return { 
        success: false, 
        newCoins: this.playerCoins, 
        reason: `Need ${decal.price - this.playerCoins} more coins` 
      };
    }
    
    this.playerCoins -= decal.price;
    this.ownedDecals.add(decalId);
    
    if (this.onCoinsChange) {
      this.onCoinsChange(this.playerCoins);
    }
    
    return { success: true, newCoins: this.playerCoins };
  }
  
  /**
   * Get available parts for current category
   */
  getAvailableParts(): PartDefinition[] {
    if (this.state.selectedCategory === 'visual') {
      return [];
    }
    
    return this.partsSystem.getPartsByCategory(this.state.selectedCategory as PartCategory);
  }
  
  /**
   * Get colors for display
   */
  getColors(): ColorOption[] {
    return DEFAULT_COLORS.map(c => ({
      ...c,
      unlocked: this.ownedColors.has(c.id),
    }));
  }
  
  /**
   * Get decals for display
   */
  getDecals(): DecalOption[] {
    return DEFAULT_DECALS.map(d => ({
      ...d,
      unlocked: this.ownedDecals.has(d.id),
    }));
  }
  
  /**
   * Get current stats
   */
  getCurrentStats(): CarStatsModified {
    return this.statsSystem.getModifiedStats();
  }
  
  /**
   * Get preview stats with selected part
   */
  getPreviewStats(): CarStatsModified | null {
    if (!this.state.selectedPartId || this.state.selectedCategory === 'visual') {
      return null;
    }
    
    // Create temporary stats for preview
    const baseStats = this.statsSystem.getBaseStats();
    const installedParts = this.partsSystem.getAllInstalledParts();
    const selectedPart = this.partsSystem.getPartById(this.state.selectedPartId);
    
    if (!selectedPart) return null;
    
    // Calculate preview bonuses
    const tempStats = { ...baseStats };
    
    // Apply installed parts
    for (const part of Object.values(installedParts)) {
      if (part.id !== this.state.selectedPartId) {
        for (const [stat, bonus] of Object.entries(part.statBonuses)) {
          if (bonus !== undefined) {
            (tempStats as Record<string, number>)[stat] = 
              ((tempStats as Record<string, number>)[stat] ?? 0.5) + bonus;
          }
        }
      }
    }
    
    // Apply selected part
    for (const [stat, bonus] of Object.entries(selectedPart.statBonuses)) {
      if (bonus !== undefined) {
        (tempStats as Record<string, number>)[stat] = 
          ((tempStats as Record<string, number>)[stat] ?? 0.5) + bonus;
      }
    }
    
    // Clamp values
    return {
      ...tempStats,
      modifiedTopSpeed: Math.max(0.5, Math.min(2.0, tempStats.topSpeed)),
      modifiedAcceleration: Math.max(0.1, Math.min(1.0, tempStats.acceleration)),
      modifiedHandling: Math.max(0.1, Math.min(1.0, tempStats.handling)),
      modifiedStability: Math.max(0.1, Math.min(1.0, tempStats.stability)),
      modifiedSPResistance: Math.max(0.1, Math.min(1.0, tempStats.spResistance)),
      modifiedGrip: Math.max(0.1, Math.min(1.0, tempStats.grip)),
    };
  }
  
  /**
   * Get comparison stats
   */
  getComparisonStats(): CarStatsModified | null {
    if (!this.state.isComparing || !this.state.comparisonPartId) {
      return null;
    }
    
    return this.getPreviewStats();
  }
  
  /**
   * Get current player coins
   */
  getPlayerCoins(): number {
    return this.playerCoins;
  }
  
  /**
   * Get selected part
   */
  getSelectedPart(): PartDefinition | null {
    if (!this.state.selectedPartId) return null;
    return this.partsSystem.getPartById(this.state.selectedPartId);
  }
  
  /**
   * Get current visual settings
   */
  getCurrentVisuals(): { color: string; decal: string | null } {
    return {
      color: this.state.previewColor,
      decal: this.state.previewDecal,
    };
  }
  
  /**
   * Reset to stock
   */
  resetToStock(): void {
    this.statsSystem.resetToStock();
    this.partsSystem.fromJSON({
      installed: {
        engine: this.partsSystem.getPartById('engine_stock')!,
        turbo: this.partsSystem.getPartById('turbo_stock')!,
        tires: this.partsSystem.getPartById('tires_stock')!,
        suspension: this.partsSystem.getPartById('suspension_stock')!,
        aero: this.partsSystem.getPartById('aero_stock')!,
        weight_reduction: this.partsSystem.getPartById('weight_stock')!,
      },
      owned: ['engine_stock', 'turbo_stock', 'tires_stock', 'suspension_stock', 'aero_stock', 'weight_stock'],
    });
    
    if (this.onStatChange) {
      this.onStatChange(this.statsSystem.getModifiedStats());
    }
  }
  
  /**
   * Add coins (for testing/rewards)
   */
  addCoins(amount: number): void {
    this.playerCoins += amount;
    
    if (this.onCoinsChange) {
      this.onCoinsChange(this.playerCoins);
    }
  }
  
  /**
   * Register callbacks
   */
  onStatsChange(callback: (stats: CarStatsModified) => void): void {
    this.onStatChange = callback;
  }
  
  onCoinsChanged(callback: (coins: number) => void): void {
    this.onCoinsChange = callback;
  }
  
  onPartInstalled(callback: (part: PartDefinition) => void): void {
    this.onPartInstall = callback;
  }
  
  onVisualChanged(callback: (color: string, decal: string | null) => void): void {
    this.onVisualChange = callback;
  }
  
  /**
   * Apply visual changes
   */
  private applyVisualChanges(): void {
    if (this.onVisualChange) {
      this.onVisualChange(this.state.previewColor, this.state.previewDecal);
    }
  }
}

export default CustomizationUI;
