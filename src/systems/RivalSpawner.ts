/**
 * Rival Spawner
 * Manages rival AI spawning with zone-based tables, club definitions, and time conditions
 * Integrates with AIManager, renderer, and ClubManager for Tokyo Xtreme Racer-style encounters
 */

import * as THREE from 'three';
import { RIVAL_CONFIG, TRAFFIC_CONFIG } from '../config/gameConfig';
import { ZoneManager, ZoneDefinition, ClubInfo } from './ZoneManager';
import { InstancedMeshManager } from '../engine/rendering/InstancedMeshManager';
import { ClubManager, clubManager as defaultClubManager } from './ClubManager';
import { RivalDefinition as ClubRivalDefinition, PlayerState, RivalRole } from '../types/ClubSystem';

export enum RivalType {
  CRUISER = 'CRUISER',       // Normal cruising rival
  AGGRESSOR = 'AGGRESSOR',   // Aggressive ramming rival
  BLOCKER = 'BLOCKER',       // Tries to block player
  SPRINT = 'SPRINT',         // High-speed straight-line rival
  TECHNICAL = 'TECHNICAL',   // Skilled cornering rival
  WANDERER = 'WANDERER',     // Special midnight encounter
  BOSS = 'BOSS',             // Club leader
}

// Extended rival definition that includes club system data
export interface RivalDefinition extends ClubRivalDefinition {
  type: RivalType;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  speedModifier: number;
  aggressionModifier: number;
  skillModifier: number;
  carColor: number;
  specialAbility?: string;
}

export interface SpawnedRival {
  definition: RivalDefinition;
  position: THREE.Vector3;
  lane: number;
  speed: number;
  state: 'CRUISING' | 'CHALLENGING' | 'RACING' | 'FLEEING';
  challengeInitiated: boolean;
  mesh?: THREE.Group;
  instanceIndex?: number;
}

export interface RivalSpawnTable {
  zoneType: string;
  timeRange?: [number, number];
  rivals: RivalDefinition[];
  spawnWeight: number;
}

export interface RivalSpawnerConfig {
  /** Maximum active rivals */
  maxActiveRivals: number;
  /** Base spawn rate (0-1) */
  baseSpawnRate: number;
  /** Minimum distance between rivals */
  minSpawnDistance: number;
  /** Spawn distance ahead of player */
  spawnAheadDistance: number;
  /** Despawn distance behind player */
  despawnBehindDistance: number;
  /** Enable headlight flash challenges */
  enableFlashChallenge: boolean;
}

const DEFAULT_CONFIG: RivalSpawnerConfig = {
  maxActiveRivals: 8,
  baseSpawnRate: 0.3,
  minSpawnDistance: 50,
  spawnAheadDistance: 100,
  despawnBehindDistance: 50,
  enableFlashChallenge: true,
};

export class RivalSpawner {
  private activeRivals: Map<string, SpawnedRival> = new Map();
  private config: RivalSpawnerConfig;
  private zoneManager: ZoneManager;
  private clubManager: ClubManager;
  
  // Spawn tables by zone
  private spawnTables: Map<string, RivalSpawnTable[]> = new Map();
  
  // Instance management
  private instancedMeshManager: InstancedMeshManager | null = null;
  private rivalGeometries: Map<string, THREE.BufferGeometry> = new Map();
  private rivalMaterials: Map<string, THREE.MeshPhongMaterial> = new Map();
  
  // Cooldowns
  private spawnCooldown: number = 0;
  private challengeCooldown: number = 0;
  
  // Time tracking
  private currentTimeOfDay: number = 12;
  
  // Player state for requirement checking
  private playerState: Partial<PlayerState> = {
    totalMileage: 0,
    winStreak: 0,
    totalWins: 0,
    currentCarModel: 'unknown',
    currentCarColor: 'white',
    clubsBeaten: [],
    membersBeatenPerClub: {},
    wanderersFound: 0,
    defeatedRivals: [],
    clubReputation: {},
    currentTimeOfDay: 12,
    isAlone: true,
    currentSpeed: 0,
    weatherCondition: 'clear',
  };
  
  // Callbacks
  private onRivalSpawned?: (rival: SpawnedRival) => void;
  private onChallengeInitiated?: (rival: SpawnedRival) => void;
  private onRivalDefeated?: (rival: SpawnedRival) => void;

