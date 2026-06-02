/**
 * Club Database - Racing club definitions and data
 */

export interface ClubColor {
  primary: string;
  secondary: string;
  accent: string;
}

export interface ClubData {
  id: string;
  name: string;
  description: string;
  colors: ClubColor;
  leaderId: string | null;    // Boss rival ID
  memberIds: string[];        // List of member rival IDs
  territory: string;          // Highway section they control
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  isBossClub: boolean;        // Final boss club
  unlockRequirement?: {
    type: 'DEFEAT_CLUBS' | 'DISTANCE' | 'WINS';
    count: number;
  };
}

export const DEFAULT_CLUBS: ClubData[] = [
  {
    id: 'club_speedhunters',
    name: 'Speed Hunters',
    description: 'Street racers who hunt for the fastest times on the highway.',
    colors: { primary: '#ef4444', secondary: '#1f2937', accent: '#fbbf24' },
    leaderId: 'rival_sh_boss',
    memberIds: ['rival_sh_01', 'rival_sh_02', 'rival_sh_03'],
    territory: 'Shuto Expressway - Inner Loop',
    difficulty: 'EASY',
    isBossClub: false,
  },
  {
    id: 'club_midnight',
    name: 'Midnight Runners',
    description: 'Only race after midnight. Masters of the night highways.',
    colors: { primary: '#8b5cf6', secondary: '#0f172a', accent: '#22d3ee' },
    leaderId: 'rival_mr_boss',
    memberIds: ['rival_mr_01', 'rival_mr_02', 'rival_mr_03', 'rival_mr_04'],
    territory: 'Bayshore Route',
    difficulty: 'MEDIUM',
    isBossClub: false,
  },
  {
    id: 'club_driftkings',
    name: 'Drift Kings',
    description: 'Curve specialists who turn every corner into a drift zone.',
    colors: { primary: '#f97316', secondary: '#7c2d12', accent: '#fef3c7' },
    leaderId: 'rival_dk_boss',
    memberIds: ['rival_dk_01', 'rival_dk_02', 'rival_dk_03'],
    territory: 'Mountain Pass Curves',
    difficulty: 'MEDIUM',
    isBossClub: false,
  },
  {
    id: 'club_topsecret',
    name: 'Top Secret',
    description: 'Elite tuners with heavily modified machines.',
    colors: { primary: '#10b981', secondary: '#064e3b', accent: '#a7f3d0' },
    leaderId: 'rival_ts_boss',
    memberIds: ['rival_ts_01', 'rival_ts_02', 'rival_ts_03', 'rival_ts_04', 'rival_ts_05'],
    territory: 'Wangan Straight',
    difficulty: 'HARD',
    isBossClub: false,
  },
  {
    id: 'club_devilz',
    name: 'The Devil Z',
    description: 'Legendary street racing team. The ultimate challenge.',
    colors: { primary: '#000000', secondary: '#dc2626', accent: '#fbbf24' },
    leaderId: 'rival_devilz_boss',
    memberIds: ['rival_devilz_01', 'rival_devilz_02'],
    territory: 'Tokyo Highway - All Routes',
    difficulty: 'EXTREME',
    isBossClub: true,
    unlockRequirement: {
      type: 'DEFEAT_CLUBS',
      count: 4,
    },
  },
];

export class ClubDatabase {
  private clubs: Map<string, ClubData>;

  constructor(customClubs?: ClubData[]) {
    this.clubs = new Map();
    
    const clubsToLoad = customClubs ?? DEFAULT_CLUBS;
    for (const club of clubsToLoad) {
      this.clubs.set(club.id, club);
    }
  }

  /**
   * Get club by ID
   */
  getClub(id: string): ClubData | null {
    return this.clubs.get(id) || null;
  }

  /**
   * Get all clubs
   */
  getAllClubs(): ClubData[] {
    return Array.from(this.clubs.values());
  }

  /**
   * Get clubs by difficulty
   */
  getClubsByDifficulty(difficulty: ClubData['difficulty']): ClubData[] {
    return this.getAllClubs().filter(c => c.difficulty === difficulty);
  }

  /**
   * Get boss clubs
   */
  getBossClubs(): ClubData[] {
    return this.getAllClubs().filter(c => c.isBossClub);
  }

  /**
   * Check if club can be challenged
   */
  canChallenge(club: ClubData, playerProgress: {
    defeatedClubs: number;
    totalDistance: number;
    totalWins: number;
  }): boolean {
    if (!club.unlockRequirement) return true;

    switch (club.unlockRequirement.type) {
      case 'DEFEAT_CLUBS':
        return playerProgress.defeatedClubs >= club.unlockRequirement.count;
      case 'DISTANCE':
        return playerProgress.totalDistance >= club.unlockRequirement.count;
      case 'WINS':
        return playerProgress.totalWins >= club.unlockRequirement.count;
      default:
        return true;
    }
  }

  /**
   * Get club members including leader
   */
  getAllMembers(clubId: string): string[] {
    const club = this.getClub(clubId);
    if (!club) return [];

    const members = [...club.memberIds];
    if (club.leaderId) {
      members.push(club.leaderId);
    }
    return members;
  }

  /**
   * Add a custom club
   */
  addClub(club: ClubData): void {
    this.clubs.set(club.id, club);
  }

  /**
   * Remove a club
   */
  removeClub(id: string): void {
    this.clubs.delete(id);
  }

  /**
   * Get club count
   */
  getClubCount(): number {
    return this.clubs.size;
  }
}
