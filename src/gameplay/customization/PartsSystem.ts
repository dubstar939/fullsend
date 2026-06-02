/**
 * Parts System - Car customization parts and upgrades
 */

import { CarStats, BaseCarStats } from './CarStats';

export type PartCategory = 'engine' | 'turbo' | 'tires' | 'suspension' | 'aero' | 'brakes' | 'nitrous' | 'ecu' | 'transmission';
export type PartTier = 'STOCK' | 'STREET' | 'SPORT' | 'RACE' | 'PRO';

export interface PartData {
  id: string;
  name: string;
  category: PartCategory;
  tier: PartTier;
  stats: Partial<BaseCarStats>;
  price: number;
  description: string;
  brand?: string;
  weightReduction?: number;  // kg saved
  isUnlockable: boolean;
  unlockCondition?: {
    type: 'WIN_BATTLE' | 'DEFEAT_RIVAL' | 'REACH_MILEAGE' | 'SPEND_MONEY';
    requirement: number | string;
  };
}

export const PART_TIERS: Record<PartTier, number> = {
  STOCK: 1,
  STREET: 2,
  SPORT: 3,
  RACE: 4,
  PRO: 5,
};

// Predefined parts database
export const PARTS_DATABASE: PartData[] = [
  // Engine Parts
  {
    id: 'engine_stage1',
    name: 'Stage 1 Engine Tune',
    category: 'engine',
    tier: 'STREET',
    stats: { acceleration: 0.05, topSpeed: 0.03 },
    price: 5000,
    description: 'Basic ECU remap and intake upgrade.',
    brand: 'TR-Performance',
  },
  {
    id: 'engine_stage2',
    name: 'Stage 2 Engine Build',
    category: 'engine',
    tier: 'SPORT',
    stats: { acceleration: 0.1, topSpeed: 0.06 },
    price: 15000,
    description: 'Forged internals and high-lift cams.',
    brand: 'TR-Performance',
  },
  {
    id: 'engine_stage3',
    name: 'Stage 3 Race Engine',
    category: 'engine',
    tier: 'RACE',
    stats: { acceleration: 0.15, topSpeed: 0.1 },
    price: 35000,
    description: 'Full race build with balanced rotating assembly.',
    brand: 'TR-Performance',
  },
  {
    id: 'engine_swap_v8',
    name: 'V8 Engine Swap',
    category: 'engine',
    tier: 'PRO',
    stats: { acceleration: 0.2, topSpeed: 0.15, stability: 0.05 },
    price: 75000,
    description: 'American V8 power in a lightweight chassis.',
    brand: 'Custom',
    isUnlockable: true,
    unlockCondition: { type: 'SPEND_MONEY', requirement: 500000 },
  },
  
  // Turbo Systems
  {
    id: 'turbo_stage1',
    name: 'Stage 1 Turbo Kit',
    category: 'turbo',
    tier: 'STREET',
    stats: { acceleration: 0.08, topSpeed: 0.04 },
    price: 8000,
    description: 'Entry-level boost upgrade.',
    brand: 'BoostWorks',
  },
  {
    id: 'turbo_stage2',
    name: 'Stage 2 Turbo Kit',
    category: 'turbo',
    tier: 'SPORT',
    stats: { acceleration: 0.12, topSpeed: 0.08 },
    price: 20000,
    description: 'Larger compressor wheel and intercooler.',
    brand: 'BoostWorks',
  },
  {
    id: 'turbo_stage3',
    name: 'Stage 3 Twin Turbo',
    category: 'turbo',
    tier: 'RACE',
    stats: { acceleration: 0.18, topSpeed: 0.12 },
    price: 45000,
    description: 'Twin turbo setup for maximum power.',
    brand: 'BoostWorks',
    isUnlockable: true,
    unlockCondition: { type: 'WIN_BATTLE', requirement: 20 },
  },
  
  // Tires
  {
    id: 'tires_sport',
    name: 'Sport Compound Tires',
    category: 'tires',
    tier: 'STREET',
    stats: { grip: 0.08, handling: 0.05 },
    price: 3000,
    description: 'Sticky rubber for better cornering.',
    brand: 'GripMax',
  },
  {
    id: 'tires_race',
    name: 'Race Slick Tires',
    category: 'tires',
    tier: 'SPORT',
    stats: { grip: 0.15, handling: 0.1 },
    price: 8000,
    description: 'Full racing slicks for maximum grip.',
    brand: 'GripMax',
  },
  {
    id: 'tires_pro',
    name: 'Pro Spec Racing Tires',
    category: 'tires',
    tier: 'RACE',
    stats: { grip: 0.2, handling: 0.15 },
    price: 15000,
    description: 'Professional grade racing compound.',
    brand: 'GripMax',
  },
  
  // Suspension
  {
    id: 'suspension_coilovers',
    name: 'Adjustable Coilovers',
    category: 'suspension',
    tier: 'STREET',
    stats: { handling: 0.08, stability: 0.05 },
    price: 4000,
    description: 'Lowered ride height and adjustable damping.',
    brand: 'Suspex',
  },
  {
    id: 'suspension_sport',
    name: 'Sport Suspension Kit',
    category: 'suspension',
    tier: 'SPORT',
    stats: { handling: 0.12, stability: 0.08 },
    price: 10000,
    description: 'Upgraded springs and dampers.',
    brand: 'Suspex',
  },
  {
    id: 'suspension_race',
    name: 'Full Race Suspension',
    category: 'suspension',
    tier: 'RACE',
    stats: { handling: 0.18, stability: 0.12 },
    price: 25000,
    description: 'Complete race-spec suspension system.',
    brand: 'Suspex',
  },
  
  // Aero
  {
    id: 'aero_lipkit',
    name: 'Aero Lip Kit',
    category: 'aero',
    tier: 'STREET',
    stats: { stability: 0.05, topSpeed: 0.02 },
    price: 2000,
    description: 'Front lip and side skirts.',
    brand: 'AeroDynamics',
  },
  {
    id: 'aeroSpoiler',
    name: 'GT Wing Spoiler',
    category: 'aero',
    tier: 'SPORT',
    stats: { stability: 0.1, handling: 0.05 },
    price: 5000,
    description: 'Large rear wing for downforce.',
    brand: 'AeroDynamics',
  },
  {
    id: 'aero_full',
    name: 'Full Aero Package',
    category: 'aero',
    tier: 'RACE',
    stats: { stability: 0.15, handling: 0.1, topSpeed: 0.05 },
    price: 12000,
    description: 'Complete body kit with diffuser.',
    brand: 'AeroDynamics',
  },
  
  // Brakes
  {
    id: 'brakes_street',
    name: 'Sport Brake Pads',
    category: 'brakes',
    tier: 'STREET',
    stats: { braking: 0.08 },
    price: 1500,
    description: 'High-friction brake pads.',
    brand: 'StopTech',
  },
  {
    id: 'brakes_big_kit',
    name: 'Big Brake Kit',
    category: 'brakes',
    tier: 'SPORT',
    stats: { braking: 0.15 },
    price: 6000,
    description: 'Larger rotors and multi-piston calipers.',
    brand: 'StopTech',
  },
  {
    id: 'brakes_carbon',
    name: 'Carbon Ceramic Brakes',
    category: 'brakes',
    tier: 'PRO',
    stats: { braking: 0.25, spResistance: 0.05 },
    price: 20000,
    description: 'Race-proven carbon ceramic system.',
    brand: 'StopTech',
  },
  
  // Nitrous
  {
    id: 'nitrous_50shot',
    name: '50hp Nitrous Shot',
    category: 'nitrous',
    tier: 'STREET',
    stats: { acceleration: 0.1 },
    price: 3000,
    description: 'Entry-level nitrous system.',
    brand: 'NitroX',
  },
  {
    id: 'nitrous_100shot',
    name: '100hp Nitrous Shot',
    category: 'nitrous',
    tier: 'SPORT',
    stats: { acceleration: 0.18 },
    price: 7000,
    description: 'Medium shot for serious power.',
    brand: 'NitroX',
  },
  {
    id: 'nitrous_200shot',
    name: '200hp Nitrous Shot',
    category: 'nitrous',
    tier: 'RACE',
    stats: { acceleration: 0.3 },
    price: 15000,
    description: 'Maximum legal nitrous setup.',
    brand: 'NitroX',
    isUnlockable: true,
    unlockCondition: { type: 'DEFEAT_RIVAL', requirement: 'boss' },
  },
];