  constructor(
    zoneManager: ZoneManager, 
    clubManagerInstance: ClubManager = defaultClubManager,
    config: Partial<RivalSpawnerConfig> = {}
  ) {
    this.zoneManager = zoneManager;
    this.clubManager = clubManagerInstance;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.initializeSpawnTables();
  }

  /**
   * Initialize default spawn tables
   */
  private initializeSpawnTables(): void {
    // Highway spawns
    this.spawnTables.set('HIGHWAY', [
      {
        zoneType: 'HIGHWAY',
        rivals: [
          this.createRivalDefinition('Highway Cruiser', RivalType.CRUISER, 'MEDIUM', 0x4488ff),
          this.createRivalDefinition('Speed Demon', RivalType.SPRINT, 'HARD', 0xff4444),
        ],
        spawnWeight: 1.0,
      },
    ]);
    
    // City spawns
    this.spawnTables.set('CITY', [
      {
        zoneType: 'CITY',
        rivals: [
          this.createRivalDefinition('Street King', RivalType.AGGRESSOR, 'MEDIUM', 0xffaa00),
          this.createRivalDefinition('Urban Legend', RivalType.TECHNICAL, 'HARD', 0x88ff44),
        ],
        spawnWeight: 1.2,
      },
    ]);
    
    // Coastal spawns
    this.spawnTables.set('COASTAL', [
      {
        zoneType: 'COASTAL',
        rivals: [
          this.createRivalDefinition('Coastal Runner', RivalType.CRUISER, 'EASY', 0x44ffff),
          this.createRivalDefinition('Sea Devil', RivalType.SPRINT, 'HARD', 0xff44ff),
        ],
        spawnWeight: 1.0,
      },
    ]);
    
    // Mountain spawns (high difficulty)
    this.spawnTables.set('MOUNTAIN', [
      {
        zoneType: 'MOUNTAIN',
        rivals: [
          this.createRivalDefinition('Mountain God', RivalType.TECHNICAL, 'EXTREME', 0xff0000),
          this.createRivalDefinition('Touge Master', RivalType.TECHNICAL, 'HARD', 0x00ff00),
        ],
        spawnWeight: 1.5,
      },
    ]);
    
    // Tunnel spawns
    this.spawnTables.set('TUNNEL', [
      {
        zoneType: 'TUNNEL',
        rivals: [
          this.createRivalDefinition('Shadow Racer', RivalType.CRUISER, 'MEDIUM', 0x333333),
          this.createRivalDefinition('Underground King', RivalType.AGGRESSOR, 'HARD', 0x660066),
        ],
        spawnWeight: 1.3,
      },
    ]);
    
    // Bridge spawns
    this.spawnTables.set('BRIDGE', [
      {
        zoneType: 'BRIDGE',
        rivals: [
          this.createRivalDefinition('Bridge Burner', RivalType.SPRINT, 'HARD', 0xff6600),
          this.createRivalDefinition('Skyline Ace', RivalType.TECHNICAL, 'EXTREME', 0x0066ff),
        ],
        spawnWeight: 1.4,
      },
    ]);
  }

