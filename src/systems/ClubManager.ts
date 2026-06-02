/**
 * CLUB MANAGER IMPLEMENTATION
 * Full implementation of the Club System API for Tokyo Xtreme Racer-style gameplay
 */

import {
  ClubDefinition,
  RivalDefinition,
  PlayerState,
  ClubRequirement,
  WandererCondition,
  ClubManager as IClubManager,
  DEFAULT_CLUBS,
  DEFAULT_RIVALS,
} from '../types/ClubSystem';

export class ClubManager implements IClubManager {
  private clubs: Map<string, ClubDefinition> = new Map();
  private rivals: Map<string, RivalDefinition> = new Map();
  private zoneToClubMap: Map<string, string> = new Map();
  private defeatedRivals: Set<string> = new Set();
  private clubReputation: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  /**
   * Initialize with default clubs and rivals
   */
  private initializeDefaultData(): void {
    // Load default clubs
    for (const club of DEFAULT_CLUBS) {
      this.clubs.set(club.id, club);
      
      // Map territory zones to club
      for (const zoneId of club.territoryZones) {
        this.zoneToClubMap.set(zoneId, club.id);
      }
    }

    // Load default rivals
    for (const rival of DEFAULT_RIVALS) {
      this.rivals.set(rival.id, rival);
    }

    // Initialize reputation for all clubs
    for (const club of DEFAULT_CLUBS) {
      this.clubReputation.set(club.id, 0);
    }
  }

  /**
   * Get club by ID
   */
  getClubById(id: string): ClubDefinition | undefined {
    return this.clubs.get(id);
  }

  /**
   * Get rival by ID
   */
  getRivalById(id: string): RivalDefinition | undefined {
    return this.rivals.get(id);
  }

  /**
   * Get all rivals that can spawn in a specific zone
   */
  getRivalsForZone(zoneId: string): RivalDefinition[] {
    const clubId = this.zoneToClubMap.get(zoneId);
    if (!clubId) return [];

    const club = this.clubs.get(clubId);
    if (!club) return [];

    // Get all non-wanderer rivals from this club that can spawn in this zone
    return club.rivals
      .map(rivalId => this.rivals.get(rivalId))
      .filter((rival): rival is RivalDefinition => 
        rival !== undefined && 
        rival.role !== 'WANDERER' &&
        rival.spawnZones.includes(zoneId)
      );
  }

  /**
   * Get wanderers that can appear in a specific zone
   */
  getWanderersForZone(zoneId: string): RivalDefinition[] {
    // Get all wanderers that have this zone in their spawn list
    return Array.from(this.rivals.values()).filter(
      rival => 
        rival.role === 'WANDERER' &&
        rival.spawnZones.includes(zoneId)
    );
  }

  /**
   * Check if player can challenge a club leader
   */
  canChallengeLeader(clubId: string, playerState: PlayerState): boolean {
    const club = this.clubs.get(clubId);
    if (!club) return false;

    // Check all requirements
    return club.requirements.every(req => 
      this.checkRequirement(req, playerState)
    );
  }

  /**
   * Check individual requirement
   */
  private checkRequirement(
    req: ClubRequirement, 
    playerState: PlayerState
  ): boolean {
    switch (req.type) {
      case 'beatMembers':
        const beatenInClub = playerState.membersBeatenPerClub[
          this.getClubIdFromDefeatedRivals(playerState)
        ] || 0;
        return beatenInClub >= req.count;

      case 'minMileage':
        return playerState.totalMileage >= req.value;

      case 'timeRange':
        const hour = playerState.currentTimeOfDay;
        if (req.start <= req.end) {
          return hour >= req.start && hour < req.end;
        } else {
          // Wrapping range (e.g., 22-5 means 10 PM to 5 AM)
          return hour >= req.start || hour < req.end;
        }

      case 'carModel':
        return playerState.currentCarModel === req.modelId;

      case 'winStreak':
        return playerState.winStreak >= req.value;

      case 'clubReputation':
        const rep = this.clubReputation.get(req.clubId) || 0;
        return rep >= req.minReputation;

      case 'defeatRival':
        return playerState.defeatedRivals.includes(req.rivalId);

      case 'totalWins':
        return playerState.totalWins >= req.value;

      default:
        return false;
    }
  }

