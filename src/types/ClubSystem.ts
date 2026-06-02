/**
 * CLUB SYSTEM — Tokyo Xtreme Racer Style
 * Comprehensive club definitions, rival rosters, wanderer conditions, and progression
 */

// ============================================================================
// CLUB DATA MODEL
// ============================================================================

export type ClubDrivingStyle = 
  | 'AGGRESSIVE'      // Ramming, blocking tactics
  | 'TECHNICAL'       // Skilled cornering, drafting
  | 'SPEED_FOCUS'     // Pure straight-line speed
  | 'BALANCED'        // All-around racing
  | 'TACTICAL';       // Smart positioning, trap-setting

export interface ClubDefinition {
  id: string;
  name: string;
  colors: { 
    primary: string;   // Hex color
    accent: string;    // Hex accent color
  };
  territoryZones: string[];  // Zone IDs this club controls
  rivals: string[];           // Rival IDs in this club
  leaderId: string;           // Boss rival ID
  requirements: ClubRequirement[];  // What player needs to challenge leader
  style: ClubDrivingStyle;
  description?: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
}

// ============================================================================
// CLUB REQUIREMENTS (TXR-style progression)
// ============================================================================

export type ClubRequirement =
  | { type: "beatMembers"; count: number }
  | { type: "minMileage"; value: number }
  | { type: "timeRange"; start: number; end: number }
  | { type: "carModel"; modelId: string }
  | { type: "winStreak"; value: number }
  | { type: "clubReputation"; clubId: string; minReputation: number }
  | { type: "defeatRival"; rivalId: string }
  | { type: "totalWins"; value: number };

// ============================================================================
// RIVAL ROSTER SYSTEM
// ============================================================================

export interface RivalStats {
  speed: number;        // 0-100
  aggression: number;   // 0-100
  skill: number;        // 0-100
  spResistance: number; // 0-100 (SP battle resistance)
  stamina: number;      // 0-100 (how long they can race)
}

export type RivalRole = 'MEMBER' | 'MID_BOSS' | 'LEADER' | 'WANDERER';

export interface WandererCondition {
  type: "carColor" | "carModel" | "minMileage" | "maxTraffic" | 
        "minSpeed" | "maxSpeed" | "timeRange" | "beatClub" |
        "specificCarType" | "aloneOnHighway" | "weatherCondition";
  value: string | number | boolean;
}

export interface RivalDefinition {
  id: string;
  name: string;
  clubId: string;
  carModel: string;
  stats: RivalStats;
  spawnZones: string[];
  activeTimes: [number, number];  // Hour range (0-24)
  role: RivalRole;
  wandererConditions?: WandererCondition[];
  specialMoves?: string[];  // Special SP battle moves
  dialogue?: {
    preRace: string[];
    postWin: string[];
    postLoss: string[];
  };
  unlockRequirements?: ClubRequirement[];  // For secret rivals
}

// ============================================================================
// PLAYER STATE FOR REQUIREMENT CHECKING
// ============================================================================

export interface PlayerState {
  totalMileage: number;
  winStreak: number;
  totalWins: number;
  currentCarModel: string;
  currentCarColor: string;
  clubsBeaten: string[];
  membersBeatenPerClub: Record<string, number>;
  wanderersFound: number;
  defeatedRivals: string[];
  clubReputation: Record<string, number>;
  currentTimeOfDay: number;
  isAlone: boolean;  // No other traffic nearby
  currentSpeed: number;
  weatherCondition: string;
}

// ============================================================================
// CLUB MANAGER API
// ============================================================================

export interface ClubManager {
  getClubById(id: string): ClubDefinition | undefined;
  getRivalById(id: string): RivalDefinition | undefined;
  getRivalsForZone(zoneId: string): RivalDefinition[];
  getWanderersForZone(zoneId: string): RivalDefinition[];
  canChallengeLeader(clubId: string, playerState: PlayerState): boolean;
  recordRivalDefeated(rivalId: string): void;
  getAllClubs(): ClubDefinition[];
  getAllRivals(): RivalDefinition[];
  getClubByZone(zoneId: string): ClubDefinition | undefined;
  getLeaderRival(clubId: string): RivalDefinition | undefined;
  getMidBosses(clubId: string): RivalDefinition[];
  getRegularMembers(clubId: string): RivalDefinition[];
  checkWandererSpawn(
    zoneId: string, 
    playerState: PlayerState
  ): RivalDefinition | null;
  updateClubReputation(clubId: string, delta: number): void;
  getProgressTowardsLeader(clubId: string, playerState: PlayerState): {
    requirement: ClubRequirement;
    current: number;
    required: number;
    percentage: number;
  }[];
}

