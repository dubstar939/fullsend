/**
 * Customization UI Logic - Car customization interface controller
 * Note: This is logic only, no React components
 */

import { CarStats, BaseCarStats } from './CarStats';
import { PartsSystem, PartData, PartCategory, PartTier } from './PartsSystem';

export interface ColorOption {
  name: string;
  hex: string;
  type: 'solid' | 'metallic' | 'pearl' | 'matte';
  price: number;
}

export interface DecalOption {
  id: string;
  name: string;
  textureUrl: string;
  position: 'hood' | 'roof' | 'sides' | 'rear';
  rotation: number;
  scale: number;
  price: number;
}

export const COLOR_OPTIONS: ColorOption[] = [
  { name: 'Crystal White', hex: '#ffffff', type: 'solid', price: 0 },
  { name: 'Midnight Black', hex: '#1a1a1a', type: 'solid', price: 0 },
  { name: 'Victory Red', hex: '#dc2626', type: 'metallic', price: 500 },
  { name: 'Lightning Blue', hex: '#3b82f6', type: 'metallic', price: 500 },
  { name: 'Sunset Orange', hex: '#f97316', type: 'pearl', price: 800 },
  { name: 'Forest Green', hex: '#166534', type: 'metallic', price: 500 },
  { name: 'Royal Purple', hex: '#7c3aed', type: 'pearl', price: 800 },
  { name: 'Silver Metallic', hex: '#9ca3af', type: 'metallic', price: 300 },
  { name: 'Gold Rush', hex: '#eab308', type: 'pearl', price: 1000 },
  { name: 'Stealth Matte', hex: '#374151', type: 'matte', price: 1200 },
];

export const DECAL_OPTIONS: DecalOption[] = [
  { id: 'racing_stripe', name: 'Racing Stripe', textureUrl: '/decals/stripe.png', position: 'hood', rotation: 0, scale: 1, price: 200 },
  { id: 'flame_left', name: 'Left Flame', textureUrl: '/decals/flame_l.png', position: 'sides', rotation: 45, scale: 1.2, price: 400 },
  { id: 'flame_right', name: 'Right Flame', textureUrl: '/decals/flame_r.png', position: 'sides', rotation: -45, scale: 1.2, price: 400 },
  { id: 'tribal', name: 'Tribal Design', textureUrl: '/decals/tribal.png', position: 'hood', rotation: 0, scale: 1.5, price: 600 },
  { id: 'number_plate', name: 'Race Number', textureUrl: '/decals/number.png', position: 'sides', rotation: 0, scale: 0.8, price: 150 },
  { id: 'sponsor_logo', name: 'Sponsor Logo', textureUrl: '/decals/sponsor.png', position: 'hood', rotation: 0, scale: 0.6, price: 300 },
  { id: 'checkered', name: 'Checkered Flag', textureUrl: '/decals/checkered.png', position: 'roof', rotation: 0, scale: 1, price: 250 },
];

export interface CustomizationState {
  selectedColor: ColorOption;
  installedDecals: DecalOption[];
  currentTab: 'parts' | 'visual' | 'stats';
  selectedCategory: PartCategory | null;
  previewRotation: number;
  canAfford: boolean;
}

export interface PlayerWallet {
  money: number;
}

export class CustomizationUI {
  private partsSystem: PartsSystem;
  private carStats: CarStats;
  private wallet: PlayerWallet;
  private state: CustomizationState;
  private onChangeCallbacks: Set<(state: CustomizationState) => void>;

  constructor(partsSystem: PartsSystem, carStats: CarStats, initialMoney: number) {
    this.partsSystem = partsSystem;
    this.carStats = carStats;
    this.wallet = { money: initialMoney };
    this.state = {
      selectedColor: COLOR_OPTIONS[0],
      installedDecals: [],
      currentTab: 'parts',
      selectedCategory: null,
      previewRotation: 0,
      canAfford: true,
    };
    this.onChangeCallbacks = new Set();
  }

  subscribe(callback: (state: CustomizationState) => void): () => void {
    this.onChangeCallbacks.add(callback);
    return () => this.onChangeCallbacks.delete(callback);
  }

  private notifyChange(): void {
    this.updateAffordability();
    this.onChangeCallbacks.forEach(cb => cb({ ...this.state }));
  }

  private updateAffordability(): void {
    // Check if player can afford currently selected items
    this.state.canAfford = this.wallet.money >= 0;
  }

  /**
   * Set current player money
   */
  setMoney(amount: number): void {
    this.wallet.money = amount;
    this.notifyChange();
  }

  /**
   * Switch to a tab
   */
  switchTab(tab: 'parts' | 'visual' | 'stats'): void {
    this.state.currentTab = tab;
    this.notifyChange();
  }

  /**
   * Select a part category for viewing
   */
  selectCategory(category: PartCategory): void {
    this.state.selectedCategory = category;
    this.notifyChange();
  }