  /**
   * Create a rival definition
   */
  private createRivalDefinition(
    name: string,
    type: RivalType,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME',
    color: number
  ): RivalDefinition {
    const diffConfig = RIVAL_CONFIG[`DIFFICULTY_${difficulty}`];
    
    let speedMod = 1.0;
    let aggMod = 1.0;
    let skillMod = 1.0;
    
    switch (type) {
      case RivalType.SPRINT:
        speedMod = 1.2;
        aggMod = 0.8;
        break;
      case RivalType.AGGRESSOR:
        speedMod = 1.0;
        aggMod = 1.3;
        break;
      case RivalType.TECHNICAL:
        speedMod = 0.95;
        skillMod = 1.2;
        break;
      case RivalType.BOSS:
        speedMod = 1.15;
        aggMod = 1.2;
        skillMod = 1.3;
        break;
    }
    
    return {
      id: `rival_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
      name,
      type,
      difficulty,
      speedModifier: speedMod,
      aggressionModifier: aggMod,
      skillModifier: skillMod,
      carColor: color,
    };
  }

  /**
   * Initialize with instanced mesh manager
   */
  init(instancedMeshManager?: InstancedMeshManager): void {
    if (instancedMeshManager) {
      this.instancedMeshManager = instancedMeshManager;
    } else {
      this.createDefaultRivalMesh();
    }
  }

  /**
   * Create default rival mesh
   */
  private createDefaultRivalMesh(): void {
    // More aggressive-looking car geometry
    const carGroup = new THREE.Group();
    
    // Main body (lower, sportier)
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.7, 4.5);
    const bodyMat = new THREE.MeshPhongMaterial({ 
      color: 0xff0000,
      flatShading: true,
      emissive: 0x330000,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    carGroup.add(body);
    
    // Cabin (sleeker)
    const cabinGeo = new THREE.BoxGeometry(1.7, 0.5, 2.8);
    const cabinMat = new THREE.MeshPhongMaterial({ 
      color: 0x222233,
      flatShading: true,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 0.9;
    cabin.position.z = -0.2;
    carGroup.add(cabin);
    
    // Spoiler
    const spoilerGeo = new THREE.BoxGeometry(1.8, 0.1, 0.3);
    const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
    spoiler.position.y = 0.8;
    spoiler.position.z = 1.8;
    carGroup.add(spoiler);
    
    this.rivalGeometries.set('default', bodyGeo.clone());
    this.rivalMaterials.set('default', bodyMat.clone());
    
    this.instancedMeshManager = new InstancedMeshManager(
      this.rivalGeometries.get('default')!,
      this.rivalMaterials.get('default')!,
      { maxCount: this.config.maxActiveRivals }
    );
  }

  /**
   * Update rival spawner with Club System integration
   */
  update(deltaTime: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    // Update cooldowns
    if (this.spawnCooldown > 0) {
      this.spawnCooldown -= deltaTime;
    }
    if (this.challengeCooldown > 0) {
      this.challengeCooldown -= deltaTime;
    }
    
    // Update time of day
    this.currentTimeOfDay = this.zoneManager ? 
      (this.zoneManager as any).currentTimeOfDay || 12 : 12;
    
    // Sync player state with current data
    this.playerState.currentTimeOfDay = this.currentTimeOfDay;
    this.playerState.currentSpeed = playerSpeed;
    
    // Get current zone properties
    const zoneProps = this.zoneManager.getZoneProperties(playerPosition);
    const currentZone = this.zoneManager.getCurrentZone(playerPosition);
    
    // Try to spawn new rivals (club-based or wanderer)
    if (zoneProps && this.spawnCooldown <= 0) {
      // First try to spawn a wanderer (rare encounter)
      if (zoneProps.canSpawnWanderer && Math.random() < zoneProps.wandererTriggerChance) {
        this.trySpawnWanderer(playerPosition, zoneProps, currentZone);
      } else {
        // Otherwise try normal club-based rival spawn
        this.trySpawnRival(playerPosition, zoneProps, currentZone);
      }
    }
    
    // Update active rivals
    this.updateActiveRivals(deltaTime, playerPosition, playerSpeed);
    
    // Check for headlight flash challenges
    if (this.config.enableFlashChallenge) {
      this.checkFlashChallenges(playerPosition);
    }
  }

  /**
   * Try to spawn a wanderer based on Club Manager conditions
   */
  private trySpawnWanderer(
    playerPosition: THREE.Vector3,
    zoneProps?: ReturnType<typeof ZoneManager.prototype.getZoneProperties>,
    zone?: ZoneDefinition | null
  ): boolean {
    if (!zone || !zone.clubOwner) return false;
    
    // Use Club Manager to check wanderer conditions
    const wanderer = this.clubManager.checkWandererSpawn(zone.id, this.playerState as PlayerState);
    
    if (!wanderer) return false;
    
    // Find spawn position
    const spawnPos = this.findSpawnPosition(playerPosition);
    if (!spawnPos) return false;
    
    // Convert club rival definition to spawnable rival
    const rivalDef = this.convertClubRivalToSpawnable(wanderer);
    
    // Create spawned rival
    const rival: SpawnedRival = {
      definition: rivalDef,
      position: spawnPos,
      lane: Math.round(spawnPos.x / TRAFFIC_CONFIG.LANE_WIDTH),
      speed: this.calculateRivalSpeed(rivalDef),
      state: 'CRUISING',
      challengeInitiated: false,
    };
    
    // Allocate instance
    const instanceIndex = this.allocateInstance(rival);
    if (instanceIndex !== null) {
      rival.instanceIndex = instanceIndex;
    }
    
    // Add to active rivals
    this.activeRivals.set(rival.definition.id + '_' + Date.now(), rival);
    
    // Set longer spawn cooldown for wanderers (they're rare!)
    this.spawnCooldown = 30;
    
    // Callback
    if (this.onRivalSpawned) {
      this.onRivalSpawned(rival);
    }
    
    return true;
  }

  /**
   * Try to spawn a new rival using Club Manager data
   */
  trySpawnRival(
    playerPosition: THREE.Vector3,
    zoneProps?: ReturnType<typeof ZoneManager.prototype.getZoneProperties>,
    zone?: ZoneDefinition | null
  ): boolean {
    if (this.activeRivals.size >= this.config.maxActiveRivals) {
      return false;
    }
    
    if (!zoneProps || !zone) return false;
    
    // Check spawn rate against zone properties
    const spawnChance = zoneProps.rivalSpawnRate * this.config.baseSpawnRate;
    if (Math.random() > spawnChance) {
      return false;
    }
    
    // Get club owner from zone
    const clubOwner = zone.clubOwner;
    
    // Try to get rivals from Club Manager first
    let availableRivals: RivalDefinition[] = [];
    
    if (clubOwner) {
      // Get rivals for this zone from Club Manager
      const clubRivals = this.clubManager.getRivalsForZone(zone.id);
      availableRivals = clubRivals.map(r => this.convertClubRivalToSpawnable(r));
    }
    
    // Fallback to legacy spawn tables if no club rivals
    if (availableRivals.length === 0) {
      const spawnTable = this.getSpawnTableForZone(zone.type);
      if (!spawnTable || spawnTable.length === 0) return false;
      
      const selectedRival = this.selectRivalFromTable(spawnTable);
      if (!selectedRival) return false;
      availableRivals = [selectedRival];
    }
    
    // Select random rival from available pool
    const selectedRival = availableRivals[Math.floor(Math.random() * availableRivals.length)];
    
    // Check reputation requirement
    if (selectedRival.minReputation !== undefined && this.zoneManager) {
      const clubRep = selectedRival.clubId ? 
        this.zoneManager.getClubReputation(selectedRival.clubId) : 0;
      if (clubRep < selectedRival.minReputation) {
        return false;
      }
    }
    
    // Find spawn position
    const spawnPos = this.findSpawnPosition(playerPosition);
    if (!spawnPos) return false;
    
    // Create spawned rival
    const rival: SpawnedRival = {
      definition: selectedRival,
      position: spawnPos,
      lane: Math.round(spawnPos.x / TRAFFIC_CONFIG.LANE_WIDTH),
      speed: this.calculateRivalSpeed(selectedRival),
      state: 'CRUISING',
      challengeInitiated: false,
    };
    
    // Allocate instance
    const instanceIndex = this.allocateInstance(rival);
    if (instanceIndex !== null) {
      rival.instanceIndex = instanceIndex;
    }
    
    // Add to active rivals
    this.activeRivals.set(rival.definition.id + '_' + Date.now(), rival);
    
    // Set spawn cooldown based on difficulty
    const diffConfig = RIVAL_CONFIG[`DIFFICULTY_${selectedRival.difficulty}`];
    this.spawnCooldown = 5 / (diffConfig?.reaction || 0.3);
    
    // Callback
    if (this.onRivalSpawned) {
      this.onRivalSpawned(rival);
    }
    
    return true;
  }

  /**
   * Get spawn table for zone type
   */
  private getSpawnTableForZone(zoneType: string): RivalSpawnTable[] {
    return this.spawnTables.get(zoneType) || [];
  }

  /**
   * Convert Club Manager rival definition to spawnable rival
   */
  private convertClubRivalToSpawnable(clubRival: ClubRivalDefinition): RivalDefinition {
    // Map club rival role to rival type
    let rivalType: RivalType;
    switch (clubRival.role) {
      case 'LEADER':
        rivalType = RivalType.BOSS;
        break;
      case 'WANDERER':
        rivalType = RivalType.WANDERER;
        break;
      case 'MID_BOSS':
        rivalType = RivalType.TECHNICAL;
        break;
      default:
        // Map stats to determine type
        if (clubRival.stats.speed >= 80) {
          rivalType = RivalType.SPRINT;
        } else if (clubRival.stats.aggression >= 75) {
          rivalType = RivalType.AGGRESSOR;
        } else if (clubRival.stats.skill >= 80) {
          rivalType = RivalType.TECHNICAL;
        } else {
          rivalType = RivalType.CRUISER;
        }
    }
    
    // Map difficulty from stats
    const avgStats = (clubRival.stats.speed + clubRival.stats.aggression + clubRival.stats.skill) / 3;
    let difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
    if (avgStats < 60) {
      difficulty = 'EASY';
    } else if (avgStats < 75) {
      difficulty = 'MEDIUM';
    } else if (avgStats < 90) {
      difficulty = 'HARD';
    } else {
      difficulty = 'EXTREME';
    }
    
    // Generate color from club colors or use default
    let carColor = 0xff0000; // Default red
    // Could extract from club data if needed
    
    return {
      id: clubRival.id,
      name: clubRival.name,
      clubId: clubRival.clubId,
      carModel: clubRival.carModel,
      stats: clubRival.stats,
      spawnZones: clubRival.spawnZones,
      activeTimes: clubRival.activeTimes,
      role: clubRival.role,
      wandererConditions: clubRival.wandererConditions,
      specialMoves: clubRival.specialMoves,
      dialogue: clubRival.dialogue,
      unlockRequirements: clubRival.unlockRequirements,
      type: rivalType,
      difficulty,
      speedModifier: clubRival.stats.speed / 100,
      aggressionModifier: clubRival.stats.aggression / 100,
      skillModifier: clubRival.stats.skill / 100,
      carColor,
    };
  }

  /**
   * Select rival from spawn table
   */
  private selectRivalFromTable(tables: RivalSpawnTable[]): RivalDefinition | null {
    // Filter by time of day
    const validTables = tables.filter((table) => {
      if (!table.timeRange) return true;
      const [start, end] = table.timeRange;
      if (start <= end) {
        return this.currentTimeOfDay >= start && this.currentTimeOfDay < end;
      } else {
        return this.currentTimeOfDay >= start || this.currentTimeOfDay < end;
      }
    });
    
    if (validTables.length === 0) return null;
    
    // Weight selection
    const totalWeight = validTables.reduce((sum, t) => sum + t.spawnWeight, 0);
    const random = Math.random() * totalWeight;
    
    let cumulative = 0;
    let selectedTable = validTables[0];
    
    for (const table of validTables) {
      cumulative += table.spawnWeight;
      if (random < cumulative) {
        selectedTable = table;
        break;
      }
    }
    
    // Select random rival from table
    if (selectedTable.rivals.length === 0) return null;
    const rivalIndex = Math.floor(Math.random() * selectedTable.rivals.length);
    return selectedTable.rivals[rivalIndex];
  }

  /**
   * Find valid spawn position
   */
  private findSpawnPosition(playerPosition: THREE.Vector3): THREE.Vector3 | null {
    const playerZ = playerPosition.z;
    const spawnZ = playerZ - this.config.spawnAheadDistance - Math.random() * 30;
    
    // Check minimum distance from other rivals
    for (const [, rival] of this.activeRivals) {
      const distZ = Math.abs(rival.position.z - spawnZ);
      if (distZ < this.config.minSpawnDistance) {
        return null;
      }
    }
    
    // Select random lane
    const laneCount = TRAFFIC_CONFIG.LANE_COUNT;
    const halfLanes = Math.floor(laneCount / 2);
    const lane = Math.floor(Math.random() * laneCount) - halfLanes;
    
    return new THREE.Vector3(
      lane * TRAFFIC_CONFIG.LANE_WIDTH,
      0,
      spawnZ
    );
  }

  /**
   * Calculate rival speed based on definition
   */
  private calculateRivalSpeed(rival: RivalDefinition): number {
    const diffConfig = RIVAL_CONFIG[`DIFFICULTY_${rival.difficulty}`];
    const baseSpeed = diffConfig?.speed || 1.0;
    return baseSpeed * rival.speedModifier * 0.6; // Scale to game units
  }

  /**
   * Allocate instance for rival
   */
  private allocateInstance(rival: SpawnedRival): number | null {
    if (!this.instancedMeshManager) return null;
    
    // Simple allocation - in production would use proper pooling
    const position = rival.position;
    const rotation = new THREE.Euler(0, Math.PI, 0); // Face forward
    const scale = new THREE.Vector3(1, 1, 1);
    
    // Use color from definition
    const color = new THREE.Color(rival.definition.carColor);
    
    return this.instancedMeshManager.addInstance(position, rotation, scale, color);
  }

  /**
   * Update active rivals
   */
  private updateActiveRivals(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number
  ): void {
    const rivalsToRemove: string[] = [];
    
    for (const [id, rival] of this.activeRivals.entries()) {
      // Check despawn
      if (rival.position.z < playerPosition.z - this.config.despawnBehindDistance) {
        rivalsToRemove.push(id);
        continue;
      }
      
      // Update rival behavior based on state
      this.updateRivalBehavior(rival, deltaTime, playerPosition, playerSpeed);
      
      // Update instance transform
      this.updateRivalInstance(rival);
    }
    
    // Remove despawned rivals
    for (const id of rivalsToRemove) {
      this.removeRival(id);
    }
  }

  /**
   * Update rival behavior based on state
   */
  private updateRivalBehavior(
    rival: SpawnedRival,
    dt: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number
  ): void {
    const diffConfig = RIVAL_CONFIG[`DIFFICULTY_${rival.definition.difficulty}`];
    
    switch (rival.state) {
      case 'CRUISING':
        // Cruise at constant speed
        rival.position.z -= rival.speed * 60 * dt;
        
        // Check if player is close for potential challenge
        const distToPlayer = Math.abs(rival.position.z - playerPosition.z);
        if (distToPlayer < 30 && !rival.challengeInitiated) {
          // Consider initiating challenge
          if (Math.random() < 0.02 * rival.definition.aggressionModifier) {
            rival.state = 'CHALLENGING';
          }
        }
        break;
        
      case 'CHALLENGING':
        // Accelerate to challenge player
        const targetSpeed = playerSpeed * rival.definition.speedModifier;
        rival.speed += (targetSpeed - rival.speed) * 0.05;
        rival.position.z -= rival.speed * 60 * dt;
        
        // Move towards player's lane
        const playerLane = Math.round(playerPosition.x / TRAFFIC_CONFIG.LANE_WIDTH);
        if (rival.lane !== playerLane) {
          rival.lane += Math.sign(playerLane - rival.lane) * 0.02;
        }
        
        rival.position.x = rival.lane * TRAFFIC_CONFIG.LANE_WIDTH;
        
        // Transition to racing after brief challenge period
        if (this.challengeCooldown <= 0) {
          rival.state = 'RACING';
          rival.challengeInitiated = true;
          if (this.onChallengeInitiated) {
            this.onChallengeInitiated(rival);
          }
        }
        break;
        
      case 'RACING':
        // Full racing behavior
        const raceSpeed = playerSpeed * rival.definition.speedModifier * 1.1;
        rival.speed += (raceSpeed - rival.speed) * 0.03;
        rival.position.z -= rival.speed * 60 * dt;
        
        // Aggressive lane changes to block player
        if (Math.random() < 0.01 * rival.definition.aggressionModifier) {
          const direction = Math.random() > 0.5 ? 1 : -1;
          rival.lane = Math.max(-2, Math.min(2, rival.lane + direction));
        }
        
        rival.position.x = rival.lane * TRAFFIC_CONFIG.LANE_WIDTH;
        break;
        
      case 'FLEEING':
        // Slow down and move aside
        rival.speed *= 0.98;
        rival.position.z -= rival.speed * 60 * dt;
        
        // Move to edge lane
        const edgeLane = rival.position.x > 0 ? 2 : -2;
        if (rival.lane !== edgeLane) {
          rival.lane += Math.sign(edgeLane - rival.lane) * 0.03;
        }
        
        rival.position.x = rival.lane * TRAFFIC_CONFIG.LANE_WIDTH;
        break;
    }
  }

  /**
   * Update rival instance transform
   */
  private updateRivalInstance(rival: SpawnedRival): void {
    if (!this.instancedMeshManager || rival.instanceIndex === undefined) return;
    
    const rotation = new THREE.Euler(0, Math.PI, 0);
    const scale = new THREE.Vector3(1, 1, 1);
    
    // Add slight rotation during lane changes
    if (rival.state === 'RACING') {
      rotation.y = Math.PI + (rival.lane % 2 === 0 ? 0.05 : -0.05);
    }
    
    this.instancedMeshManager.updateInstance(
      rival.instanceIndex,
      rival.position,
      rotation,
      scale
    );
  }

  /**
   * Check for headlight flash challenges
   */
  private checkFlashChallenges(playerPosition: THREE.Vector3): void {
    // This would integrate with HeadlightFlashDetector
    // For now, just check if any rival is in front and could be challenged
  }

  /**
   * Remove a rival
   */
  private removeRival(id: string): void {
    const rival = this.activeRivals.get(id);
    if (!rival) return;
    
    // Free instance
    if (rival.instanceIndex !== undefined && this.instancedMeshManager) {
      this.instancedMeshManager.removeInstance(rival.instanceIndex);
    }
    
    // Callback
    if (this.onRivalDefeated && rival.state === 'RACING') {
      this.onRivalDefeated(rival);
    }
    
    this.activeRivals.delete(id);
  }

  /**
   * Initiate challenge with specific rival
   */
  initiateChallenge(rivalId: string): boolean {
    const rival = this.activeRivals.get(rivalId);
    if (!rival || rival.challengeInitiated) return false;
    
    rival.state = 'CHALLENGING';
    rival.challengeInitiated = true;
    this.challengeCooldown = 2; // 2 second cooldown between challenges
    
    if (this.onChallengeInitiated) {
      this.onChallengeInitiated(rival);
    }
    
    return true;
  }

  /**
   * Set callbacks
   */
  onRivalSpawned(callback: (rival: SpawnedRival) => void): void {
    this.onRivalSpawned = callback;
  }

  onChallengeInitiated(callback: (rival: SpawnedRival) => void): void {
    this.onChallengeInitiated = callback;
  }

  onRivalDefeated(callback: (rival: SpawnedRival) => void): void {
    this.onRivalDefeated = callback;
  }

  /**
   * Update player state for requirement checking
   */
  updatePlayerState(state: Partial<PlayerState>): void {
    this.playerState = { ...this.playerState, ...state };
  }

  /**
   * Get current player state
   */
  getPlayerState(): Partial<PlayerState> {
    return { ...this.playerState };
  }

  /**
   * Record rival defeat and update Club Manager
   */
  recordRivalDefeat(rivalId: string): void {
    // Update Club Manager
    this.clubManager.recordRivalDefeated(rivalId);
    
    // Update local player state
    if (this.playerState.defeatedRivals) {
      this.playerState.defeatedRivals.push(rivalId);
    } else {
      this.playerState.defeatedRivals = [rivalId];
    }
    
    // Update win streak
    this.playerState.winStreak = (this.playerState.winStreak || 0) + 1;
    this.playerState.totalWins = (this.playerState.totalWins || 0) + 1;
  }

  /**
   * Check if player can challenge a club leader
   */
  canChallengeLeader(clubId: string): boolean {
    return this.clubManager.canChallengeLeader(clubId, this.playerState as PlayerState);
  }

  /**
   * Get progress towards challenging a club leader
   */
  getLeaderChallengeProgress(clubId: string): {
    requirement: import('../types/ClubSystem').ClubRequirement;
    current: number;
    required: number;
    percentage: number;
  }[] {
    return this.clubManager.getProgressTowardsLeader(clubId, this.playerState as PlayerState);
  }

  /**
   * Get active rivals
   */
  getActiveRivals(): SpawnedRival[] {
    return Array.from(this.activeRivals.values());
  }

  /**
   * Get rival count
   */
  getActiveCount(): number {
    return this.activeRivals.size;
  }

  /**
   * Clear all rivals
   */
  clear(): void {
    for (const id of this.activeRivals.keys()) {
      this.removeRival(id);
    }
    this.activeRivals.clear();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    
    for (const [, geo] of this.rivalGeometries) {
      geo.dispose();
    }
    this.rivalGeometries.clear();
    
    for (const [, mat] of this.rivalMaterials) {
      mat.dispose();
    }
    this.rivalMaterials.clear();
    
    if (this.instancedMeshManager) {
      this.instancedMeshManager.dispose();
    }
  }
}
