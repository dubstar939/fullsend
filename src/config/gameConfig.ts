/**
 * NO-HESI HIGHWAY RACING - Core Configuration
 * Production-ready tuning values for high-speed highway racing
 */

// ============================================================================
// GAME MODES
// ============================================================================
export enum GameMode {
  POLICE = 'POLICE',
  TIME_ATTACK = 'TIME_ATTACK',
  SURVIVAL = 'SURVIVAL',
  FREE_RIDE = 'FREE_RIDE',
  MULTIPLAYER = 'MULTIPLAYER',
}

// ============================================================================
// PHYSICS TUNING - High-speed arcade handling
// ============================================================================
export const PHYSICS_CONFIG = {
  // Speed ranges (units per frame)
  MIN_SPEED: 0,
  MAX_SPEED: 2.8,
  NITROUS_MAX_SPEED: 3.5,
  
  // Acceleration curves
  ACCELERATION_BASE: 0.008,
  ACCELERATION_NITROUS: 0.02,
  BRAKE_FORCE: 0.015,
  DECELERATION_FRICTION: 0.003,
  
  // Steering
  STEER_SPEED_BASE: 0.18,
  STEER_SPEED_HIGH: 0.12,
  STEER_RETURN_RATE: 0.08,
  MAX_STEER_ANGLE: 0.4,
  
  // Grip and stability
  GRIP_BASE: 0.92,
  GRIP_WET: 0.75,
  GRIP_LOOSE: 0.65,
  SLIP_THRESHOLD: 0.15,
  
  // Collision
  COLLISION_PENALTY_SPEED: 0.4,
  COLLISION_PENALTY_TIME: 2.0,
  PIT_MANEUVER_THRESHOLD: 0.6,
  
  // Nitrous
  NITROUS_CAPACITY: 100,
  NITROUS_DRAIN_RATE: 0.8,
  NITROUS_REFILL_RATE: 0.15,
  NITROUS_COOLDOWN: 3.0,
  
  // Camera
  CAMERA_LAG_BASE: 0.08,
  CAMERA_LAG_SPEED: 0.15,
  FOV_BASE: 75,
  FOV_MAX: 100,
  SHAKE_INTENSITY_BASE: 0.02,
  SHAKE_INTENSITY_SPEED: 0.008,
};

// ============================================================================
// TRAFFIC SYSTEM
// ============================================================================
export const TRAFFIC_CONFIG = {
  // Density settings
  DENSITY_BASE: 0.02,
  DENSITY_MAX: 0.12,
  DENSITY_SURVIVAL_SCALER: 0.001,
  
  // Lane configuration
  LANE_COUNT: 4,
  LANE_WIDTH: 4.2,
  LANE_CHANGE_MIN_DISTANCE: 15,
  
  // Vehicle classes
  VEHICLE_CLASSES: {
    SEDAN: { weight: 0.45, speedVar: [0.3, 0.5], size: [1.4, 0.8, 4.2] },
    SUV: { weight: 0.25, speedVar: [0.25, 0.4], size: [1.6, 1.0, 4.8] },
    SPORT: { weight: 0.15, speedVar: [0.5, 0.7], size: [1.5, 0.7, 4.0] },
    TRUCK: { weight: 0.10, speedVar: [0.2, 0.35], size: [2.0, 1.8, 6.5] },
    POLICE: { weight: 0.05, speedVar: [0.6, 0.8], size: [1.5, 0.9, 4.5] },
  },
  
  // AI behavior
  REACTION_DELAY: [0.3, 0.8],
  LANE_CHANGE_PROBABILITY: 0.015,
  BRAKE_CHECK_CHANCE: 0.008,
  BLIND_SPOT_CHECK: true,
  
  // Spawning
  SPAWN_AHEAD_DISTANCE: 120,
  DESPAWN_BEHIND_DISTANCE: 30,
  MIN_SPAWN_GAP: 8,
};