  /**
   * Install a part
   */
  installPart(partId: string): { success: boolean; cost: number; message?: string } {
    const part = this.partsSystem.getPartsByCategory('engine').find(p => p.id === partId) ||
                 this.partsSystem.getPartsByCategory('turbo').find(p => p.id === partId) ||
                 this.partsSystem.getPartsByCategory('tires').find(p => p.id === partId) ||
                 this.partsSystem.getPartsByCategory('suspension').find(p => p.id === partId) ||
                 this.partsSystem.getPartsByCategory('aero').find(p => p.id === partId) ||
                 this.partsSystem.getPartsByCategory('brakes').find(p => p.id === partId) ||
                 this.partsSystem.getPartsByCategory('nitrous').find(p => p.id === partId);

    if (!part) {
      return { success: false, cost: 0, message: 'Part not found' };
    }

    if (this.wallet.money < part.price) {
      return { success: false, cost: part.price, message: 'Insufficient funds' };
    }

    // Purchase and install
    this.wallet.money -= part.price;
    this.partsSystem.purchasePart(partId);
    this.partsSystem.installPart(partId);
    
    // Recalculate stats
    this.partsSystem.applyToStats(this.carStats);

    this.notifyChange();
    return { success: true, cost: part.price };
  }

  /**
   * Remove a part
   */
  removePart(category: PartCategory): void {
    this.partsSystem.removePartByCategory(category);
    this.partsSystem.applyToStats(this.carStats);
    this.notifyChange();
  }

  /**
   * Set car color
   */
  setColor(color: ColorOption): { success: boolean; cost: number } {
    const cost = color.price;
    
    if (this.state.selectedColor.name !== color.name && this.wallet.money < cost) {
      return { success: false, cost };
    }

    if (this.state.selectedColor.name !== color.name) {
      this.wallet.money -= cost;
    }

    this.state.selectedColor = color;
    this.notifyChange();
    return { success: true, cost };
  }

  /**
   * Add a decal
   */
  addDecal(decal: DecalOption): { success: boolean; cost: number } {
    if (this.wallet.money < decal.price) {
      return { success: false, cost: decal.price };
    }

    this.wallet.money -= decal.price;
    this.state.installedDecals.push(decal);
    this.notifyChange();
    return { success: true, cost: decal.price };
  }

  /**
   * Remove a decal
   */
  removeDecal(decalId: string): void {
    this.state.installedDecals = this.state.installedDecals.filter(d => d.id !== decalId);
    this.notifyChange();
  }

  /**
   * Rotate preview model
   */
  rotatePreview(delta: number): void {
    this.state.previewRotation = (this.state.previewRotation + delta) % 360;
    this.notifyChange();
  }

  /**
   * Get available parts for a category
   */
  getAvailableParts(category: PartCategory): PartData[] {
    return this.partsSystem.getPartsByCategory(category);
  }

  /**
   * Get installed parts
   */
  getInstalledParts(): PartData[] {
    return this.partsSystem.getInstalledParts();
  }

  /**
   * Get current car stats
   */
  getCurrentStats(): import('./CarStats').ModifiedCarStats {
    return this.carStats.getModifiedStats();
  }

  /**
   * Get stat comparison (before/after part selection)
   */
  getStatComparison(part: PartData | null): Record<string, { before: number; after: number; diff: number }> {
    const current = this.getCurrentStats();
    const result: Record<string, { before: number; after: number; diff: number }> = {};

    const stats: Array<keyof BaseCarStats> = ['acceleration', 'topSpeed', 'handling', 'stability', 'spResistance', 'braking', 'grip'];

    for (const stat of stats) {
      const before = current[`final${this.capitalize(stat)}` as keyof typeof current] as number;
      const partBonus = part?.stats[stat] ?? 0;
      const after = Math.max(0, Math.min(1, before + partBonus));
      
      result[stat] = {
        before,
        after,
        diff: after - before,
      };
    }

    return result;
  }

  /**
   * Get all colors
   */
  getAllColors(): ColorOption[] {
    return COLOR_OPTIONS;
  }

  /**
   * Get all decals
   */
  getAllDecals(): DecalOption[] {
    return DECAL_OPTIONS;
  }

  /**
   * Get current state
   */
  getState(): CustomizationState {
    return { ...this.state };
  }

  /**
   * Get current money
   */
  getMoney(): number {
    return this.wallet.money;
  }

  /**
   * Calculate total customization value
   */
  getTotalValue(): number {
    const partsValue = this.partsSystem.getTotalValue();
    const colorValue = this.state.selectedColor.price;
    const decalsValue = this.state.installedDecals.reduce((sum, d) => sum + d.price, 0);
    return partsValue + colorValue + decalsValue;
  }

  /**
   * Reset visual customization
   */
  resetVisuals(): void {
    this.state.selectedColor = COLOR_OPTIONS[0];
    this.state.installedDecals = [];
    this.notifyChange();
  }

  /**
   * Serialize customization state
   */
  serialize(): object {
    return {
      parts: this.partsSystem.serialize(),
      stats: this.carStats.serialize(),
      visuals: {
        color: this.state.selectedColor,
        decals: this.state.installedDecals.map(d => d.id),
      },
      wallet: { ...this.wallet },
    };
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