  /**
   * Helper to determine which club's members were beaten
   */
  private getClubIdFromDefeatedRivals(playerState: PlayerState): string {
    // Find the most recently defeated rival's club
    if (playerState.defeatedRivals.length === 0) return '';
    
    const lastDefeatedId = playerState.defeatedRivals[playerState.defeatedRivals.length - 1];
    const rival = this.rivals.get(lastDefeatedId);
    return rival?.clubId || '';
  }

  /**
   * Record a rival as defeated
   */
  recordRivalDefeated(rivalId: string): void {
    this.defeatedRivals.add(rivalId);
    
    // Update club reputation
    const rival = this.rivals.get(rivalId);
    if (rival && rival.clubId !== 'none') {
      const currentRep = this.clubReputation.get(rival.clubId) || 0;
      const repGain = rival.role === 'LEADER' ? 50 : rival.role === 'MID_BOSS' ? 20 : 10;
      this.clubReputation.set(rival.clubId, Math.min(100, currentRep + repGain));
    }
  }

  /**
   * Get all clubs
   */
  getAllClubs(): ClubDefinition[] {
    return Array.from(this.clubs.values());
  }

  /**
   * Get all rivals
   */
  getAllRivals(): RivalDefinition[] {
    return Array.from(this.rivals.values());
  }

  /**
   * Get club that owns a zone
   */
  getClubByZone(zoneId: string): ClubDefinition | undefined {
    const clubId = this.zoneToClubMap.get(zoneId);
    if (!clubId) return undefined;
    return this.clubs.get(clubId);
  }

  /**
   * Get leader rival for a club
   */
  getLeaderRival(clubId: string): RivalDefinition | undefined {
    const club = this.clubs.get(clubId);
    if (!club) return undefined;
    return this.rivals.get(club.leaderId);
  }

  /**
   * Get mid-bosses for a club
   */
  getMidBosses(clubId: string): RivalDefinition[] {
    const club = this.clubs.get(clubId);
    if (!club) return [];

    return club.rivals
      .map(rivalId => this.rivals.get(rivalId))
      .filter((rival): rival is RivalDefinition => 
        rival !== undefined && rival.role === 'MID_BOSS'
      );
  }

  /**
   * Get regular members for a club
   */
  getRegularMembers(clubId: string): RivalDefinition[] {
    const club = this.clubs.get(clubId);
    if (!club) return [];

    return club.rivals
      .map(rivalId => this.rivals.get(rivalId))
      .filter((rival): rival is RivalDefinition => 
        rival !== undefined && rival.role === 'MEMBER'
      );
  }

  /**
   * Check if a wanderer should spawn based on conditions
   */
  checkWandererSpawn(zoneId: string, playerState: PlayerState): RivalDefinition | null {
    const wanderers = this.getWanderersForZone(zoneId);
    
    for (const wanderer of wanderers) {
      if (!wanderer.wandererConditions) continue;

      // Check if all conditions are met
      const allConditionsMet = wanderer.wandererConditions.every(cond =>
        this.checkWandererCondition(cond, playerState)
      );

      if (allConditionsMet) {
        // Additional time check
        const [startHour, endHour] = wanderer.activeTimes;
        const hour = playerState.currentTimeOfDay;
        let isInTimeRange = false;
        
        if (startHour <= endHour) {
          isInTimeRange = hour >= startHour && hour < endHour;
        } else {
          isInTimeRange = hour >= startHour || hour < endHour;
        }

        if (isInTimeRange) {
          return wanderer;
        }
      }
    }

    return null;
  }

  /**
   * Check individual wanderer condition
   */
  private checkWandererCondition(
    cond: WandererCondition,
    playerState: PlayerState
  ): boolean {
    switch (cond.type) {
      case 'carColor':
        return playerState.currentCarColor.toLowerCase() === String(cond.value).toLowerCase();

      case 'carModel':
        return playerState.currentCarModel === cond.value;

      case 'minMileage':
        return playerState.totalMileage >= Number(cond.value);

      case 'maxTraffic':
        // This would need traffic manager integration
        // For now, use isAlone as proxy
        return playerState.isAlone || true;

      case 'minSpeed':
        return playerState.currentSpeed >= Number(cond.value);

      case 'maxSpeed':
        return playerState.currentSpeed <= Number(cond.value);

      case 'timeRange':
        // Handled separately in checkWandererSpawn
        return true;

      case 'beatClub':
        return playerState.clubsBeaten.includes(String(cond.value));

      case 'aloneOnHighway':
        return playerState.isAlone === Boolean(cond.value);

      case 'weatherCondition':
        return playerState.weatherCondition === cond.value;

      case 'specificCarType':
        // Could be extended for specific car categories
        return true;

      default:
        return false;
    }
  }

