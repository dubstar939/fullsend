/**
 * Wanderer Database - Tokyo Xtreme Racer Style
 * Special rivals with unique spawn conditions (midnight encounters, etc.)
 */

import { RivalDefinition, WandererCondition } from '../types/ClubSystem';

export interface WandererDefinition extends RivalDefinition {
  /** Specific conditions that must be met for wanderer to appear */
  conditions: WandererCondition[];
  /** Probability of appearing when conditions are met (0-1) */
  appearanceChance: number;
  /** Minimum times player must have encountered this wanderer */
  minEncounters: number;
  /** Whether wanderer disappears after being defeated */
  oneTimeOnly: boolean;
}

export interface WandererDatabaseConfig {
  /** Custom wanderers to add */
  customWanderers?: Partial<WandererDefinition>[];
  /** Enable default wanderers */
  enableDefaults: boolean;
}

const DEFAULT_CONFIG: WandererDatabaseConfig = {
  enableDefaults: true,
};

// Default wanderer definitions
const DEFAULT_WANDERERS: WandererDefinition[] = [
  {
    id: 'wanderer_midnight_king',
    name: 'Midnight King',
    clubId: 'none',
    carModel: 'gtr_r35',
    stats: { speed: 95, aggression: 80, skill: 90, spResistance: 85, stamina: 90 },
    spawnZones: ['bayshore_loop', 'wangan_express'],
    activeTimes: [0, 4],
    role: 'WANDERER',
    conditions: [
      { type: 'minMileage', value: 100 },
      { type: 'timeRange', value: [0, 4] },
      { type: 'aloneOnHighway', value: true },
      { type: 'minSpeed', value: 200 },
    ],
    appearanceChance: 0.3,
    minEncounters: 0,
    oneTimeOnly: false,
  },
  {
    id: 'wanderer_phantom_racer',
    name: 'Phantom Racer',
    clubId: 'none',
    carModel: 'nsx_nc1',
    stats: { speed: 92, aggression: 70, skill: 95, spResistance: 80, stamina: 85 },
    spawnZones: ['mountain_pass', 'irohazaka'],
    activeTimes: [22, 5],
    role: 'WANDERER',
    conditions: [
      { type: 'carModel', value: 'ae86' },
      { type: 'timeRange', value: [22, 5] },
      { type: 'weatherCondition', value: 'rain' },
    ],
    appearanceChance: 0.2,
    minEncounters: 0,
    oneTimeOnly: false,
  },
  {
    id: 'wanderer_speed_demon',
    name: 'Speed Demon',
    clubId: 'none',
    carModel: 'supra_mk4',
    stats: { speed: 98, aggression: 85, skill: 80, spResistance: 75, stamina: 80 },
    spawnZones: ['wangan_express', 'shibuya_line'],
    activeTimes: [1, 5],
    role: 'WANDERER',
    conditions: [
      { type: 'minMileage', value: 200 },
      { type: 'timeRange', value: [1, 5] },
      { type: 'minSpeed', value: 250 },
      { type: 'aloneOnHighway', value: true },
    ],
    appearanceChance: 0.15,
    minEncounters: 0,
    oneTimeOnly: true,
  },
  {
    id: 'wanderer_tunnel_ghost',
    name: 'Tunnel Ghost',
    clubId: 'shadow_syndicate',
    carModel: 'chaser_jzx100',
    stats: { speed: 85, aggression: 75, skill: 88, spResistance: 82, stamina: 85 },
    spawnZones: ['tunnel_network', 'underground'],
    activeTimes: [0, 5],
    role: 'WANDERER',
    conditions: [
      { type: 'timeRange', value: [0, 5] },
      { type: 'aloneOnHighway', value: true },
    ],
    appearanceChance: 0.25,
    minEncounters: 0,
    oneTimeOnly: false,
  },
  {
    id: 'wanderer_coastal_devil',
    name: 'Coastal Devil',
    clubId: 'coastal_runners',
    carModel: 'celica_gt_four',
    stats: { speed: 80, aggression: 70, skill: 85, spResistance: 75, stamina: 80 },
    spawnZones: ['coastal_highway', 'yokohane_line'],
    activeTimes: [18, 22],
    role: 'WANDERER',
    conditions: [
      { type: 'timeRange', value: [18, 22] },
      { type: 'weatherCondition', value: 'clear' },
    ],
    appearanceChance: 0.3,
    minEncounters: 0,
    oneTimeOnly: false,
  },
];

