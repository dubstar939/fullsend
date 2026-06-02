/**
 * Gameplay Systems Index
 * Exports all gameplay-related systems: projectiles, AI, waves, spawning
 */

// Projectile System
export type { ProjectileConfig } from './ProjectileComponent';
export { ProjectileType, ProjectileComponent, ProjectileFactory } from './ProjectileComponent';

export type {
  ProjectileInstance,
  ProjectilePoolConfig,
} from './ProjectilePool';
export { ProjectilePool } from './ProjectilePool';

export type {
  ProjectileManagerConfig,
  CollisionResult,
  CollisionCallback,
} from './ProjectileManager';
export { ProjectileManager, ProjectileManagerFactory } from './ProjectileManager';

// AI System
export type {
  AIConfig,
} from './AIComponent';
export { AIState, AIComponent, AIConfigFactory } from './AIComponent';

export type {
  Waypoint,
  WaypointPath,
  WaypointGraphConfig,
} from './WaypointGraph';
export { WaypointGraph } from './WaypointGraph';

export type {
  AIAgent,
  AIManagerConfig,
  Obstacle,
} from './AIManager';
export { AIManager, AIManagerFactory } from './AIManager';

// Wave System
export type {
  WaveDefinition,
  WaveState,
  WaveEventCallback,
  WaveCompleteCallback,
} from './WaveManager';
export { WaveManager, WaveFactory } from './WaveManager';

// Spawner
export type {
  SpawnConfig,
  SpawnResult,
} from './Spawner';
export { Spawner, SpawnerFactory } from './Spawner';