  /**
   * Update club reputation
   */
  updateClubReputation(clubId: string, delta: number): void {
    const current = this.clubReputation.get(clubId) || 0;
    const newValue = Math.max(-100, Math.min(100, current + delta));
    this.clubReputation.set(clubId, newValue);
  }

  /**
   * Get progress towards challenging a club leader
   */
  getProgressTowardsLeader(
    clubId: string,
    playerState: PlayerState
  ): {
    requirement: ClubRequirement;
    current: number;
    required: number;
    percentage: number;
  }[] {
    const club = this.clubs.get(clubId);
    if (!club) return [];

    return club.requirements.map(req => {
      const progress = this.getRequirementProgress(req, playerState, clubId);
      return {
        requirement: req,
        current: progress.current,
        required: progress.required,
        percentage: Math.min(100, Math.round((progress.current / progress.required) * 100)),
      };
    });
  }

  /**
   * Get numeric progress for a requirement
   */
  private getRequirementProgress(
    req: ClubRequirement,
    playerState: PlayerState,
    clubId: string
  ): { current: number; required: number } {
    switch (req.type) {
      case 'beatMembers':
        const beatenInClub = Object.entries(playerState.membersBeatenPerClub)
          .filter(([key]) => {
            const rival = this.rivals.get(key);
            return rival?.clubId === clubId;
          })
          .reduce((sum, [, count]) => sum + count, 0);
        return { current: beatenInClub, required: req.count };

      case 'minMileage':
        return { current: playerState.totalMileage, required: req.value };

      case 'timeRange':
        // Time-based requirements don't have progress
        return { current: 0, required: 1 };

      case 'carModel':
        return { 
          current: playerState.currentCarModel === req.modelId ? 1 : 0, 
          required: 1 
        };

      case 'winStreak':
        return { current: playerState.winStreak, required: req.value };

      case 'clubReputation':
        const rep = this.clubReputation.get(req.clubId) || 0;
        return { current: rep, required: req.minReputation };

      case 'defeatRival':
        return { 
          current: playerState.defeatedRivals.includes(req.rivalId) ? 1 : 0, 
          required: 1 
        };

      case 'totalWins':
        return { current: playerState.totalWins, required: req.value };

      default:
        return { current: 0, required: 1 };
    }
  }

  /**
   * Load custom clubs
   */
  loadCustomClubs(clubs: ClubDefinition[]): void {
    for (const club of clubs) {
      this.clubs.set(club.id, club);
      
      // Map territory zones to club
      for (const zoneId of club.territoryZones) {
        this.zoneToClubMap.set(zoneId, club.id);
      }
      
      // Initialize reputation
      if (!this.clubReputation.has(club.id)) {
        this.clubReputation.set(club.id, 0);
      }
    }
  }

  /**
   * Load custom rivals
   */
  loadCustomRivals(rivals: RivalDefinition[]): void {
    for (const rival of rivals) {
      this.rivals.set(rival.id, rival);
    }
  }

  /**
   * Reset all progress
   */
  resetProgress(): void {
    this.defeatedRivals.clear();
    for (const clubId of this.clubReputation.keys()) {
      this.clubReputation.set(clubId, 0);
    }
  }

  /**
   * Export save data
   */
  exportSaveData(): object {
    return {
      defeatedRivals: Array.from(this.defeatedRivals),
      clubReputation: Object.fromEntries(this.clubReputation),
    };
  }

  /**
   * Import save data
   */
  importSaveData(data: { defeatedRivals?: string[]; clubReputation?: Record<string, number> }): void {
    if (data.defeatedRivals) {
      this.defeatedRivals = new Set(data.defeatedRivals);
    }
    if (data.clubReputation) {
      this.clubReputation = new Map(Object.entries(data.clubReputation));
    }
  }
}

// Export singleton instance for convenience
export const clubManager = new ClubManager();