export class PartsSystem {
  private installedParts: Map<string, PartData>;
  private availableParts: Map<string, PartData>;
  private ownedParts: Set<string>;

  constructor() {
    this.installedParts = new Map();
    this.availableParts = new Map();
    this.ownedParts = new Set();
    
    // Initialize available parts
    for (const part of PARTS_DATABASE) {
      this.availableParts.set(part.id, part);
    }
  }

  /**
   * Install a part on the car
   */
  installPart(partId: string): boolean {
    const part = this.availableParts.get(partId);
    if (!part) return false;

    // Remove existing part in same category
    this.removePartByCategory(part.category);

    this.installedParts.set(partId, part);
    return true;
  }

  /**
   * Remove a specific part
   */
  removePart(partId: string): void {
    this.installedParts.delete(partId);
  }

  /**
   * Remove part by category
   */
  removePartByCategory(category: PartCategory): void {
    for (const [id, part] of this.installedParts.entries()) {
      if (part.category === category) {
        this.installedParts.delete(id);
        break;
      }
    }
  }

  /**
   * Get all installed parts
   */
  getInstalledParts(): PartData[] {
    return Array.from(this.installedParts.values());
  }

  /**
   * Get installed part by category
   */
  getPartByCategory(category: PartCategory): PartData | null {
    for (const part of this.installedParts.values()) {
      if (part.category === category) {
        return part;
      }
    }
    return null;
  }

