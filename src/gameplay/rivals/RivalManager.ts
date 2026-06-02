/**
 * Rival Manager - Manages all rivals, clubs, and wanderers
 */

import { RivalComponent, RivalComponentData, RivalStats } from './RivalComponent';
import { ClubDatabase, ClubData } from './ClubDatabase';
import { WandererDatabase, WandererData } from './WandererDatabase';
import { ConditionChecker } from './ConditionChecker';
import { RivalCar } from '../../entities/RivalCar';
import { RivalSpawner } from '../highway/RivalSpawner';

export interface RivalManagerConfig {
  maxActiveRivals: number;
  enableClubs: boolean;
  enableWanderers: boolean;
}

export const DEFAULT_RIVAL_MANAGER_CONFIG: RivalManagerConfig = {
  maxActiveRivals: 10,
  enableClubs: true,
  enableWanderers: true,
};

export type RivalEventType = 
  | 'RIVAL_SPAWNED'
  | 'RIVAL_DEFEATED'
  | 'CLUB_CHALLENGE_AVAILABLE'
  | 'WANDERER_APPEARED'
  | 'BOSS_UNLOCKED';

export interface RivalEvent {
  type: RivalEventType;
  rivalId?: string;
  clubId?: string;
  timestamp: number;
}

export class RivalManager {
  private config: RivalManagerConfig;
  private rivals: Map<string, RivalComponent>;
  private activeRivals: Set<string>;
  private clubDatabase: ClubDatabase;
  private wandererDatabase: WandererDatabase;
  private conditionChecker: ConditionChecker;
  private spawner: RivalSpawner | null;
  private eventListeners: Set<(event: RivalEvent) => void>;
  private playerProgress: {
    totalTime: number;
    totalDistance: number;
    totalDefeats: number;
    clubProgress: Record<string, number>;
  };

  constructor(config: Partial<RivalManagerConfig> = {}) {
    this.config = { ...DEFAULT_RIVAL_MANAGER_CONFIG, ...config };
    this.rivals = new Map();
    this.activeRivals = new Set();
    this.clubDatabase = new ClubDatabase();
    this.wandererDatabase = new WandererDatabase();
    this.conditionChecker = new ConditionChecker();
    this.spawner = null;
    this.eventListeners = new Set();
    this.playerProgress = {
      totalTime: 0,
      totalDistance: 0,
      totalDefeats: 0,
      clubProgress: {},
    };
  }

  setSpawner(spawner: RivalSpawner): void {
    this.spawner = spawner;
  }

