/**
 * Parts System - Tokyo Xtreme Racer Style
 * Manages car part upgrades and their effects on performance
 */

import { CarStatsSystem } from './CarStats';

export type PartCategory = 'engine' | 'turbo' | 'tires' | 'suspension' | 'aero' | 'weight_reduction';

export type PartTier = 'stock' | 'street' | 'sport' | 'race' | 'pro';

export interface PartDefinition {
  id: string;
  name: string;
  category: PartCategory;
  tier: PartTier;
  price: number;
  brand?: string;
  description?: string;
  statBonuses: {
    topSpeed?: number;
    acceleration?: number;
    handling?: number;
    stability?: number;
    grip?: number;
    spResistance?: number;
  };
  requirements?: {
    minLevel?: number;
    requiredPartId?: string;
    requiredClubReputation?: { clubId: string; minReputation: number };
  };
}

// Part definitions database
export const PARTS_DATABASE: PartDefinition[] = [
  // Engine Parts
  {
    id: 'engine_stock',
    name: 'Stock Engine',
    category: 'engine',
    tier: 'stock',
    price: 0,
    statBonuses: {},
  },
  {
    id: 'engine_street',
    name: 'Street Performance Engine',
    category: 'engine',
    tier: 'street',
    price: 5000,
    brand: 'TRUST',
    statBonuses: { acceleration: 0.05, topSpeed: 0.03 },
  },
  {
    id: 'engine_sport',
    name: 'Sport Tuned Engine',
    category: 'engine',
    tier: 'sport',
    price: 12000,
    brand: 'HKS',
    statBonuses: { acceleration: 0.1, topSpeed: 0.06 },
  },
  {
    id: 'engine_race',
    name: 'Race Spec Engine',
    category: 'engine',
    tier: 'race',
    price: 25000,
    brand: 'NISMO',
    statBonuses: { acceleration: 0.15, topSpeed: 0.1 },
  },
  {
    id: 'engine_pro',
    name: 'Pro Racing Engine',
    category: 'engine',
    tier: 'pro',
    price: 50000,
    brand: 'Mugen',
    statBonuses: { acceleration: 0.2, topSpeed: 0.15 },
  },
  
  // Turbo Parts
  {
    id: 'turbo_stock',
    name: 'Stock Turbo',
    category: 'turbo',
    tier: 'stock',
    price: 0,
    statBonuses: {},
  },
  {
    id: 'turbo_street',
    name: 'Street Boost Kit',
    category: 'turbo',
    tier: 'street',
    price: 4000,
    brand: 'GReddy',
    statBonuses: { acceleration: 0.08, topSpeed: 0.04 },
  },
  {
    id: 'turbo_sport',
    name: 'Sport Turbo System',
    category: 'turbo',
    tier: 'sport',
    price: 10000,
    brand: 'Blitz',
    statBonuses: { acceleration: 0.15, topSpeed: 0.08 },
  },
  {
    id: 'turbo_race',
    name: 'Race Turbo Kit',
    category: 'turbo',
    tier: 'race',
    price: 22000,
    brand: 'APEXi',
    statBonuses: { acceleration: 0.22, topSpeed: 0.12 },
  },
  {
    id: 'turbo_pro',
    name: 'Pro Boost System',
    category: 'turbo',
    tier: 'pro',
    price: 45000,
    brand: 'HKS',
    statBonuses: { acceleration: 0.3, topSpeed: 0.18 },
  },
  
  // Tire Parts
  {
    id: 'tires_stock',
    name: 'Stock Tires',
    category: 'tires',
    tier: 'stock',
    price: 0,
    statBonuses: {},
  },
  {
    id: 'tires_street',
    name: 'Street Performance Tires',
    category: 'tires',
    tier: 'street',
    price: 3000,
    brand: 'Bridgestone',
    statBonuses: { grip: 0.06, handling: 0.04 },
  },
  {
    id: 'tires_sport',
    name: 'Sport Compound Tires',
    category: 'tires',
    tier: 'sport',
    price: 8000,
    brand: 'Yokohama',
    statBonuses: { grip: 0.12, handling: 0.08 },
  },
  {
    id: 'tires_race',
    name: 'Racing Slicks',
    category: 'tires',
    tier: 'race',
    price: 18000,
    brand: 'Toyo',
    statBonuses: { grip: 0.18, handling: 0.12 },
  },
  {
    id: 'tires_pro',
    name: 'Pro Racing Compounds',
    category: 'tires',
    tier: 'pro',
    price: 35000,
    brand: 'Michelin',
    statBonuses: { grip: 0.25, handling: 0.18 },
  },
  
  // Suspension Parts
  {
    id: 'suspension_stock',
    name: 'Stock Suspension',
    category: 'suspension',
    tier: 'stock',
    price: 0,
    statBonuses: {},
  },
  {
    id: 'suspension_street',
    name: 'Street Coilovers',
    category: 'suspension',
    tier: 'street',
    price: 3500,
    brand: 'TEIN',
    statBonuses: { handling: 0.07, stability: 0.05 },
  },
  {
    id: 'suspension_sport',
    name: 'Sport Suspension Kit',
    category: 'suspension',
    tier: 'sport',
    price: 9000,
    brand: 'KW',
    statBonuses: { handling: 0.14, stability: 0.1 },
  },
  {
    id: 'suspension_race',
    name: 'Race Suspension System',
    category: 'suspension',
    tier: 'race',
    price: 20000,
    brand: 'Ohlins',
    statBonuses: { handling: 0.21, stability: 0.15 },
  },
  {
    id: 'suspension_pro',
    name: 'Pro Racing Suspension',
    category: 'suspension',
    tier: 'pro',
    price: 40000,
    brand: 'Penske',
    statBonuses: { handling: 0.28, stability: 0.2 },
  },
  
  // Aero Parts
  {
    id: 'aero_stock',
    name: 'Stock Body Kit',
    category: 'aero',
    tier: 'stock',
    price: 0,
    statBonuses: {},
  },
  {
    id: 'aero_street',
    name: 'Street Aero Kit',
    category: 'aero',
    tier: 'street',
    price: 4000,
    brand: 'Veilside',
    statBonuses: { stability: 0.08, handling: 0.03 },
  },
  {
    id: 'aero_sport',
    name: 'Sport Body Kit',
    category: 'aero',
    tier: 'sport',
    price: 10000,
    brand: 'Top Secret',
    statBonuses: { stability: 0.16, handling: 0.06 },
  },
  {
    id: 'aero_race',
    name: 'Race Aero Package',
    category: 'aero',
    tier: 'race',
    price: 22000,
    brand: 'Voltex',
    statBonuses: { stability: 0.24, handling: 0.09 },
  },
  {
    id: 'aero_pro',
    name: 'Pro Downforce Kit',
    category: 'aero',
    tier: 'pro',
    price: 45000,
    brand: 'Sorcery',
    statBonuses: { stability: 0.32, handling: 0.12 },
  },
  
  // Weight Reduction
  {
    id: 'weight_stock',
    name: 'Stock Weight',
    category: 'weight_reduction',
    tier: 'stock',
    price: 0,
    statBonuses: {},
  },
  {
    id: 'weight_street',
    name: 'Lightweight Battery',
    category: 'weight_reduction',
    tier: 'street',
    price: 2000,
    brand: 'Braille',
    statBonuses: { acceleration: 0.04, handling: 0.03 },
  },
  {
    id: 'weight_sport',
    name: 'Carbon Hood & Trunk',
    category: 'weight_reduction',
    tier: 'sport',
    price: 6000,
    brand: 'Seibon',
    statBonuses: { acceleration: 0.08, handling: 0.06 },
  },
  {
    id: 'weight_race',
    name: 'Full Interior Strip',
    category: 'weight_reduction',
    tier: 'race',
    price: 15000,
    brand: 'C-West',
    statBonuses: { acceleration: 0.12, handling: 0.09 },
  },
  {
    id: 'weight_pro',
    name: 'Full Carbon Body',
    category: 'weight_reduction',
    tier: 'pro',
    price: 35000,
    brand: 'Do-Luck',
    statBonuses: { acceleration: 0.16, handling: 0.12 },
  },
];

