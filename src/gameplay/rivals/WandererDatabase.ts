/**
 * Wanderer Database - Special rivals with unique spawn conditions
 */

import { RivalStats } from './RivalComponent';

export interface WandererConditions {
  carModel?: string;          // Required player car model
  timeRange?: [number, number]; // Hour range (0-24)
  mileage?: number;           // Minimum total mileage
  weather?: string;           // Weather condition
  speed?: number;             // Minimum speed to trigger
  dayOfWeek?: number[];       // 0-6 (Sunday-Saturday)
}

export interface WandererData {
  id: string;
  name: string;
  stats: Omit<RivalStats, 'name' | 'carModel'>;
  carModel: string;
  conditions: WandererConditions;
  isDefeated: boolean;
  specialReward?: {
    type: 'MONEY' | 'PART' | 'CAR' | 'TITLE';
    value: string | number;
  };
  lore: string;               // Backstory/description
}

export const DEFAULT_WANDERERS: WandererData[] = [
  {
    id: 'wanderer_silver_ghost',
    name: 'Silver Ghost',
    stats: {
      sp: 1500,
      maxSP: 1500,
      aggression: 0.7,
      skill: 0.8,
      stamina: 0.9,
      reputation: 500,
    },
    carModel: 'skyline_gt_r',
    conditions: {
      timeRange: [22, 5],     // 10 PM - 5 AM
      mileage: 50000,
      weather: 'clear',
      speed: 200,
    },
    isDefeated: false,
    specialReward: {
      type: 'PART',
      value: 'turbo_stage3',
    },
    lore: 'A mysterious driver in a silver GT-R. Only appears on clear nights.',
  },
  {
    id: 'wanderer_red_devil',
    name: 'Red Devil',
    stats: {
      sp: 1800,
      maxSP: 1800,
      aggression: 0.9,
      skill: 0.85,
      stamina: 0.7,
      reputation: 600,
    },
    carModel: 'rx7_fd',
    conditions: {
      timeRange: [0, 4],
      mileage: 100000,
      weather: 'rain',
      speed: 220,
    },
    isDefeated: false,
    specialReward: {
      type: 'CAR',
      value: 'rx7_fd_special',
    },
    lore: 'The devil rides in the rain. Challenge if you dare.',
  },
  {
    id: 'wanderer_black_shadow',
    name: 'Black Shadow',
    stats: {
      sp: 2000,
      maxSP: 2000,
      aggression: 0.6,
      skill: 0.95,
      stamina: 0.8,
      reputation: 750,
    },
    carModel: 'supra_mk4',
    conditions: {
      timeRange: [1, 3],
      mileage: 200000,
      weather: 'clear',
      speed: 250,
      dayOfWeek: [5, 6],      // Weekend only
    },
    isDefeated: false,
    specialReward: {
      type: 'TITLE',
      value: 'Shadow Hunter',
    },
    lore: 'Weekend warrior of the midnight highway. A true test of skill.',
  },
  {
    id: 'wanderer_blue_lightning',
    name: 'Blue Lightning',
    stats: {
      sp: 1600,
      maxSP: 1600,
      aggression: 0.8,
      skill: 0.75,
      stamina: 0.85,
      reputation: 450,
    },
    carModel: 'evo_ix',
    conditions: {
      timeRange: [6, 9],      // Early morning
      mileage: 75000,
      weather: 'fog',
      speed: 180,
    },
    isDefeated: false,
    specialReward: {
      type: 'MONEY',
      value: 50000,
    },
    lore: 'Morning commuter by day, lightning bolt by dawn.',
  },
  {
    id: 'wanderer_gold_emperor',
    name: 'Gold Emperor',
    stats: {
      sp: 2500,
      maxSP: 2500,
      aggression: 0.5,
      skill: 1.0,
      stamina: 1.0,
      reputation: 1000,
    },
    carModel: 'nsx',
    conditions: {
      timeRange: [12, 14],    // Noon
      mileage: 500000,
      weather: 'clear',
      speed: 280,
    },
    isDefeated: false,
    specialReward: {
      type: 'PART',
      value: 'engine_swap_v12',
    },
    lore: 'The emperor rules at high noon. Only the worthy may challenge.',
  },
];

export class WandererDatabase {
  private wanderers: Map<string, WandererData>;

  constructor(customWanderers?: WandererData[]) {
    this.wanderers = new Map();
    
    const wanderersToLoad = customWanderers ?? DEFAULT_WANDERERS;
    for (const wanderer of wanderersToLoad) {
      this.wanderers.set(wanderer.id, { ...wanderer });
    }
  }

  /**
   * Get wanderer by ID
   */
  getWanderer(id: string): WandererData | null {
    return this.wanderers.get(id) || null;
  }

  /**
   * Get all wanderers
   */
  getAllWanderers(): WandererData[] {
    return Array.from(this.wanderers.values());
  }

  /**
   * Get available wanderers (not defeated)
   */
  getAvailableWanderers(): WandererData[] {
    return this.getAllWanderers().filter(w => !w.isDefeated);
  }

  /**
   * Mark wanderer as defeated
   */
  defeatWanderer(id: string): void {
    const wanderer = this.wanderers.get(id);
    if (wanderer) {
      wanderer.isDefeated = true;
    }
  }

  /**
   * Reset wanderer (for New Game+)
   */
  resetWanderer(id: string): void {
    const wanderer = this.wanderers.get(id);
    if (wanderer) {
      wanderer.isDefeated = false;
    }
  }

  /**
   * Reset all wanderers
   */
  resetAll(): void {
    for (const wanderer of this.wanderers.values()) {
      wanderer.isDefeated = false;
    }
  }

  /**
   * Get wanderers by difficulty (based on SP)
   */
  getByDifficulty(minSP: number, maxSP: number): WandererData[] {
    return this.getAllWanderers().filter(
      w => w.stats.sp >= minSP && w.stats.sp <= maxSP
    );
  }

  /**
   * Add a custom wanderer
   */
  addWanderer(wanderer: WandererData): void {
    this.wanderers.set(wanderer.id, wanderer);
  }

  /**
   * Remove a wanderer
   */
  removeWanderer(id: string): void {
    this.wanderers.delete(id);
  }

  /**
   * Get count of defeated wanderers
   */
  getDefeatedCount(): number {
    return this.getAllWanderers().filter(w => w.isDefeated).length;
  }

  /**
   * Get total wanderer count
   */
  getTotalCount(): number {
    return this.wanderers.size;
  }
}