// ============================================================================
// DEFAULT CLUB DEFINITIONS (Tokyo-style)
// ============================================================================

export const DEFAULT_CLUBS: ClubDefinition[] = [
  {
    id: 'midnight_devils',
    name: 'Midnight Devils',
    colors: { primary: '#ff0000', accent: '#ff6600' },
    territoryZones: ['bayshore_loop', 'c1_outer'],
    rivals: ['md_01', 'md_02', 'md_03', 'md_boss'],
    leaderId: 'md_boss',
    difficulty: 'MEDIUM',
    style: 'AGGRESSIVE',
    description: 'Aggressive street racers who dominate the bay area at midnight.',
    requirements: [
      { type: 'beatMembers', count: 2 },
      { type: 'minMileage', value: 50 },
      { type: 'timeRange', start: 22, end: 5 },
    ],
  },
  {
    id: 'highway_ghosts',
    name: 'Highway Ghosts',
    colors: { primary: '#00ff00', accent: '#006600' },
    territoryZones: ['wangan_express', 'shibuya_line'],
    rivals: ['hg_01', 'hg_02', 'hg_03', 'hg_04', 'hg_boss'],
    leaderId: 'hg_boss',
    difficulty: 'HARD',
    style: 'SPEED_FOCUS',
    description: 'Speed demons who rule the Wangan with their turbo monsters.',
    requirements: [
      { type: 'beatMembers', count: 3 },
      { type: 'minMileage', value: 100 },
      { type: 'winStreak', value: 3 },
      { type: 'timeRange', start: 0, end: 6 },
    ],
  },
  {
    id: 'touge_kings',
    name: 'Touge Kings',
    colors: { primary: '#0066ff', accent: '#ffffff' },
    territoryZones: ['mountain_pass', 'irohazaka'],
    rivals: ['tk_01', 'tk_02', 'tk_mid', 'tk_boss'],
    leaderId: 'tk_boss',
    difficulty: 'EXTREME',
    style: 'TECHNICAL',
    description: 'Mountain pass legends who master every corner.',
    requirements: [
      { type: 'beatMembers', count: 2 },
      { type: 'defeatRival', rivalId: 'tk_mid' },
      { type: 'minMileage', value: 200 },
      { type: 'carModel', modelId: 'ae86' },
    ],
  },
  {
    id: 'urban_legends',
    name: 'Urban Legends',
    colors: { primary: '#9900ff', accent: '#ff00ff' },
    territoryZones: ['downtown_circuit', 'industrial_zone'],
    rivals: ['ul_01', 'ul_02', 'ul_03', 'ul_boss'],
    leaderId: 'ul_boss',
    difficulty: 'MEDIUM',
    style: 'BALANCED',
    description: 'Street racers who know every back alley and shortcut.',
    requirements: [
      { type: 'beatMembers', count: 2 },
      { type: 'totalWins', value: 10 },
    ],
  },
  {
    id: 'coastal_runners',
    name: 'Coastal Runners',
    colors: { primary: '#00ffff', accent: '#0099ff' },
    territoryZones: ['yokohane_line', 'coastal_highway'],
    rivals: ['cr_01', 'cr_02', 'cr_boss'],
    leaderId: 'cr_boss',
    difficulty: 'EASY',
    style: 'BALANCED',
    description: 'Cruisers who enjoy the scenic coastal routes.',
    requirements: [
      { type: 'beatMembers', count: 1 },
      { type: 'minMileage', value: 30 },
    ],
  },
  {
    id: 'shadow_syndicate',
    name: 'Shadow Syndicate',
    colors: { primary: '#1a1a1a', accent: '#ff0066' },
    territoryZones: ['tunnel_network', 'underground'],
    rivals: ['ss_01', 'ss_02', 'ss_03', 'ss_mid', 'ss_boss'],
    leaderId: 'ss_boss',
    difficulty: 'EXTREME',
    style: 'TACTICAL',
    description: 'Underground racing elite. Only appear in the deepest tunnels.',
    requirements: [
      { type: 'beatMembers', count: 4 },
      { type: 'defeatRival', rivalId: 'ss_mid' },
      { type: 'minMileage', value: 300 },
      { type: 'winStreak', value: 5 },
      { type: 'timeRange', start: 1, end: 4 },
    ],
  },
];

