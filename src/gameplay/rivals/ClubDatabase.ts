/**
 * Club Database - Tokyo Xtreme Racer Style
 * JSON-driven club definitions and rival rosters
 */

import { ClubDefinition, RivalDefinition, DEFAULT_CLUBS, DEFAULT_RIVALS } from '../types/ClubSystem';

export interface ClubDatabaseConfig {
  /** Custom clubs to add/override */
  customClubs?: Partial<ClubDefinition>[];
  /** Custom rivals to add/override */
  customRivals?: Partial<RivalDefinition>[];
  /** Enable default clubs */
  enableDefaults: boolean;
}

const DEFAULT_CONFIG: ClubDatabaseConfig = {
  enableDefaults: true,
};

export class ClubDatabase {
  private clubs: Map<string, ClubDefinition> = new Map();
  private rivals: Map<string, RivalDefinition> = new Map();
  private config: ClubDatabaseConfig;
  
  constructor(config: Partial<ClubDatabaseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }
  
  /**
   * Initialize database with default and custom data
   */
  private initialize(): void {
    // Load default clubs
    if (this.config.enableDefaults) {
      for (const club of DEFAULT_CLUBS) {
        this.clubs.set(club.id, club);
      }
      
      for (const rival of DEFAULT_RIVALS) {
        this.rivals.set(rival.id, rival);
      }
    }
    
    // Apply custom overrides
    if (this.config.customClubs) {
      for (const clubData of this.config.customClubs) {
        if (clubData.id) {
          const existing = this.clubs.get(clubData.id);
          if (existing) {
            this.clubs.set(clubData.id, { ...existing, ...clubData });
          } else {
            this.clubs.set(clubData.id, clubData as ClubDefinition);
          }
        }
      }
    }
    
    if (this.config.customRivals) {
      for (const rivalData of this.config.customRivals) {
        if (rivalData.id) {
          const existing = this.rivals.get(rivalData.id);
          if (existing) {
            this.rivals.set(rivalData.id, { ...existing, ...rivalData });
          } else {
            this.rivals.set(rivalData.id, rivalData as RivalDefinition);
          }
        }
      }
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
   * Get rivals for a specific club
   */
  getRivalsForClub(clubId: string): RivalDefinition[] {
    return Array.from(this.rivals.values()).filter(r => r.clubId === clubId);
  }
  
  /**
   * Get club members (excluding leader and mid-boss)
   */
  getClubMembers(clubId: string): RivalDefinition[] {
    return this.getRivalsForClub(clubId).filter(r => r.role === 'MEMBER');
  }
  
  /**
   * Get club mid-bosses
   */
  getClubMidBosses(clubId: string): RivalDefinition[] {
    return this.getRivalsForClub(clubId).filter(r => r.role === 'MID_BOSS');
  }
  
  /**
   * Get club leader
   */
  getClubLeader(clubId: string): RivalDefinition | undefined {
    return this.getRivalsForClub(clubId).find(r => r.role === 'LEADER');
  }
  
  /**
   * Get club wanderers
   */
  getClubWanderers(clubId: string): RivalDefinition[] {
    return this.getRivalsForClub(clubId).filter(
      r => r.role === 'WANDERER' || (r.wandererConditions && r.wandererConditions.length > 0)
    );
  }
  
  /**
   * Get rivals for zone
   */
  getRivalsForZone(zoneId: string): RivalDefinition[] {
    return Array.from(this.rivals.values()).filter(r => 
      r.spawnZones.includes(zoneId)
    );
  }
  
  /**
   * Get clubs that control a zone
   */
  getClubsForZone(zoneId: string): ClubDefinition[] {
    return Array.from(this.clubs.values()).filter(club =>
      club.territoryZones.includes(zoneId)
    );
  }
  
  /**
   * Get rival by name (case-insensitive)
   */
  getRivalByName(name: string): RivalDefinition | undefined {
    const lowerName = name.toLowerCase();
    return Array.from(this.rivals.values()).find(
      r => r.name.toLowerCase() === lowerName
    );
  }
  
  /**
   * Get club by name (case-insensitive)
   */
  getClubByName(name: string): ClubDefinition | undefined {
    const lowerName = name.toLowerCase();
    return Array.from(this.clubs.values()).find(
      c => c.name.toLowerCase() === lowerName
    );
  }
  
  /**
   * Get rivals active at specific hour
   */
  getRivalsActiveAtHour(hour: number): RivalDefinition[] {
    return Array.from(this.rivals.values()).filter(rival => {
      const [start, end] = rival.activeTimes;
      
      if (start <= end) {
        return hour >= start && hour <= end;
      } else {
        // Overnight range (e.g., 22-5)
        return hour >= start || hour <= end;
      }
    });
  }
  
  /**
   * Get rivals with specific role
   */
  getRivalsByRole(role: RivalDefinition['role']): RivalDefinition[] {
    return Array.from(this.rivals.values()).filter(r => r.role === role);
  }
  
  /**
   * Add custom club
   */
  addClub(club: ClubDefinition): void {
    this.clubs.set(club.id, club);
  }
  
  /**
   * Add custom rival
   */
  addRival(rival: RivalDefinition): void {
    this.rivals.set(rival.id, rival);
  }
  
  /**
   * Remove club
   */
  removeClub(clubId: string): boolean {
    return this.clubs.delete(clubId);
  }
  
  /**
   * Remove rival
   */
  removeRival(rivalId: string): boolean {
    return this.rivals.delete(rivalId);
  }
  
  /**
   * Export database to JSON
   */
  toJSON(): { clubs: ClubDefinition[]; rivals: RivalDefinition[] } {
    return {
      clubs: this.getAllClubs(),
      rivals: this.getAllRivals(),
    };
  }
  
  /**
   * Import database from JSON
   */
  fromJSON(data: { clubs: ClubDefinition[]; rivals: RivalDefinition[] }): void {
    for (const club of data.clubs) {
      this.clubs.set(club.id, club);
    }
    
    for (const rival of data.rivals) {
      this.rivals.set(rival.id, rival);
    }
  }
  
  /**
   * Get total club count
   */
  getClubCount(): number {
    return this.clubs.size;
  }
  
  /**
   * Get total rival count
   */
  getRivalCount(): number {
    return this.rivals.size;
  }
  
  /**
   * Clear all data
   */
  clear(): void {
    this.clubs.clear();
    this.rivals.clear();
    this.initialize();
  }
}

// Singleton instance
let clubDatabaseInstance: ClubDatabase | null = null;

export function getClubDatabase(config?: Partial<ClubDatabaseConfig>): ClubDatabase {
  if (!clubDatabaseInstance) {
    clubDatabaseInstance = new ClubDatabase(config);
  }
  return clubDatabaseInstance;
}

export default ClubDatabase;