// ============================================================================
// RIVAL AI
// ============================================================================
export const RIVAL_CONFIG = {
  // Aggression levels
  AGGRESSION_PASSIVE: 0.3,
  AGGRESSION_NORMAL: 0.6,
  AGGRESSION_HIGH: 0.9,
  AGGRESSION_EXTREME: 1.2,
  
  // Behaviors
  RAM_ATTEMPT_CHANCE: 0.02,
  BLOCK_LANE_CHANCE: 0.03,
  BRAKE_CHECK_CHANCE: 0.015,
  DRAFT_BONUS: 1.15,
  SLINGSHOT_BONUS: 1.25,
  
  // Difficulty scaling
  DIFFICULTY_EASY: { speed: 0.85, aggression: 0.4, reaction: 0.5 },
  DIFFICULTY_MEDIUM: { speed: 1.0, aggression: 0.7, reaction: 0.3 },
  DIFFICULTY_HARD: { speed: 1.15, aggression: 1.0, reaction: 0.15 },
  DIFFICULTY_EXTREME: { speed: 1.3, aggression: 1.3, reaction: 0.08 },
  
  // State machine weights
  STATE_CHASE: 0.4,
  STATE_BLOCK: 0.25,
  STATE_RAM: 0.2,
  STATE_FLEE: 0.15,
};

// ============================================================================
// POLICE AI
// ============================================================================
export const POLICE_CONFIG = {
  // Pursuit escalation
  HEAT_DECAY_RATE: 0.5,
  HEAT_GAIN_SPEEDING: 0.8,
  HEAT_GAIN_COLLISION: 5.0,
  HEAT_GAIN_ESCAPE: -3.0,
  
  // Thresholds
  HEAT_THRESHOLD_ALERT: 20,
  HEAT_THRESHOLD_PURSUIT: 50,
  HEAT_THRESHOLD_BACKUP: 80,
  HEAT_THRESHOLD_SPIKE_STRIP: 70,
  
  // Tactics
  PIT_MIN_SPEED: 0.8,
  PIT_SUCCESS_CHANCE: 0.35,
  BOX_IN_DISTANCE: 15,
  SPIKE_STRIP_DEPLOY_TIME: 2.5,
  
  // Backup
  BACKUP_SPAWN_TIME: 8.0,
  BACKUP_MAX_CARS: 4,
  
  // Detection
  DETECTION_RANGE: 60,
  DETECTION_ANGLE: Math.PI / 3,
};

// ============================================================================
// UPGRADE SYSTEM
// ============================================================================
export const UPGRADE_CONFIG = {
  // Performance tiers
  TIERS: ['STOCK', 'STREET', 'SPORT', 'RACE', 'PRO'],
  
  // Engine upgrades
  ENGINE: {
    BASE_COST: 500,
    COST_MULTIPLIER: 2.5,
    SPEED_BONUS_PER_TIER: 0.15,
    ACCEL_BONUS_PER_TIER: 0.002,
  },
  
  // Tire upgrades
  TIRES: {
    BASE_COST: 300,
    COST_MULTIPLIER: 1.8,
    GRIP_BONUS_PER_TIER: 0.05,
    STABILITY_BONUS_PER_TIER: 0.08,
  },
  
  // Brake upgrades
  BRAKES: {
    BASE_COST: 250,
    COST_MULTIPLIER: 1.6,
    STOPPING_BONUS_PER_TIER: 0.12,
    FADE_RESISTANCE: 0.1,
  },
  
  // Aero upgrades
  AERO: {
    BASE_COST: 400,
    COST_MULTIPLIER: 2.2,
    HIGH_SPEED_STABILITY: 0.06,
    CORNERING_BONUS: 0.04,
  },
  
  // Nitrous upgrades
  NITROUS: {
    BASE_COST: 600,
    COST_MULTIPLIER: 2.8,
    CAPACITY_BONUS: 25,
    POWER_BONUS: 0.1,
  },
};

// ============================================================================
// GAME MODE SETTINGS
// ============================================================================
export const MODE_SETTINGS = {
  [GameMode.POLICE]: {
    initialHeat: 0,
    targetEscapes: 5,
    timeLimit: 300,
    rivalCount: 8,
  },
  [GameMode.TIME_ATTACK]: {
    timeBonusPerCheckpoint: 5,
    timePenaltyPerCollision: 3,
    checkpointCount: 10,
  },
  [GameMode.SURVIVAL]: {
    initialSpeed: 0.5,
    speedIncreaseInterval: 30,
    speedIncreaseAmount: 0.1,
    maxTrafficDensity: 0.15,
  },
  [GameMode.FREE_RIDE]: {
    noCollisions: true,
    unlimitedNitrous: true,
    trafficToggle: true,
    weatherToggle: true,
    timeOfDayToggle: true,
  },
  [GameMode.MULTIPLAYER]: {
    maxPlayers: 8,
    ghostMode: true,
    slipstreamEnabled: true,
    antiCheatEnabled: true,
  },
};