// ============================================================================
// DEFAULT RIVAL DEFINITIONS
// ============================================================================

export const DEFAULT_RIVALS: RivalDefinition[] = [
  // Midnight Devils
  {
    id: 'md_01',
    name: 'Red Comet',
    clubId: 'midnight_devils',
    carModel: 'silvia_s15',
    stats: { speed: 70, aggression: 75, skill: 65, spResistance: 60, stamina: 70 },
    spawnZones: ['bayshore_loop', 'c1_outer'],
    activeTimes: [20, 5],
    role: 'MEMBER',
  },
  {
    id: 'md_02',
    name: 'Black Fang',
    clubId: 'midnight_devils',
    carModel: 'skyline_r34',
    stats: { speed: 75, aggression: 80, skill: 70, spResistance: 65, stamina: 75 },
    spawnZones: ['bayshore_loop'],
    activeTimes: [22, 4],
    role: 'MEMBER',
  },
  {
    id: 'md_03',
    name: 'Silver Arrow',
    clubId: 'midnight_devils',
    carModel: 'supra_mk4',
    stats: { speed: 80, aggression: 70, skill: 75, spResistance: 70, stamina: 80 },
    spawnZones: ['c1_outer'],
    activeTimes: [21, 3],
    role: 'MID_BOSS',
  },
  {
    id: 'md_boss',
    name: 'Kage (Shadow)',
    clubId: 'midnight_devils',
    carModel: 'gtr_r35',
    stats: { speed: 90, aggression: 85, skill: 85, spResistance: 80, stamina: 90 },
    spawnZones: ['bayshore_loop', 'c1_outer'],
    activeTimes: [23, 4],
    role: 'LEADER',
    dialogue: {
      preRace: ["You think you can beat us?", "The night belongs to the Devils!"],
      postWin: ["Not bad... we'll meet again."],
      postLoss: ["Impossible... the Devils never lose!"],
    },
  },
  
  // Highway Ghosts
  {
    id: 'hg_01',
    name: 'Phantom Driver',
    clubId: 'highway_ghosts',
    carModel: 'rx7_fd',
    stats: { speed: 85, aggression: 60, skill: 75, spResistance: 70, stamina: 80 },
    spawnZones: ['wangan_express'],
    activeTimes: [0, 6],
    role: 'MEMBER',
  },
  {
    id: 'hg_02',
    name: 'Turbo Witch',
    clubId: 'highway_ghosts',
    carModel: 'civic_type_r',
    stats: { speed: 80, aggression: 65, skill: 80, spResistance: 65, stamina: 75 },
    spawnZones: ['wangan_express', 'shibuya_line'],
    activeTimes: [1, 5],
    role: 'MEMBER',
  },
  {
    id: 'hg_03',
    name: 'Speed King',
    clubId: 'highway_ghosts',
    carModel: 'lancer_evo_x',
    stats: { speed: 88, aggression: 70, skill: 78, spResistance: 72, stamina: 82 },
    spawnZones: ['shibuya_line'],
    activeTimes: [2, 6],
    role: 'MEMBER',
  },
  {
    id: 'hg_04',
    name: 'Night Stalker',
    clubId: 'highway_ghosts',
    carModel: 'supra_mk4',
    stats: { speed: 92, aggression: 75, skill: 82, spResistance: 78, stamina: 85 },
    spawnZones: ['wangan_express'],
    activeTimes: [0, 4],
    role: 'MID_BOSS',
  },
  {
    id: 'hg_boss',
    name: 'Starlight',
    clubId: 'highway_ghosts',
    carModel: 'nsx_nc1',
    stats: { speed: 98, aggression: 80, skill: 90, spResistance: 85, stamina: 95 },
    spawnZones: ['wangan_express', 'shibuya_line'],
    activeTimes: [1, 4],
    role: 'LEADER',
    dialogue: {
      preRace: ["The highway is my domain.", "Let's see if you can keep up!"],
      postWin: ["You've got spirit. Come back when you're faster."],
      postLoss: ["My Ghosts... defeated? The night has changed..."],
    },
  },
  
  // Touge Kings
  {
    id: 'tk_01',
    name: 'Mountain Hare',
    clubId: 'touge_kings',
    carModel: 'ae86',
    stats: { speed: 65, aggression: 50, skill: 90, spResistance: 60, stamina: 70 },
    spawnZones: ['mountain_pass'],
    activeTimes: [18, 6],
    role: 'MEMBER',
  },
  {
    id: 'tk_02',
    name: 'Apex Hunter',
    clubId: 'touge_kings',
    carModel: 'integra_dc2',
    stats: { speed: 68, aggression: 55, skill: 88, spResistance: 65, stamina: 72 },
    spawnZones: ['mountain_pass', 'irohazaka'],
    activeTimes: [20, 5],
    role: 'MEMBER',
  },
  {
    id: 'tk_mid',
    name: 'Touge Master',
    clubId: 'touge_kings',
    carModel: 'evo_ix',
    stats: { speed: 78, aggression: 65, skill: 92, spResistance: 75, stamina: 80 },
    spawnZones: ['irohazaka'],
    activeTimes: [22, 4],
    role: 'MID_BOSS',
  },
  {
    id: 'tk_boss',
    name: 'Mountain God',
    clubId: 'touge_kings',
    carModel: 'ae86_trueno',
    stats: { speed: 75, aggression: 60, skill: 98, spResistance: 85, stamina: 90 },
    spawnZones: ['mountain_pass', 'irohazaka'],
    activeTimes: [23, 5],
    role: 'LEADER',
    dialogue: {
      preRace: ["The mountain teaches all.", "Show me your resolve!"],
      postWin: ["The mountain was not on your side today."],
      postLoss: ["Perhaps... you are the true master now."],
    },
  },
  
  // Urban Legends
  {
    id: 'ul_01',
    name: 'Street Dancer',
    clubId: 'urban_legends',
    carModel: 'mx5_miata',
    stats: { speed: 60, aggression: 60, skill: 75, spResistance: 55, stamina: 65 },
    spawnZones: ['downtown_circuit'],
    activeTimes: [20, 4],
    role: 'MEMBER',
  },
  {
    id: 'ul_02',
    name: 'Alley Cat',
    clubId: 'urban_legends',
    carModel: 'fit_gk5',
    stats: { speed: 58, aggression: 65, skill: 80, spResistance: 58, stamina: 68 },
    spawnZones: ['downtown_circuit', 'industrial_zone'],
    activeTimes: [21, 3],
    role: 'MEMBER',
  },
  {
    id: 'ul_03',
    name: 'Neon Rider',
    clubId: 'urban_legends',
    carModel: 's2000',
    stats: { speed: 75, aggression: 70, skill: 78, spResistance: 68, stamina: 75 },
    spawnZones: ['industrial_zone'],
    activeTimes: [22, 2],
    role: 'MID_BOSS',
  },
  {
    id: 'ul_boss',
    name: 'Urban Myth',
    clubId: 'urban_legends',
    carModel: 'rx7_fc',
    stats: { speed: 82, aggression: 75, skill: 85, spResistance: 75, stamina: 82 },
    spawnZones: ['downtown_circuit', 'industrial_zone'],
    activeTimes: [23, 3],
    role: 'LEADER',
    dialogue: {
      preRace: ["The streets know my name.", "Legends never die!"],
      postWin: ["Just a story in the making."],
      postLoss: ["Maybe... you'll become the next legend."],
    },
  },
  
  // Coastal Runners
  {
    id: 'cr_01',
    name: 'Sea Breeze',
    clubId: 'coastal_runners',
    carModel: 'beetle_rsi',
    stats: { speed: 55, aggression: 45, skill: 60, spResistance: 50, stamina: 60 },
    spawnZones: ['coastal_highway'],
    activeTimes: [16, 22],
    role: 'MEMBER',
  },
  {
    id: 'cr_02',
    name: 'Wave Rider',
    clubId: 'coastal_runners',
    carModel: 'prelude',
    stats: { speed: 62, aggression: 50, skill: 65, spResistance: 55, stamina: 65 },
    spawnZones: ['yokohane_line', 'coastal_highway'],
    activeTimes: [14, 20],
    role: 'MEMBER',
  },
  {
    id: 'cr_boss',
    name: 'Coastal Devil',
    clubId: 'coastal_runners',
    carModel: 'celica_gt_four',
    stats: { speed: 72, aggression: 60, skill: 75, spResistance: 65, stamina: 72 },
    spawnZones: ['yokohane_line'],
    activeTimes: [18, 22],
    role: 'LEADER',
    dialogue: {
      preRace: ["Enjoy the view while you can!", "Coastal roads are our playground!"],
      postWin: ["The sea gives, and the sea takes."],
      postLoss: ["Nice run! The coast welcomes you anytime."],
    },
  },
  
  // Shadow Syndicate
  {
    id: 'ss_01',
    name: 'Dark Matter',
    clubId: 'shadow_syndicate',
    carModel: 'chaser_jzx100',
    stats: { speed: 78, aggression: 70, skill: 82, spResistance: 75, stamina: 78 },
    spawnZones: ['tunnel_network'],
    activeTimes: [0, 5],
    role: 'MEMBER',
  },
  {
    id: 'ss_02',
    name: 'Void Walker',
    clubId: 'shadow_syndicate',
    carModel: 'mark_ii_jzx110',
    stats: { speed: 80, aggression: 72, skill: 84, spResistance: 77, stamina: 80 },
    spawnZones: ['tunnel_network', 'underground'],
    activeTimes: [1, 4],
    role: 'MEMBER',
  },
  {
    id: 'ss_03',
    name: 'Abyss Gazer',
    clubId: 'shadow_syndicate',
    carModel: 'celsior',
    stats: { speed: 82, aggression: 68, skill: 86, spResistance: 80, stamina: 82 },
    spawnZones: ['underground'],
    activeTimes: [2, 5],
    role: 'MEMBER',
  },
  {
    id: 'ss_mid',
    name: 'Twilight Enforcer',
    clubId: 'shadow_syndicate',
    carModel: 'soarer',
    stats: { speed: 85, aggression: 78, skill: 88, spResistance: 82, stamina: 85 },
    spawnZones: ['tunnel_network', 'underground'],
    activeTimes: [1, 4],
    role: 'MID_BOSS',
  },
  {
    id: 'ss_boss',
    name: 'Shadow Master',
    clubId: 'shadow_syndicate',
    carModel: 'century',
    stats: { speed: 88, aggression: 85, skill: 95, spResistance: 90, stamina: 92 },
    spawnZones: ['underground'],
    activeTimes: [2, 4],
    role: 'LEADER',
    dialogue: {
      preRace: ["You dare enter our domain?", "The shadows will consume you!"],
      postWin: ["The Syndicate remembers..."],
      postLoss: ["The shadows... fade. You have won this night."],
    },
  },
  
  // Wanderers (special encounters)
  {
    id: 'wanderer_white_devil',
    name: 'White Devil',
    clubId: 'none',
    carModel: 'porsche_911',
    stats: { speed: 95, aggression: 70, skill: 92, spResistance: 88, stamina: 85 },
    spawnZones: ['wangan_express', 'bayshore_loop'],
    activeTimes: [1, 2],
    role: 'WANDERER',
    wandererConditions: [
      { type: 'carColor', value: 'white' },
      { type: 'minMileage', value: 300 },
      { type: 'timeRange', start: 1, end: 2 },
      { type: 'aloneOnHighway', value: true },
    ],
    dialogue: {
      preRace: ["A lone wolf... just like me."],
      postWin: ["The road is long. We'll meet again."],
      postLoss: ["Perhaps I've driven too long alone..."],
    },
  },
  {
    id: 'wanderer_midnight_princess',
    name: 'Midnight Princess',
    clubId: 'none',
    carModel: 'fairlady_z',
    stats: { speed: 90, aggression: 65, skill: 94, spResistance: 85, stamina: 80 },
    spawnZones: ['mountain_pass', 'irohazaka'],
    activeTimes: [0, 3],
    role: 'WANDERER',
    wandererConditions: [
      { type: 'carModel', value: 'ae86' },
      { type: 'beatClub', value: 'touge_kings' },
      { type: 'timeRange', start: 0, end: 3 },
      { type: 'maxTraffic', value: 2 },
    ],
    dialogue: {
      preRace: ["The mountain spirits watch us."],
      postWin: ["Until the next full moon..."],
      postLoss: ["The spirits have chosen..."],
    },
  },
  {
    id: 'wanderer_speed_demon',
    name: 'Speed Demon',
    clubId: 'none',
    carModel: 'bugatti_veyron',
    stats: { speed: 100, aggression: 90, skill: 88, spResistance: 80, stamina: 70 },
    spawnZones: ['wangan_express'],
    activeTimes: [3, 5],
    role: 'WANDERER',
    wandererConditions: [
      { type: 'minSpeed', value: 200 },
      { type: 'beatClub', value: 'highway_ghosts' },
      { type: 'timeRange', start: 3, end: 5 },
      { type: 'minMileage', value: 500 },
    ],
    dialogue: {
      preRace: ["Faster... FASTER!"],
      postWin: ["Speed is everything!"],
      postLoss: ["Even demons... can fall..."],
    },
  },
];
