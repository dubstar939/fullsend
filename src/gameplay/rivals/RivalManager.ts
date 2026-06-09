/**
 * Rival Manager - Tokyo Xtreme Racer Style
 * Manages rival spawning, tracking, and interactions with player
 */

import * as THREE from 'three';
import { RivalComponent } from './RivalComponent';
import { ClubDatabase, getClubDatabase } from './ClubDatabase';
import { WandererDatabase, getWandererDatabase } from './WandererDatabase';
import { ConditionChecker, PlayerStateForConditions } from './ConditionChecker';
import { PerformanceMonitor } from '../engine/core/PerformanceMonitor';

export interface RivalManagerConfig {
  /** Maximum active rivals on highway */
  maxActiveRivals: number;
  /** Spawn check interval in seconds */
  spawnCheckInterval: number;
  /** Enable wanderer spawns */
  enableWanderers: boolean;
  /** Enable club rival spawns */
  enableClubRivals: boolean;
}

const DEFAULT_CONFIG: RivalManagerConfig = {
  maxActiveRivals: 8,
  spawnCheckInterval: 5.0,
  enableWanderers: true,
  enableClubRivals: true,
};

export interface ActiveRival {
  id: string;
  component: RivalComponent;
  position: THREE.Vector3;
  speed: number;
  lane: number;
  isChallenging: boolean;
  isInBattle: boolean;
  spawnTime: number;
}

export class RivalManager {
  private config: RivalManagerConfig;
  private performanceMonitor: PerformanceMonitor;
  
  // Databases
  private clubDatabase: ClubDatabase;
  private wandererDatabase: WandererDatabase;
  
  // Active rivals
  private activeRivals: Map<string, ActiveRival> = new Map();
  
  // Defeated rivals tracking
  private defeatedRivals: Set<string> = new Set();
  private beatenClubs: Set<string> = new Set();
  
  // Spawning
  private spawnTimer: number = 0;
  private currentZone: string = '';
  
  // Player state for conditions
  private playerState: PlayerStateForConditions = {
    currentCarModel: 'default',
    currentCarColor: 'white',
    totalMileage: 0,
    currentSpeed: 0,
    currentTimeOfDay: 12,
    isAlone: true,
    weatherCondition: 'clear',
    trafficCount: 0,
    beatenClubs: [],
    defeatedRivals: [],
    winStreak: 0,
    totalWins: 0,
  };
  
  constructor(config: Partial<RivalManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.performanceMonitor = new PerformanceMonitor();
    
    this.clubDatabase = getClubDatabase();
    this.wandererDatabase = getWandererDatabase();
  }
  