// ============================================================================
// TRACK GENERATION
// ============================================================================
export const TRACK_CONFIG = {
  // Segment types
  SEGMENT_LENGTH_BASE: 100,
  SEGMENT_TYPES: ['STRAIGHT', 'CURVE_LEFT', 'CURVE_RIGHT', 'ELEVATION_UP', 'ELEVATION_DOWN', 'TUNNEL', 'BRIDGE'],
  
  // Region themes
  REGIONS: {
    CITY: { buildings: true, barriers: 'concrete', props: ['streetlights', 'signs', 'billboards'] },
    DESERT: { buildings: false, barriers: 'guardrail', props: ['cactus', 'rocks', 'dunes'] },
    FOREST: { buildings: false, barriers: 'guardrail', props: ['trees', 'bushes', 'logs'] },
    COASTAL: { buildings: false, barriers: 'wall', props: ['palms', 'rocks', 'water'] },
  },
  
  // Hazard events
  HAZARD_TYPES: ['CONSTRUCTION', 'ACCIDENT', 'DEBRIS', 'OIL_SLICK', 'RAIN_PATCH'],
  HAZARD_SPAWN_CHANCE: 0.005,
  
  // Procedural generation
  CURVE_RADIUS_MIN: 50,
  CURVE_RADIUS_MAX: 200,
  ELEVATION_CHANGE_MAX: 8,
};

// ============================================================================
// UI CONFIGURATION
// ============================================================================
export const UI_CONFIG = {
  // HUD elements
  SPEEDOMETER_POSITION: 'bottom-right',
  MINIMAP_SIZE: 180,
  HEAT_METER_POSITION: 'top-center',
  NITROUS_METER_POSITION: 'bottom-left',
  
  // Animations
  TRANSITION_DURATION: 0.3,
  SHAKE_DURATION: 0.2,
  FADE_DURATION: 0.5,
  
  // Colors
  COLORS: {
    PRIMARY: '#facc15',
    SECONDARY: '#3b82f6',
    DANGER: '#ef4444',
    SUCCESS: '#10b981',
    WARNING: '#f97316',
  },
};

// ============================================================================
// AUDIO CONFIGURATION
// ============================================================================
export const AUDIO_CONFIG = {
  // Volume levels
  MASTER_VOLUME: 1.0,
  MUSIC_VOLUME: 0.7,
  SFX_VOLUME: 0.8,
  VOICE_VOLUME: 0.9,
  
  // Engine sounds
  ENGINE_IDLE_PITCH: 0.8,
  ENGINE_MID_PITCH: 1.2,
  ENGINE_HIGH_PITCH: 2.0,
  ENGINE_LOOPS: 3,
  
  // Wind noise
  WIND_BASE_VOLUME: 0.3,
  WIND_SPEED_SCALER: 0.02,
  
  // Police audio
  SIREN_PATTERNS: ['WAIL', 'YELP', 'AIR_HORN'],
  RADIO_CHATTER_EVENTS: ['PURSUIT_START', 'BACKUP_REQUESTED', 'SPIKE_DEPLOYED', 'SUSPECT_STOPPED'],
  
  // Collision sounds
  IMPACT_TYPES: ['LIGHT', 'MEDIUM', 'HEAVY', 'CRITICAL'],
};

// ============================================================================
// MULTIPLAYER
// ============================================================================
export const MULTIPLAYER_CONFIG = {
  // Network
  TICK_RATE: 60,
  INTERPOLATION_DELAY: 100,
  RECONNECTION_TIMEOUT: 10000,
  
  // Validation
  SPEED_VALIDATION_THRESHOLD: 0.1,
  POSITION_VALIDATION_THRESHOLD: 0.5,
  ANTI_CHEAT_SAMPLES: 10,
  
  // Ghost mode
  GHOST_UPDATE_INTERVAL: 50,
  GHOST_TRAIL_LENGTH: 120,
  
  // Matchmaking
  RATING_BRACKET_SIZE: 200,
  MAX_RATING_DIFFERENCE: 500,
};