export interface InstalledParts {
  engine: PartDefinition;
  turbo: PartDefinition;
  tires: PartDefinition;
  suspension: PartDefinition;
  aero: PartDefinition;
  weight_reduction: PartDefinition;
}

export class PartsSystem {
  private installedParts: InstalledParts;
  private ownedParts: Set<string> = new Set();
  private statsSystem: CarStatsSystem;
  
  constructor(statsSystem: CarStatsSystem) {
    this.statsSystem = statsSystem;
    
    // Initialize with stock parts
    this.installedParts = {
      engine: this.getPartById('engine_stock')!,
      turbo: this.getPartById('turbo_stock')!,
      tires: this.getPartById('tires_stock')!,
      suspension: this.getPartById('suspension_stock')!,
      aero: this.getPartById('aero_stock')!,
      weight_reduction: this.getPartById('weight_stock')!,
    };
    
    // Mark stock parts as owned
    this.ownedParts.add('engine_stock');
    this.ownedParts.add('turbo_stock');
    this.ownedParts.add('tires_stock');
    this.ownedParts.add('suspension_stock');
    this.ownedParts.add('aero_stock');
    this.ownedParts.add('weight_stock');
  }
  
  /**
   * Get part by ID
   */
  getPartById(id: string): PartDefinition | undefined {
    return PARTS_DATABASE.find(p => p.id === id);
  }
  
  /**
   * Get all parts for a category
   */
  getPartsByCategory(category: PartCategory): PartDefinition[] {
    return PARTS_DATABASE.filter(p => p.category === category);
  }
  
