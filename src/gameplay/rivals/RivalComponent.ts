/**
 * Rival Component - Core rival data and behavior
 */

import { RivalCar, RivalState } from '../../entities/RivalCar';

export interface RivalStats {
  name: string;
  carModel: string;
  sp: number;
  maxSP: number;
  aggression: number;       // 0-1, affects AI behavior
  skill: number;            // 0-1, affects driving precision
  stamina: number;          // 0-1, affects SP drain rate
  reputation: number;       // Rival's standing in the racing scene
}

export interface RivalComponentData {
  id: string;
  stats: RivalStats;
  clubId: string | null;    // Null if unaffiliated
  isDefeated: boolean;
  defeatCount: number;      // How many times player has beaten this rival
  lastDefeatedAt?: number;  // Timestamp of last defeat
  unlockCondition?: RivalUnlockCondition;
}

export interface RivalUnlockCondition {
  type: 'TIME' | 'DISTANCE' | 'DEFEAT_COUNT' | 'CLUB_PROGRESS' | 'SPECIAL';
  requirement: number | string;
  isMet: boolean;
}

export const DEFAULT_RIVAL_STATS: RivalStats = {
  name: 'Street Racer',
  carModel: 'civic',
  sp: 1000,
  maxSP: 1000,
  aggression: 0.5,
  skill: 0.5,
  stamina: 0.5,
  reputation: 100,
};

export class RivalComponent {
  public data: RivalComponentData;
  private entity: RivalCar | null;

  constructor(data: Partial<RivalComponentData>) {
    this.data = {
      id: data.id ?? `rival_${Date.now()}`,
      stats: { ...DEFAULT_RIVAL_STATS, ...data.stats },
      clubId: data.clubId ?? null,
      isDefeated: data.isDefeated ?? false,
      defeatCount: data.defeatCount ?? 0,
      lastDefeatedAt: data.lastDefeatedAt,
      unlockCondition: data.unlockCondition,
    };
    this.entity = null;
  }

  /**
   * Bind rival to an entity
   */
  bindEntity(entity: RivalCar): void {
    this.entity = entity;
    
    // Apply stats to entity
    if (entity) {
      entity.data.aggression = this.data.stats.aggression;
    }
  }

  /**
   * Get bound entity
   */
  getEntity(): RivalCar | null {
    return this.entity;
  }

  /**
   * Record a defeat by player
   */
  recordDefeat(timestamp: number): void {
    this.data.isDefeated = true;
    this.data.defeatCount++;
    this.data.lastDefeatedAt = timestamp;
    
    // Increase reputation after each defeat
    this.data.stats.reputation = Math.min(
      this.data.stats.reputation + 10,
      1000
    );
  }

  /**
   * Check if rival is unlocked
   */
  isUnlocked(playerProgress: { 
    totalTime: number; 
    totalDistance: number; 
    totalDefeats: number;
    clubProgress: Record<string, number>;
  }): boolean {
    if (!this.data.unlockCondition) return true;

    const cond = this.data.unlockCondition;
    
    switch (cond.type) {
      case 'TIME':
        return playerProgress.totalTime >= (cond.requirement as number);
      case 'DISTANCE':
        return playerProgress.totalDistance >= (cond.requirement as number);
      case 'DEFEAT_COUNT':
        return playerProgress.totalDefeats >= (cond.requirement as number);
      case 'CLUB_PROGRESS':
        return playerProgress.clubProgress[cond.requirement as string] >= 1;
      case 'SPECIAL':
        return cond.isMet;
      default:
        return true;
    }
  }

  /**
   * Get SP multiplier based on stamina
   */
  getSPDrainMultiplier(): number {
    // Higher stamina = slower SP drain
    return 1 - (this.data.stats.stamina * 0.3);
  }

  /**
   * Get speed bonus based on skill
   */
  getSpeedBonus(): number {
    return this.data.stats.skill * 0.2; // Up to 20% bonus
  }

  /**
   * Reset rival (for rematches)
   */
  reset(): void {
    this.data.isDefeated = false;
    this.data.stats.sp = this.data.stats.maxSP;
    
    if (this.entity) {
      this.entity.data.state = RivalState.CHASE;
    }
  }

  /**
   * Get rival display info
   */
  getDisplayInfo(): {
    name: string;
    carModel: string;
    clubName?: string;
    reputation: number;
    isDefeated: boolean;
  } {
    return {
      name: this.data.stats.name,
      carModel: this.data.stats.carModel,
      reputation: this.data.stats.reputation,
      isDefeated: this.data.isDefeated,
    };
  }
}