// ============================================================================
// PERFORMANCE & OPTIMIZATION
// ============================================================================
export const PERF_CONFIG = {
  // LOD settings
  LOD_DISTANCES: [30, 60, 100],
  LOD_REDUCTIONS: [0.5, 0.25, 0.1],
  
  // Culling
  FRUSTUM_CULLING: true,
  OCCLUSION_CULLING: true,
  DISTANCE_CULLING: 150,
  
  // Object pooling
  POOL_SIZE_TRAFFIC: 30,
  POOL_SIZE_PROPS: 50,
  POOL_SIZE_EFFECTS: 20,
  
  // Physics simplification
  HIGH_SPEED_SIMPLIFICATION_THRESHOLD: 2.0,
  COLLISION_SIMPLIFICATION_DISTANCE: 50,
  
  // Mobile optimizations
  MOBILE_MAX_TRAFFIC: 15,
  MOBILE_SHADOW_QUALITY: 'low',
  MOBILE_AA_ENABLED: false,
};

// ============================================================================
// STORAGE KEYS
// ============================================================================
export const STORAGE_KEYS = {
  COINS: 'nohesi_coins',
  HIGH_SCORE: 'nohesi_highscore',
  UNLOCKED_CARS: 'nohesi_cars',
  UPGRADES: 'nohesi_upgrades',
  SETTINGS: 'nohesi_settings',
  STATS: 'nohesi_stats',
} as const;

// ============================================================================
// DEFAULT CAR DATA
// ============================================================================
export interface CarStats {
  name: string;
  speed: number;
  handling: number;
  acceleration: number;
  grip: number;
  price: number;
  color: string;
  unlocked: boolean;
  class: 'D' | 'C' | 'B' | 'A' | 'S';
}

export const INITIAL_CARS: CarStats[] = [
  { name: 'Street Sedan', speed: 0.5, handling: 0.5, acceleration: 0.005, grip: 0.85, price: 0, color: '#6b7280', unlocked: true, class: 'D' },
  { name: 'Urban Runner', speed: 0.6, handling: 0.6, acceleration: 0.006, grip: 0.87, price: 500, color: '#3b82f6', unlocked: false, class: 'D' },
  { name: 'Highway Cruiser', speed: 0.7, handling: 0.65, acceleration: 0.007, grip: 0.88, price: 1500, color: '#10b981', unlocked: false, class: 'C' },
  { name: 'Sport Coupe', speed: 0.8, handling: 0.75, acceleration: 0.008, grip: 0.90, price: 3500, color: '#ef4444', unlocked: false, class: 'C' },
  { name: 'Muscle Beast', speed: 0.85, handling: 0.55, acceleration: 0.009, grip: 0.86, price: 5000, color: '#f97316', unlocked: false, class: 'B' },
  { name: 'Track Special', speed: 0.9, handling: 0.85, acceleration: 0.01, grip: 0.92, price: 8000, color: '#8b5cf6', unlocked: false, class: 'B' },
  { name: 'Elite Racer', speed: 0.95, handling: 0.9, acceleration: 0.011, grip: 0.94, price: 12000, color: '#ec4899', unlocked: false, class: 'A' },
  { name: 'No-Hesi King', speed: 1.0, handling: 0.95, acceleration: 0.012, grip: 0.96, price: 20000, color: '#facc15', unlocked: false, class: 'S' },
];

// ============================================================================
// PLAYER PROGRESSION
// ============================================================================
export const PROGRESSION_CONFIG = {
  // Coin rewards
  COINS_PER_DISTANCE: 0.5,
  COINS_PER_OVERTAKE: 10,
  COINS_PER_CHECKPOINT: 25,
  COINS_PER_MODE_COMPLETE: 100,
  
  // XP system
  XP_PER_DISTANCE: 1,
  XP_PER_OVERTAKE: 5,
  XP_PER_WIN: 50,
  LEVEL_BASE_XP: 100,
  LEVEL_GROWTH_FACTOR: 1.5,
  
  // Unlock thresholds
  UNLOCK_LEVEL_TIERS: [1, 3, 5, 8, 12, 16, 20, 25],
};
