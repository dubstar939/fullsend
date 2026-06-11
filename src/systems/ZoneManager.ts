/**
 * Zone Manager
 * Manages highway zones with traffic density, rival spawn rates, and club ownership
 * Tokyo Xtreme Racer-style territory system
 */

import * as THREE from 'three';

export enum ZoneType {
  CITY = 'CITY',
  INDUSTRIAL = 'INDUSTRIAL',
  COASTAL = 'COASTAL',
  MOUNTAIN = 'MOUNTAIN',
  HIGHWAY = 'HIGHWAY',
  TUNNEL = 'TUNNEL',
  BRIDGE = 'BRIDGE',
}

export interface ClubInfo {
  id: string;
  name: string;
  color: number;
  leaderName: string;
  reputation: number; // 0-100
}

export interface WandererCondition {
  timeRange: [number, number]; // Hour range (0-24)
  minReputation: number;
  requiredClub?: string;
  triggerChance: number;
}

export interface ZoneDefinition {
  id: string;
  name: string;
  type: ZoneType;
  startZ: number;
  endZ: number;
  
  // Traffic settings
  trafficDensity: number; // 0-1
  trafficSpeedModifier: number; // 0.5-1.5
  
  // Rival settings
  rivalSpawnRate: number; // 0-1
  rivalDifficultyMin: number; // 0-1
  rivalDifficultyMax: number; // 0-1
  
  // Club ownership
  clubOwner?: ClubInfo;
  
  // Time-based conditions
  timeOfDayModifier: {
    day: number;
    dusk: number;
    night: number;
    dawn: number;
  };
  
  // Wanderer rivals (special encounters)
  wandererConditions: WandererCondition[];
  
  // Environmental modifiers
  weatherModifiers: {
    clear: number;
    rain: number;
    fog: number;
  };
}

export interface ZoneProperties {
  trafficDensity: number;
  rivalSpawnRate: number;
  clubOwner?: ClubInfo;
  canSpawnWanderer: boolean;
  wandererTriggerChance: number;
  difficultyMultiplier: number;
}

const DEFAULT_TIME_MODIFIER = {
  day: 1.0,
  dusk: 1.2,
  night: 1.5,
  dawn: 1.1,
};

const DEFAULT_WEATHER_MODIFIER = {
  clear: 1.0,
  rain: 0.8,
  fog: 0.7,
};

export class ZoneManager {
  private zones: ZoneDefinition[] = [];
  private currentZoneIndex: number = -1;
  private clubRegistry: Map<string, ClubInfo> = new Map();
  
  // Time tracking
  private currentTimeOfDay: number = 12; // 0-24 hours
  private currentWeather: 'clear' | 'rain' | 'fog' = 'clear';
  