  /**
   * Get parts by tier
   */
  getPartsByTier(tier: PartTier): PartDefinition[] {
    return PARTS_DATABASE.filter(p => p.tier === tier);
  }
  
  /**
   * Check if player can buy a part
   */
  canBuyPart(part: PartDefinition, playerCoins: number, playerLevel: number, clubReputations: Record<string, number>): {
    canBuy: boolean;
    reason?: string;
  } {
    if (this.ownedParts.has(part.id)) {
      return { canBuy: false, reason: 'Already owned' };
    }
    
    if (playerCoins < part.price) {
      return { canBuy: false, reason: `Need ${part.price - playerCoins} more coins` };
    }
    
    if (part.requirements?.minLevel && playerLevel < part.requirements.minLevel) {
      return { canBuy: false, reason: `Requires level ${part.requirements.minLevel}` };
    }
    
    if (part.requirements?.requiredPartId && !this.ownedParts.has(part.requirements.requiredPartId)) {
      const requiredPart = this.getPartById(part.requirements.requiredPartId);
      return { canBuy: false, reason: `Requires ${requiredPart?.name ?? part.requirements.requiredPartId}` };
    }
    
    if (part.requirements?.requiredClubReputation) {
      const { clubId, minReputation } = part.requirements.requiredClubReputation;
      const currentRep = clubReputations[clubId] ?? 0;
      
      if (currentRep < minReputation) {
        return { canBuy: false, reason: `Requires ${minReputation} reputation with ${clubId}` };
      }
    }
    
    return { canBuy: true };
  }
  
  /**
   * Buy a part
   */
  buyPart(part: PartDefinition, playerCoins: number): { success: boolean; newCoins: number; reason?: string } {
    const canBuy = this.canBuyPart(part, playerCoins, 0, {});
    
    if (!canBuy.canBuy) {
      return { success: false, newCoins: playerCoins, reason: canBuy.reason };
    }
    
    this.ownedParts.add(part.id);
    return { success: true, newCoins: playerCoins - part.price };
  }
  
  /**
   * Install a part
   */
  installPart(partId: string): { success: boolean; reason?: string } {
    const part = this.getPartById(partId);
    
    if (!part) {
      return { success: false, reason: 'Part not found' };
    }
    
    if (!this.ownedParts.has(partId)) {
      return { success: false, reason: 'Part not owned' };
    }
    
    this.installedParts[part.category] = part;
    this.applyPartEffects();
    
    return { success: true };
  }
  
  /**
   * Get currently installed part for category
   */
  getInstalledPart(category: PartCategory): PartDefinition {
    return this.installedParts[category];
  }
  
  /**
   * Get all installed parts
   */
  getAllInstalledParts(): InstalledParts {
    return { ...this.installedParts };
  }
  
  /**
   * Get owned parts
   */
  getOwnedParts(): PartDefinition[] {
    return PARTS_DATABASE.filter(p => this.ownedParts.has(p.id));
  }
  
  /**
   * Check if part is owned
   */
  isPartOwned(partId: string): boolean {
    return this.ownedParts.has(partId);
  }
  
  /**
   * Calculate total value of installed parts
   */
  calculateTotalValue(): number {
    let total = 0;
    
    for (const part of Object.values(this.installedParts)) {
      total += part.price;
    }
    
    return total;
  }
  
  /**
   * Get performance rating based on parts
   */
  calculatePerformanceRating(): number {
    return this.statsSystem.calculatePerformanceRating();
  }
  
  /**
   * Export parts data
   */
  toJSON(): { installed: InstalledParts; owned: string[] } {
    return {
      installed: this.installedParts,
      owned: Array.from(this.ownedParts),
    };
  }
  
  /**
   * Import parts data
   */
  fromJSON(data: { installed: Partial<InstalledParts>; owned: string[] }): void {
    for (const partId of data.owned) {
      this.ownedParts.add(partId);
    }
    
    if (data.installed) {
      for (const [category, part] of Object.entries(data.installed)) {
        if (part && this.getPartById(part.id)) {
          this.installedParts[category as keyof InstalledParts] = part;
        }
      }
    }
    
    this.applyPartEffects();
  }
  
  /**
   * Apply part effects to stats system
   */
  private applyPartEffects(): void {
    // Reset modifiers
    this.statsSystem.resetToStock();
    
    // Apply each installed part's bonuses
    for (const part of Object.values(this.installedParts)) {
      const bonuses = part.statBonuses;
      
      // Convert stat bonuses to modifier levels (simplified)
      let totalBonus = 0;
      
      for (const bonus of Object.values(bonuses)) {
        totalBonus += bonus ?? 0;
      }
      
      // Map total bonus to modifier level (0-5)
      const modifierLevel = Math.min(5, Math.floor(totalBonus / 0.05));
      
      this.statsSystem.setModifier(part.category, modifierLevel);
    }
  }
}

export default PartsSystem;