  /**
   * Update rival manager
   */
  update(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number
  ): void {
    this.performanceMonitor.beginFrame();
    
    // Update spawn timer
    this.spawnTimer += deltaTime;
    
    if (this.spawnTimer >= this.config.spawnCheckInterval) {
      this.spawnTimer = 0;
      this.trySpawnRivals(playerPosition);
    }
    
    // Update active rivals
    for (const [id, rival] of this.activeRivals.entries()) {
      if (!rival.component) continue;
      
      // Update rival component
      rival.component.update(deltaTime, playerPosition, playerSpeed);
      
      // Update position
      rival.position.z -= rival.speed * 60 * deltaTime;
      
      // Check despawn
      if (rival.position.z > playerPosition.z + 100) {
        this.removeRival(id);
      }
    }
    
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Add a rival to the highway
   */
  addRival(
    id: string,
    rivalData: Partial<RivalComponent>,
    startPosition: THREE.Vector3,
    startLane: number,
    startSpeed: number
  ): ActiveRival | null {
    if (this.activeRivals.size >= this.config.maxActiveRivals) {
      return null;
    }
    
    const component = new RivalComponent(rivalData);
    component.setPosition(startPosition.x, startPosition.z);
    
    const rival: ActiveRival = {
      id,
      component,
      position: startPosition.clone(),
      speed: startSpeed,
      lane: startLane,
      isChallenging: false,
      isInBattle: false,
      spawnTime: Date.now(),
    };
    
    this.activeRivals.set(id, rival);
    return rival;
  }
  
  /**
   * Remove a rival
   */
  removeRival(id: string): void {
    this.activeRivals.delete(id);
  }
  
  /**
   * Try to spawn rivals based on current conditions
   */
  trySpawnRivals(playerPosition: THREE.Vector3): void {
    const availableSlots = this.config.maxActiveRivals - this.activeRivals.size;
    if (availableSlots <= 0) return;
    
    // Try to spawn wanderers
    if (this.config.enableWanderers) {
      this.trySpawnWanderers(playerPosition);
    }
    
    // Try to spawn club rivals
    if (this.config.enableClubRivals) {
      this.trySpawnClubRivals(playerPosition, availableSlots);
    }
  }
  
  /**
   * Try to spawn wanderers
   */
  private trySpawnWanderers(playerPosition: THREE.Vector3): void {
    const wanderers = this.wandererDatabase.getAvailableWanderers(
      this.currentZone,
      {
        currentCarModel: this.playerState.currentCarModel,
        currentCarColor: this.playerState.currentCarColor,
        totalMileage: this.playerState.totalMileage,
        currentSpeed: this.playerState.currentSpeed,
        currentTimeOfDay: this.playerState.currentTimeOfDay,
        isAlone: this.playerState.isAlone,
        weatherCondition: this.playerState.weatherCondition,
        defeatedRivals: Array.from(this.defeatedRivals),
      }
    );
    
    for (const wanderer of wanderers) {
      if (this.activeRivals.size >= this.config.maxActiveRivals) break;
      
      // Check if already spawned
      if (Array.from(this.activeRivals.values()).some(r => r.id === wanderer.id)) {
        continue;
      }
      
      // Spawn wanderer ahead of player
      const spawnZ = playerPosition.z - (100 + Math.random() * 50);
      const lane = Math.floor(Math.random() * 5) - 2;
      const spawnPos = new THREE.Vector3(lane * 4.2, 0, spawnZ);
      
      this.addRival(
        wanderer.id,
        {
          name: wanderer.name,
          carModel: wanderer.carModel,
          stats: wanderer.stats,
          aggression: wanderer.aggression,
          spawnZones: wanderer.spawnZones,
          activeTimeRange: wanderer.activeTimes,
          wandererConditions: wanderer.conditions,
        },
        spawnPos,
        lane,
        0.7
      );
      
      this.wandererDatabase.recordEncounter(wanderer.id);
    }
  }
  
  /**
   * Try to spawn club rivals
   */
  private trySpawnClubRivals(playerPosition: THREE.Vector3, availableSlots: number): void {
    const currentHour = this.playerState.currentTimeOfDay;
    const zoneRivals = this.clubDatabase.getRivalsForZone(this.currentZone);
    
    // Filter by time and not defeated
    const availableRivals = zoneRivals.filter(rival => {
      if (this.defeatedRivals.has(rival.id)) return false;
      
      const [start, end] = rival.activeTimes;
      if (start <= end) {
        return currentHour >= start && currentHour <= end;
      } else {
        return currentHour >= start || currentHour <= end;
      }
    });
    
    // Spawn random rivals from available pool
    const spawnCount = Math.min(availableSlots, Math.floor(Math.random() * 3) + 1);
    
    for (let i = 0; i < spawnCount; i++) {
      if (availableRivals.length === 0) break;
      
      const index = Math.floor(Math.random() * availableRivals.length);
      const rival = availableRivals.splice(index, 1)[0];
      
      const spawnZ = playerPosition.z - (80 + Math.random() * 70);
      const lane = Math.floor(Math.random() * 5) - 2;
      const spawnPos = new THREE.Vector3(lane * 4.2, 0, spawnZ);
      
      this.addRival(
        rival.id,
        {
          name: rival.name,
          clubId: rival.clubId,
          carModel: rival.carModel,
          stats: rival.stats,
          role: rival.role,
          aggression: rival.aggression,
          spawnZones: rival.spawnZones,
          activeTimeRange: rival.activeTimes,
        },
        spawnPos,
        lane,
        0.6 + Math.random() * 0.2
      );
    }
  }
  
  /**
   * Find nearby challengeable rival
   */
  findNearbyChallengeableRival(
    playerPosition: THREE.Vector3,
    searchRadius: number = 30
  ): ActiveRival | null {
    for (const rival of this.activeRivals.values()) {
      const distance = rival.position.distanceTo(playerPosition);
      
      if (distance <= searchRadius) {
        const currentHour = this.playerState.currentTimeOfDay;
        
        if (rival.component.canBeChallenged(currentHour, this.currentZone)) {
          return rival;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Initiate challenge with rival
   */
  initiateChallenge(rivalId: string): boolean {
    const rival = this.activeRivals.get(rivalId);
    if (!rival) return false;
    
    rival.isChallenging = true;
    return rival.component.acceptChallenge();
  }
  
  /**
   * Start battle with rival
   */
  startBattle(rivalId: string): boolean {
    const rival = this.activeRivals.get(rivalId);
    if (!rival) return false;
    
    rival.isChallenging = false;
    rival.isInBattle = true;
    rival.component.startBattle();
    
    return true;
  }
  
  /**
   * End battle with rival
   */
  endBattle(rivalId: string, playerWon: boolean): void {
    const rival = this.activeRivals.get(rivalId);
    if (!rival) return;
    
    rival.component.endBattle(!playerWon);
    rival.isInBattle = false;
    
    if (playerWon) {
      this.defeatedRivals.add(rivalId);
      
      // Check if club leader was defeated
      const rivalData = this.clubDatabase.getRivalById(rivalId);
      if (rivalData && rivalData.clubId && rivalData.role === 'LEADER') {
        this.beatenClubs.add(rivalData.clubId);
        this.playerState.beatenClubs = Array.from(this.beatenClubs);
      }
      
      this.playerState.totalWins++;
      this.playerState.winStreak++;
    } else {
      this.playerState.winStreak = 0;
    }
  }
  
  /**
   * Set current zone
   */
  setCurrentZone(zoneId: string): void {
    this.currentZone = zoneId;
  }
  
  /**
   * Update player state for condition checking
   */
  updatePlayerState(state: Partial<PlayerStateForConditions>): void {
    this.playerState = { ...this.playerState, ...state };
  }
  
  /**
   * Get all active rivals
   */
  getActiveRivals(): ActiveRival[] {
    return Array.from(this.activeRivals.values());
  }
  
  /**
   * Get rival by ID
   */
  getRivalById(id: string): ActiveRival | undefined {
    return this.activeRivals.get(id);
  }
  
  /**
   * Get defeated rivals count
   */
  getDefeatedCount(): number {
    return this.defeatedRivals.size;
  }
  
  /**
   * Get beaten clubs count
   */
  getBeatenClubsCount(): number {
    return this.beatenClubs.size;
  }
  
  /**
   * Check if rival is defeated
   */
  isRivalDefeated(rivalId: string): boolean {
    return this.defeatedRivals.has(rivalId);
  }
  
  /**
   * Check if club is beaten
   */
  isClubBeaten(clubId: string): boolean {
    return this.beatenClubs.has(clubId);
  }
  
  /**
   * Clear all rivals
   */
  clear(): void {
    this.activeRivals.clear();
  }
  
  /**
   * Reset progress
   */
  resetProgress(): void {
    this.defeatedRivals.clear();
    this.beatenClubs.clear();
    this.playerState.defeatedRivals = [];
    this.playerState.beatenClubs = [];
    this.playerState.winStreak = 0;
    this.playerState.totalWins = 0;
    
    this.wandererDatabase.resetProgress();
  }
  
  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}

export default RivalManager;