  /**
   * Apply installed parts to car stats
   */
  applyToStats(stats: CarStats): void {
    stats.clearModifiers();
    
    for (const part of this.installedParts.values()) {
      for (const [statKey, statValue] of Object.entries(part.stats)) {
        stats.applyModifier(statKey as keyof BaseCarStats, statValue);
      }
    }
  }

  /**
   * Calculate total stats from parts
   */
  calculateTotalStats(): Partial<BaseCarStats> {
    const total: Partial<BaseCarStats> = {};
    
    for (const part of this.installedParts.values()) {
      for (const [key, value] of Object.entries(part.stats)) {
        total[key as keyof BaseCarStats] = (total[key as keyof BaseCarStats] ?? 0) + value;
      }
    }
    
    return total;
  }

  /**
   * Get total price of installed parts
   */
  getTotalValue(): number {
    let total = 0;
    for (const part of this.installedParts.values()) {
      total += part.price;
    }
    return total;
  }

  /**
   * Check if a part is unlocked/available
   */
  isPartUnlocked(partId: string, playerProgress: {
    wins: number;
    defeatedRivals: string[];
    mileage: number;
    moneySpent: number;
  }): boolean {
    const part = this.availableParts.get(partId);
    if (!part || !part.isUnlockable || !part.unlockCondition) return true;

    switch (part.unlockCondition.type) {
      case 'WIN_BATTLE':
        return playerProgress.wins >= (part.unlockCondition.requirement as number);
      case 'DEFEAT_RIVAL':
        return playerProgress.defeatedRivals.includes(part.unlockCondition.requirement as string);
      case 'REACH_MILEAGE':
        return playerProgress.mileage >= (part.unlockCondition.requirement as number);
      case 'SPEND_MONEY':
        return playerProgress.moneySpent >= (part.unlockCondition.requirement as number);
      default:
        return true;
    }
  }

  /**
   * Get parts by category
   */
  getPartsByCategory(category: PartCategory): PartData[] {
    return PARTS_DATABASE.filter(p => p.category === category);
  }

  /**
   * Get parts by tier
   */
  getPartsByTier(tier: PartTier): PartData[] {
    return PARTS_DATABASE.filter(p => p.tier === tier);
  }

  /**
   * Purchase a part
   */
  purchasePart(partId: string): boolean {
    const part = this.availableParts.get(partId);
    if (!part || this.ownedParts.has(partId)) return false;
    
    this.ownedParts.add(partId);
    return true;
  }

  /**
   * Check if part is owned
   */
  isOwned(partId: string): boolean {
    return this.ownedParts.has(partId);
  }

  /**
   * Serialize parts system for save
   */
  serialize(): { installed: string[]; owned: string[] } {
    return {
      installed: Array.from(this.installedParts.keys()),
      owned: Array.from(this.ownedParts),
    };
  }

  /**
   * Deserialize parts system from save
   */
  deserialize(data: { installed?: string[]; owned?: string[] }): void {
    this.installedParts.clear();
    this.ownedParts.clear();
    
    if (data.owned) {
      for (const id of data.owned) {
        this.ownedParts.add(id);
      }
    }
    
    if (data.installed) {
      for (const id of data.installed) {
        const part = this.availableParts.get(id);
        if (part) {
          this.installedParts.set(id, part);
        }
      }
    }
  }
}