  // Player reputation with clubs
  private playerReputation: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultClubs();
  }

  /**
   * Initialize default street racing clubs
   */
  private initializeDefaultClubs(): void {
    const defaultClubs: ClubInfo[] = [
      {
        id: 'midnight_racers',
        name: 'Midnight Racers',
        color: 0xff0000,
        leaderName: 'Kage',
        reputation: 80,
      },
      {
        id: 'highway_stars',
        name: 'Highway Stars',
        color: 0x00ff00,
        leaderName: 'Starlight',
        reputation: 65,
      },
      {
        id: 'touge_kings',
        name: 'Touge Kings',
        color: 0x0000ff,
        leaderName: 'Mountain God',
        reputation: 90,
      },
      {
        id: 'bay_line',
        name: 'Bay Line',
        color: 0xffff00,
        leaderName: 'Coastal Devil',
        reputation: 70,
      },
      {
        id: 'industrial',
        name: 'Industrial Crew',
        color: 0xff00ff,
        leaderName: 'Factory Ace',
        reputation: 55,
      },
    ];
    
    for (const club of defaultClubs) {
      this.clubRegistry.set(club.id, club);
    }
  }

  /**
   * Initialize zones with definitions
   */
  init(zones?: ZoneDefinition[]): void {
    if (zones && zones.length > 0) {
      this.zones = zones;
    } else {
      this.generateDefaultZones();
    }
    
    this.currentZoneIndex = -1;
  }

  /**
   * Generate default procedural zones
   */
  private generateDefaultZones(): void {
    const zoneTypes: ZoneType[] = [
      ZoneType.HIGHWAY,
      ZoneType.CITY,
      ZoneType.COASTAL,
      ZoneType.TUNNEL,
      ZoneType.BRIDGE,
      ZoneType.INDUSTRIAL,
      ZoneType.MOUNTAIN,
    ];
    
    let currentZ = 0;
    const zoneLength = 500; // Each zone is 500 units long
    
    for (let i = 0; i < 20; i++) {
      const zoneType = zoneTypes[i % zoneTypes.length];
      const zoneDef = this.createZoneDefinition(zoneType, currentZ, zoneLength, i);
      this.zones.push(zoneDef);
      currentZ -= zoneLength;
    }
  }

  /**
   * Create a zone definition
   */
  private createZoneDefinition(
    type: ZoneType,
    startZ: number,
    length: number,
    index: number
  ): ZoneDefinition {
    // Base properties by zone type
    const typeConfig = this.getZoneTypeConfig(type);
    
    // Assign club owner (some zones are contested)
    const clubOwner = Math.random() > 0.3 
      ? this.getRandomClub() 
      : undefined;
    
    // Generate wanderer conditions
    const wandererConditions = this.generateWandererConditions(type, clubOwner);
    
    return {
      id: `zone_${index}_${type.toLowerCase()}`,
      name: this.getZoneName(type, index),
      type,
      startZ,
      endZ: startZ - length,
      trafficDensity: typeConfig.trafficDensity,
      trafficSpeedModifier: typeConfig.trafficSpeedModifier,
      rivalSpawnRate: typeConfig.rivalSpawnRate,
      rivalDifficultyMin: typeConfig.rivalDifficultyMin,
      rivalDifficultyMax: typeConfig.rivalDifficultyMax,
      clubOwner,
      timeOfDayModifier: { ...DEFAULT_TIME_MODIFIER },
      wandererConditions,
      weatherModifiers: { ...DEFAULT_WEATHER_MODIFIER },
    };
  }

  /**
   * Get base configuration for zone type
   */
  private getZoneTypeConfig(type: ZoneType): {
    trafficDensity: number;
    trafficSpeedModifier: number;
    rivalSpawnRate: number;
    rivalDifficultyMin: number;
    rivalDifficultyMax: number;
  } {
    switch (type) {
      case ZoneType.HIGHWAY:
        return {
          trafficDensity: 0.6,
          trafficSpeedModifier: 1.2,
          rivalSpawnRate: 0.3,
          rivalDifficultyMin: 0.3,
          rivalDifficultyMax: 0.7,
        };
      case ZoneType.CITY:
        return {
          trafficDensity: 0.9,
          trafficSpeedModifier: 0.8,
          rivalSpawnRate: 0.5,
          rivalDifficultyMin: 0.4,
          rivalDifficultyMax: 0.8,
        };
      case ZoneType.COASTAL:
        return {
          trafficDensity: 0.4,
          trafficSpeedModifier: 1.0,
          rivalSpawnRate: 0.6,
          rivalDifficultyMin: 0.5,
          rivalDifficultyMax: 0.9,
        };
      case ZoneType.TUNNEL:
        return {
          trafficDensity: 0.5,
          trafficSpeedModifier: 1.1,
          rivalSpawnRate: 0.7,
          rivalDifficultyMin: 0.6,
          rivalDifficultyMax: 1.0,
        };
      case ZoneType.BRIDGE:
        return {
          trafficDensity: 0.3,
          trafficSpeedModifier: 1.3,
          rivalSpawnRate: 0.8,
          rivalDifficultyMin: 0.7,
          rivalDifficultyMax: 1.0,
        };
      case ZoneType.INDUSTRIAL:
        return {
          trafficDensity: 0.7,
          trafficSpeedModifier: 0.9,
          rivalSpawnRate: 0.4,
          rivalDifficultyMin: 0.3,
          rivalDifficultyMax: 0.6,
        };
      case ZoneType.MOUNTAIN:
        return {
          trafficDensity: 0.2,
          trafficSpeedModifier: 1.0,
          rivalSpawnRate: 0.9,
          rivalDifficultyMin: 0.8,
          rivalDifficultyMax: 1.0,
        };
      default:
        return {
          trafficDensity: 0.5,
          trafficSpeedModifier: 1.0,
          rivalSpawnRate: 0.5,
          rivalDifficultyMin: 0.5,
          rivalDifficultyMax: 0.8,
        };
    }
  }

  /**
   * Get a random club from registry
   */
  private getRandomClub(): ClubInfo | undefined {
    const clubs = Array.from(this.clubRegistry.values());
    if (clubs.length === 0) return undefined;
    return clubs[Math.floor(Math.random() * clubs.length)];
  }

  /**
   * Generate wanderer conditions for a zone
   */
  private generateWandererConditions(
    type: ZoneType,
    clubOwner?: ClubInfo
  ): WandererCondition[] {
    const conditions: WandererCondition[] = [];
    
    // High-difficulty zones have more wanderers
    if (type === ZoneType.MOUNTAIN || type === ZoneType.BRIDGE || type === ZoneType.TUNNEL) {
      // Night-only wanderer
      conditions.push({
        timeRange: [20, 5], // 8 PM to 5 AM
        minReputation: 50,
        requiredClub: clubOwner?.id,
        triggerChance: 0.3,
      });
      
      // Dawn challenger
      conditions.push({
        timeRange: [4, 7], // 4 AM to 7 AM
        minReputation: 70,
        triggerChance: 0.2,
      });
    }
    
    // City has underground racers
    if (type === ZoneType.CITY) {
      conditions.push({
        timeRange: [22, 4], // 10 PM to 4 AM
        minReputation: 30,
        triggerChance: 0.4,
      });
    }
    
    return conditions;
  }

  /**
   * Generate zone name based on type and index
   */
  private getZoneName(type: ZoneType, index: number): string {
    const prefixes: Record<ZoneType, string[]> = {
      [ZoneType.HIGHWAY]: ['Express', 'Interstate', 'Freeway', 'Turnpike'],
      [ZoneType.CITY]: ['Downtown', 'Metro', 'Urban', 'Central'],
      [ZoneType.COASTAL]: ['Seaside', 'Ocean', 'Beach', 'Marine'],
      [ZoneType.TUNNEL]: ['Underground', 'Subterranean', 'Deep', 'Shadow'],
      [ZoneType.BRIDGE]: ['Suspension', 'Skyway', 'Crossing', 'Link'],
      [ZoneType.INDUSTRIAL]: ['Factory', 'Warehouse', 'Dock', 'Plant'],
      [ZoneType.MOUNTAIN]: ['Peak', 'Summit', 'Alpine', 'Highland'],
    };
    
    const numZoneTypes = 7; // Total number of zone types
    const prefix = prefixes[type][index % prefixes[type].length];
    return `${prefix} Zone ${Math.floor(index / numZoneTypes) + 1}`;
  }

  /**
   * Get current zone based on player position
   */
  getCurrentZone(playerPosition: THREE.Vector3): ZoneDefinition | null {
    const playerZ = playerPosition.z;
    
    // Check if we're still in the current zone
    if (this.currentZoneIndex >= 0 && this.currentZoneIndex < this.zones.length) {
      const currentZone = this.zones[this.currentZoneIndex];
      if (playerZ >= currentZone.endZ && playerZ <= currentZone.startZ) {
        return currentZone;
      }
    }
    
    // Find new zone
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      if (playerZ >= zone.endZ && playerZ <= zone.startZ) {
        this.currentZoneIndex = i;
        return zone;
      }
    }
    
    // Player is between zones or outside defined areas
    return null;
  }

  /**
   * Get zone properties with all modifiers applied
   */
  getZoneProperties(playerPosition: THREE.Vector3): ZoneProperties | null {
    const zone = this.getCurrentZone(playerPosition);
    if (!zone) return null;
    
    // Apply time of day modifier
    const timeMult = this.getTimeOfDayModifier(zone);
    
    // Apply weather modifier
    const weatherMult = zone.weatherModifiers[this.currentWeather] ?? 1.0;
    
    // Calculate final values
    const trafficDensity = zone.trafficDensity * timeMult * weatherMult;
    const rivalSpawnRate = zone.rivalSpawnRate * timeMult;
    
    // Check wanderer spawn possibility
    const wandererCondition = this.checkWandererConditions(zone);
    
    // Difficulty multiplier based on club reputation
    let difficultyMultiplier = 1.0;
    if (zone.clubOwner) {
      const playerRep = this.playerReputation.get(zone.clubOwner.id) ?? 0;
      difficultyMultiplier = 1 + (playerRep / 200); // Up to 1.5x at max rep
    }
    
    return {
      trafficDensity: Math.max(0, Math.min(1, trafficDensity)),
      rivalSpawnRate: Math.max(0, Math.min(1, rivalSpawnRate)),
      clubOwner: zone.clubOwner,
      canSpawnWanderer: wandererCondition !== null,
      wandererTriggerChance: wandererCondition?.triggerChance ?? 0,
      difficultyMultiplier,
    };
  }

  /**
   * Get time of day multiplier for zone
   */
  private getTimeOfDayModifier(zone: ZoneDefinition): number {
    const hour = this.currentTimeOfDay;
    
    if (hour >= 6 && hour < 18) {
      return zone.timeOfDayModifier.day;
    } else if (hour >= 18 && hour < 20) {
      return zone.timeOfDayModifier.dusk;
    } else if (hour >= 20 || hour < 5) {
      return zone.timeOfDayModifier.night;
    } else {
      return zone.timeOfDayModifier.dawn;
    }
  }

  /**
   * Check if wanderer conditions are met
   */
  private checkWandererConditions(zone: ZoneDefinition): WandererCondition | null {
    for (const condition of zone.wandererConditions) {
      // Check time range
      const [startHour, endHour] = condition.timeRange;
      let isInTimeRange = false;
      
      if (startHour <= endHour) {
        // Normal range (e.g., 10-14)
        isInTimeRange = this.currentTimeOfDay >= startHour && this.currentTimeOfDay < endHour;
      } else {
        // Wrapping range (e.g., 22-4 means 10 PM to 4 AM)
        isInTimeRange = this.currentTimeOfDay >= startHour || this.currentTimeOfDay < endHour;
      }
      
      if (!isInTimeRange) continue;
      
      // Check reputation
      if (condition.requiredClub) {
        const rep = this.playerReputation.get(condition.requiredClub) ?? 0;
        if (rep < condition.minReputation) continue;
      }
      
      // Check club requirement
      if (condition.requiredClub && !zone.clubOwner) continue;
      if (condition.requiredClub && zone.clubOwner?.id !== condition.requiredClub) continue;
      
      return condition;
    }
    
    return null;
  }

  /**
   * Set time of day (0-24 hours)
   */
  setTimeOfDay(hour: number): void {
    this.currentTimeOfDay = ((hour % 24) + 24) % 24;
  }

  /**
   * Set current weather
   */
  setWeather(weather: 'clear' | 'rain' | 'fog'): void {
    this.currentWeather = weather;
  }

  /**
   * Update player reputation with a club
   */
  updateClubReputation(clubId: string, delta: number): void {
    const current = this.playerReputation.get(clubId) ?? 0;
    const newValue = Math.max(-100, Math.min(100, current + delta));
    this.playerReputation.set(clubId, newValue);
  }

  /**
   * Get player reputation with a club
   */
  getClubReputation(clubId: string): number {
    return this.playerReputation.get(clubId) ?? 0;
  }

  /**
   * Register a new club
   */
  registerClub(club: ClubInfo): void {
    this.clubRegistry.set(club.id, club);
  }

  /**
   * Get club by ID
   */
  getClub(clubId: string): ClubInfo | undefined {
    return this.clubRegistry.get(clubId);
  }

  /**
   * Get all registered clubs
   */
  getAllClubs(): ClubInfo[] {
    return Array.from(this.clubRegistry.values());
  }

  /**
   * Add custom zone
   */
  addZone(zone: ZoneDefinition): void {
    this.zones.push(zone);
    // Sort by startZ to maintain order
    this.zones.sort((a, b) => b.startZ - a.startZ);
  }

  /**
   * Get zone by ID
   */
  getZoneById(id: string): ZoneDefinition | undefined {
    return this.zones.find((z) => z.id === id);
  }

  /**
   * Get all zones
   */
  getAllZones(): ZoneDefinition[] {
    return this.zones;
  }

  /**
   * Get next zone ahead
   */
  getNextZone(currentZ: number): ZoneDefinition | null {
    for (const zone of this.zones) {
      if (zone.endZ < currentZ && zone.startZ < currentZ) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Get previous zone behind
   */
  getPreviousZone(currentZ: number): ZoneDefinition | null {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      if (zone.startZ > currentZ && zone.endZ > currentZ) {
        return zone;
      }
    }
    return null;
  }

  /**
   * Clear all zones
   */
  clear(): void {
    this.zones = [];
    this.currentZoneIndex = -1;
  }

  /**
   * Reset player reputation
   */
  resetReputation(): void {
    this.playerReputation.clear();
  }
}

// Export singleton instance for convenience
export const zoneManager = new ZoneManager();