  subscribeEvents(listener: (event: RivalEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emitEvent(event: RivalEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Register a rival
   */
  registerRival(data: RivalComponentData): RivalComponent {
    const rival = new RivalComponent(data);
    this.rivals.set(rival.data.id, rival);
    
    // Check if rival belongs to a club
    if (data.clubId && this.config.enableClubs) {
      const club = this.clubDatabase.getClub(data.clubId);
      if (club) {
        // Club member registered
      }
    }

    return rival;
  }

  /**
   * Get rival by ID
   */
  getRival(id: string): RivalComponent | null {
    return this.rivals.get(id) || null;
  }

  /**
   * Get all rivals
   */
  getAllRivals(): RivalComponent[] {
    return Array.from(this.rivals.values());
  }

  /**
   * Get rivals by club
   */
  getRivalsByClub(clubId: string): RivalComponent[] {
    const result: RivalComponent[] = [];
    for (const rival of this.rivals.values()) {
      if (rival.data.clubId === clubId) {
        result.push(rival);
      }
    }
    return result;
  }

  /**
   * Get available rivals (not defeated or reset)
   */
  getAvailableRivals(): RivalComponent[] {
    return this.getAllRivals().filter(r => !r.data.isDefeated);
  }

  /**
   * Mark rival as defeated
   */
  defeatRival(id: string): void {
    const rival = this.rivals.get(id);
    if (!rival) return;

    rival.recordDefeat(performance.now() / 1000);
    this.playerProgress.totalDefeats++;

    // Update club progress
    if (rival.data.clubId) {
      const club = this.clubDatabase.getClub(rival.data.clubId);
      if (club) {
        this.updateClubProgress(club.id);
      }
    }

    // Check for boss unlock
    this.checkBossUnlocks();

    this.emitEvent({
      type: 'RIVAL_DEFEATED',
      rivalId: id,
      timestamp: performance.now() / 1000,
    });
  }

  /**
   * Update club progress after defeating a member
   */
  private updateClubProgress(clubId: string): void {
    const club = this.clubDatabase.getClub(clubId);
    if (!club) return;

    const members = this.getRivalsByClub(clubId);
    const defeatedCount = members.filter(m => m.data.isDefeated).length;
    const progress = defeatedCount / members.length;

    this.playerProgress.clubProgress[clubId] = progress;

    // Check if club is fully defeated
    if (progress >= 1) {
      this.emitEvent({
        type: 'CLUB_CHALLENGE_AVAILABLE',
        clubId,
        timestamp: performance.now() / 1000,
      });
    }
  }

  /**
   * Check if club boss should be unlocked
   */
  private checkBossUnlocks(): void {
    for (const club of this.clubDatabase.getAllClubs()) {
      const members = this.getRivalsByClub(club.id);
      const allDefeated = members.every(m => m.data.isDefeated);
      
      if (allDefeated && club.leaderId) {
        const boss = this.rivals.get(club.leaderId);
        if (boss && !boss.data.isDefeated) {
          this.emitEvent({
            type: 'BOSS_UNLOCKED',
            rivalId: club.leaderId,
            timestamp: performance.now() / 1000,
          });
        }
      }
    }
  }

  /**
   * Check for wanderer appearances
   */
  checkWanderers(currentTime: number, playerState: {
    speed: number;
    mileage: number;
    weather: string;
    timeOfDay: number;
  }): WandererData | null {
    if (!this.config.enableWanderers) return null;

    const wanderers = this.wandererDatabase.getAllWanderers();
    
    for (const wanderer of wanderers) {
      if (wanderer.conditions) {
        const meetsConditions = this.conditionChecker.check(
          wanderer.conditions,
          {
            speed: playerState.speed,
            mileage: playerState.mileage,
            weather: playerState.weather,
            timeRange: [playerState.timeOfDay, playerState.timeOfDay],
            carModel: undefined,
          }
        );

        if (meetsConditions && !wanderer.isDefeated) {
          this.emitEvent({
            type: 'WANDERER_APPEARED',
            timestamp: currentTime,
          });
          return wanderer;
        }
      }
    }

    return null;
  }

  /**
   * Notify rival of challenge (for AI state change)
   */
  notifyChallenge(rivalId: string): void {
    const rival = this.rivals.get(rivalId);
    if (rival) {
      this.activeRivals.add(rivalId);
      this.emitEvent({
        type: 'RIVAL_SPAWNED',
        rivalId,
        timestamp: performance.now() / 1000,
      });
    }
  }

  /**
   * Update manager
   */
  update(deltaTime: number, currentTime: number, playerZ: number): void {
    this.playerProgress.totalTime += deltaTime;
    this.playerProgress.totalDistance += Math.abs(deltaTime * 100); // Approximate

    // Update active rivals
    for (const rivalId of this.activeRivals) {
      const rival = this.rivals.get(rivalId);
      if (rival) {
        // Could update rival state here
      }
    }

    // Check wanderer conditions periodically
    if (Math.random() < 0.01) {
      this.checkWanderers(currentTime, {
        speed: 0,
        mileage: this.playerProgress.totalDistance,
        weather: 'clear',
        timeOfDay: (currentTime % 86400) / 3600,
      });
    }
  }

  /**
   * Get club by ID
   */
  getClub(clubId: string): ClubData | null {
    return this.clubDatabase.getClub(clubId);
  }

  /**
   * Get all clubs
   */
  getAllClubs(): ClubData[] {
    return this.clubDatabase.getAllClubs();
  }

  /**
   * Get club progress
   */
  getClubProgress(clubId: string): number {
    return this.playerProgress.clubProgress[clubId] || 0;
  }

  /**
   * Reset rival for rematch
   */
  resetRival(id: string): void {
    const rival = this.rivals.get(id);
    if (rival) {
      rival.reset();
    }
  }

  /**
   * Remove rival from active set
   */
  deactivateRival(id: string): void {
    this.activeRivals.delete(id);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRivals: number;
    defeatedRivals: number;
    activeClubs: number;
    completedClubs: number;
  } {
    const defeatedCount = this.getAllRivals().filter(r => r.data.isDefeated).length;
    const clubs = this.clubDatabase.getAllClubs();
    const completedClubs = clubs.filter(c => 
      this.playerProgress.clubProgress[c.id] >= 1
    ).length;

    return {
      totalRivals: this.rivals.size,
      defeatedRivals: defeatedCount,
      activeClubs: clubs.length,
      completedClubs,
    };
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.rivals.clear();
    this.activeRivals.clear();
    this.eventListeners.clear();
  }
}