export class WandererDatabase {
  private wanderers: Map<string, WandererDefinition> = new Map();
  private encounterCounts: Map<string, number> = new Map();
  private defeatedWanderers: Set<string> = new Set();
  private config: WandererDatabaseConfig;
  
  constructor(config: Partial<WandererDatabaseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }
  
  /**
   * Initialize database
   */
  private initialize(): void {
    if (this.config.enableDefaults) {
      for (const wanderer of DEFAULT_WANDERERS) {
        this.wanderers.set(wanderer.id, wanderer);
        this.encounterCounts.set(wanderer.id, 0);
      }
    }
    
    if (this.config.customWanderers) {
      for (const wandererData of this.config.customWanderers) {
        if (wandererData.id) {
          const existing = this.wanderers.get(wandererData.id);
          if (existing) {
            this.wanderers.set(
              wandererData.id,
              { ...existing, ...wandererData } as WandererDefinition
            );
          } else {
            this.wanderers.set(wandererData.id, wandererData as WandererDefinition);
            this.encounterCounts.set(wandererData.id, 0);
          }
        }
      }
    }
  }
  
  /**
   * Check if wanderer can spawn based on conditions
   */
  checkSpawnConditions(
    wandererId: string,
    playerState: {
      currentCarModel: string;
      currentCarColor: string;
      totalMileage: number;
      currentSpeed: number;
      currentTimeOfDay: number;
      isAlone: boolean;
      weatherCondition: string;
      defeatedRivals: string[];
    },
    zoneId: string
  ): boolean {
    const wanderer = this.wanderers.get(wandererId);
    if (!wanderer) return false;
    
    // Check if already defeated and one-time-only
    if (wanderer.oneTimeOnly && this.defeatedWanderers.has(wandererId)) {
      return false;
    }
    
    // Check minimum encounters
    const encounters = this.encounterCounts.get(wandererId) ?? 0;
    if (encounters < wanderer.minEncounters) {
      return false;
    }
    
    // Check zone
    if (!wanderer.spawnZones.includes(zoneId)) {
      return false;
    }
    
    // Check all conditions
    for (const condition of wanderer.conditions) {
      if (!this.checkCondition(condition, playerState)) {
        return false;
      }
    }
    
    // Roll for appearance chance
    if (Math.random() > wanderer.appearanceChance) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all wanderers that can spawn in zone
   */
  getAvailableWanderers(
    zoneId: string,
    playerState: {
      currentCarModel: string;
      currentCarColor: string;
      totalMileage: number;
      currentSpeed: number;
      currentTimeOfDay: number;
      isAlone: boolean;
      weatherCondition: string;
      defeatedRivals: string[];
    }
  ): WandererDefinition[] {
    const available: WandererDefinition[] = [];
    
    for (const wanderer of this.wanderers.values()) {
      if (this.checkSpawnConditions(wanderer.id, playerState, zoneId)) {
        available.push(wanderer);
      }
    }
    
    return available;
  }
  
  /**
   * Record wanderer encounter
   */
  recordEncounter(wandererId: string): void {
    const current = this.encounterCounts.get(wandererId) ?? 0;
    this.encounterCounts.set(wandererId, current + 1);
  }
  
  /**
   * Record wanderer defeat
   */
  recordDefeat(wandererId: string): void {
    this.defeatedWanderers.add(wandererId);
  }
  
  /**
   * Get wanderer by ID
   */
  getWandererById(id: string): WandererDefinition | undefined {
    return this.wanderers.get(id);
  }
  
  /**
   * Get all wanderers
   */
  getAllWanderers(): WandererDefinition[] {
    return Array.from(this.wanderers.values());
  }
  
  /**
   * Get encounter count for wanderer
   */
  getEncounterCount(wandererId: string): number {
    return this.encounterCounts.get(wandererId) ?? 0;
  }
  
  /**
   * Check if wanderer is defeated
   */
  isWandererDefeated(wandererId: string): boolean {
    return this.defeatedWanderers.has(wandererId);
  }
  
  /**
   * Reset wanderer progress
   */
  resetProgress(wandererId?: string): void {
    if (wandererId) {
      this.defeatedWanderers.delete(wandererId);
      this.encounterCounts.set(wandererId, 0);
    } else {
      this.defeatedWanderers.clear();
      for (const key of this.encounterCounts.keys()) {
        this.encounterCounts.set(key, 0);
      }
    }
  }
  
  /**
   * Add custom wanderer
   */
  addWanderer(wanderer: WandererDefinition): void {
    this.wanderers.set(wanderer.id, wanderer);
    this.encounterCounts.set(wanderer.id, 0);
  }
  
  /**
   * Remove wanderer
   */
  removeWanderer(wandererId: string): boolean {
    this.encounterCounts.delete(wandererId);
    this.defeatedWanderers.delete(wandererId);
    return this.wanderers.delete(wandererId);
  }
  
  /**
   * Export to JSON
   */
  toJSON(): { wanderers: WandererDefinition[]; encounters: Map<string, number> } {
    return {
      wanderers: this.getAllWanderers(),
      encounters: new Map(this.encounterCounts),
    };
  }
  
  /**
   * Import from JSON
   */
  fromJSON(data: { wanderers: WandererDefinition[]; encounters: Record<string, number> }): void {
    for (const wanderer of data.wanderers) {
      this.wanderers.set(wanderer.id, wanderer);
    }
    
    for (const [id, count] of Object.entries(data.encounters)) {
      this.encounterCounts.set(id, count);
    }
  }
  
  /**
   * Get total wanderer count
   */
  getWandererCount(): number {
    return this.wanderers.size;
  }
  
  /**
   * Get defeated count
   */
  getDefeatedCount(): number {
    return this.defeatedWanderers.size;
  }
  
  /**
   * Clear all data
   */
  clear(): void {
    this.wanderers.clear();
    this.encounterCounts.clear();
    this.defeatedWanderers.clear();
    this.initialize();
  }
  
  /**
   * Check individual condition
   */
  private checkCondition(
    condition: WandererCondition,
    playerState: {
      currentCarModel: string;
      currentCarColor: string;
      totalMileage: number;
      currentSpeed: number;
      currentTimeOfDay: number;
      isAlone: boolean;
      weatherCondition: string;
    }
  ): boolean {
    switch (condition.type) {
      case 'carModel':
        return playerState.currentCarModel === condition.value;
      
      case 'carColor':
        return playerState.currentCarColor === condition.value;
      
      case 'minMileage':
        return playerState.totalMileage >= (condition.value as number);
      
      case 'maxTraffic':
        // This would need traffic count passed in
        return true;
      
      case 'minSpeed':
        return playerState.currentSpeed >= (condition.value as number);
      
      case 'maxSpeed':
        return playerState.currentSpeed <= (condition.value as number);
      
      case 'timeRange': {
        const [start, end] = condition.value as [number, number];
        const hour = playerState.currentTimeOfDay;
        
        if (start <= end) {
          return hour >= start && hour <= end;
        } else {
          return hour >= start || hour <= end;
        }
      }
      
      case 'beatClub':
        // Would need beaten clubs list
        return true;
      
      case 'specificCarType':
        // Would need car type classification
        return true;
      
      case 'aloneOnHighway':
        return playerState.isAlone === condition.value;
      
      case 'weatherCondition':
        return playerState.weatherCondition === condition.value;
      
      default:
        return true;
    }
  }
}

// Singleton instance
let wandererDatabaseInstance: WandererDatabase | null = null;

export function getWandererDatabase(config?: Partial<WandererDatabaseConfig>): WandererDatabase {
  if (!wandererDatabaseInstance) {
    wandererDatabaseInstance = new WandererDatabase(config);
  }
  return wandererDatabaseInstance;
}

export default WandererDatabase;
