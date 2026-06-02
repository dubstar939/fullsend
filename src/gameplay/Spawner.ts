/**
 * Spawner - Enemy spawning utility
 * Places enemies at path starts, assigns AI components, registers with systems
 */

import * as THREE from 'three';
import { AIManager } from './AIManager';
import { AIComponent, AIConfig, AIConfigFactory } from './AIComponent';
import { WaypointGraph } from './WaypointGraph';
import { WaveDefinition } from './WaveManager';

export interface SpawnConfig {
  /** Position to spawn at (overrides path) */
  position?: THREE.Vector3;
  /** Path name to use for spawn position */
  pathName?: string;
  /** AI configuration for spawned enemy */
  aiConfig: AIConfig;
  /** Optional mesh to use for the enemy */
  mesh?: THREE.Object3D;
  /** Health multiplier from wave scaling */
  healthMultiplier?: number;
  /** Speed multiplier from wave scaling */
  speedMultiplier?: number;
}

export interface SpawnResult {
  /** Whether spawn was successful */
  success: boolean;
  /** The spawned AI component (if successful) */
  component: AIComponent | null;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Spawner - Handles enemy instantiation and registration
 * Bridge between WaveManager and AIManager
 */
export class Spawner {
  /** Reference to AI manager */
  private _aiManager: AIManager;
  
  /** Reference to waypoint graph */
  private _waypointGraph: WaypointGraph;
  
  /** Pool of reusable enemy meshes (optional optimization) */
  private _meshPool: Map<string, THREE.Object3D[]> = new Map();
  
  /** Callback when enemy is spawned */
  private _onSpawn?: (component: AIComponent) => void;
  
  /** Callback when enemy is defeated */
  private _onDefeated?: (component: AIComponent) => void;

  constructor(
    aiManager: AIManager,
    waypointGraph: WaypointGraph
  ) {
    this._aiManager = aiManager;
    this._waypointGraph = waypointGraph;
  }

  /**
   * Spawn a single enemy
   */
  spawn(config: SpawnConfig): SpawnResult {
    // Determine spawn position
    let spawnPosition: THREE.Vector3;
    
    if (config.position) {
      spawnPosition = config.position.clone();
    } else if (config.pathName) {
      const path = this._waypointGraph.getPath(config.pathName);
      
      if (!path || path.waypoints.length === 0) {
        return {
          success: false,
          component: null,
          error: `Path "${config.pathName}" not found or empty`,
        };
      }
      
      const startWp = this._waypointGraph.getWaypoint(path.waypoints[0]);
      
      if (!startWp) {
        return {
          success: false,
          component: null,
          error: `Start waypoint not found for path "${config.pathName}"`,
        };
      }
      
      spawnPosition = startWp.position.clone();
    } else {
      return {
        success: false,
        component: null,
        error: 'No spawn position or path specified',
      };
    }
    
    // Get or create mesh
    let mesh: THREE.Object3D | undefined = config.mesh;
    
    if (!mesh) {
      mesh = this._getOrCreateMesh(config.aiConfig.enemyType);
    }
    
    // Spawn via AI manager
    const component = this._aiManager.addAgent(spawnPosition, config.aiConfig, mesh);
    
    if (!component) {
      // Return mesh to pool if we created it
      if (!config.mesh && mesh) {
        this._returnMeshToPool(config.aiConfig.enemyType, mesh);
      }
      
      return {
        success: false,
        component: null,
        error: 'AI manager failed to spawn agent (pool exhausted?)',
      };
    }
    
    // Apply wave scaling if provided
    if (config.healthMultiplier || config.speedMultiplier) {
      component.applyWaveScaling(
        config.healthMultiplier ?? 1,
        config.speedMultiplier ?? 1
      );
    }
    
    // Set mesh visible
    mesh.visible = true;
    mesh.position.copy(spawnPosition);
    
    // Invoke callback
    if (this._onSpawn) {
      this._onSpawn(component);
    }
    
    return {
      success: true,
      component,
    };
  }

  /**
   * Spawn an enemy from a wave definition
   */
  spawnFromWave(wave: WaveDefinition, index: number): SpawnResult {
    // Get AI config based on enemy type
    let aiConfig: AIConfig;
    
    switch (wave.enemyType.toLowerCase()) {
      case 'scout':
        aiConfig = AIConfigFactory.createScout();
        break;
      case 'tank':
        aiConfig = AIConfigFactory.createTank();
        break;
      case 'boss':
        aiConfig = AIConfigFactory.createBoss();
        break;
      default:
        aiConfig = AIConfigFactory.createBasicCar();
    }
    
    // Apply wave overrides if present
    if (wave.aiConfigOverrides) {
      Object.assign(aiConfig, wave.aiConfigOverrides);
    }
    
    // Spawn with wave scaling
    return this.spawn({
      pathName: wave.path,
      aiConfig,
      healthMultiplier: wave.healthMultiplier,
      speedMultiplier: wave.speedMultiplier,
    });
  }

  /**
   * Spawn multiple enemies in a batch
   */
  spawnBatch(
    configs: SpawnConfig[],
    staggerDelay?: number
  ): SpawnResult[] {
    const results: SpawnResult[] = [];
    
    for (let i = 0; i < configs.length; i++) {
      const result = this.spawn(configs[i]);
      results.push(result);
      
      // Note: staggerDelay would require async/timer handling
      // For now, all spawns happen immediately
    }
    
    return results;
  }

  /**
   * Spawn enemies along a line (for testing/debugging)
   */
  spawnLine(
    start: THREE.Vector3,
    end: THREE.Vector3,
    count: number,
    aiConfig: AIConfig
  ): SpawnResult[] {
    const results: SpawnResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const position = new THREE.Vector3().lerpVectors(start, end, t);
      
      const result = this.spawn({
        position,
        aiConfig,
      });
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Spawn enemies in a circle pattern
   */
  spawnCircle(
    center: THREE.Vector3,
    radius: number,
    count: number,
    aiConfig: AIConfig
  ): SpawnResult[] {
    const results: SpawnResult[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const position = new THREE.Vector3(
        center.x + Math.cos(angle) * radius,
        center.y,
        center.z + Math.sin(angle) * radius
      );
      
      const result = this.spawn({
        position,
        aiConfig,
      });
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Remove/destroy an enemy
   */
  destroy(component: AIComponent): void {
    if (this._onDefeated) {
      this._onDefeated(component);
    }
    
    this._aiManager.removeAgent(component);
  }

  /**
   * Get or create an enemy mesh from pool
   */
  private _getOrCreateMesh(enemyType: string): THREE.Object3D {
    // Check pool first
    const pooled = this._getFromPool(enemyType);
    if (pooled) return pooled;
    
    // Create new mesh based on type
    const mesh = this._createEnemyMesh(enemyType);
    return mesh;
  }

  /**
   * Create an enemy mesh based on type
   */
  private _createEnemyMesh(enemyType: string): THREE.Object3D {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    
    switch (enemyType.toLowerCase()) {
      case 'scout':
        // Small, fast-looking shape
        geometry = new THREE.ConeGeometry(0.5, 1.5, 8);
        material = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
          flatShading: true,
        });
        break;
        
      case 'tank':
        // Large, heavy shape
        geometry = new THREE.BoxGeometry(1.5, 1.5, 2);
        material = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          flatShading: true,
        });
        break;
        
      case 'boss':
        // Very large, imposing shape
        geometry = new THREE.DodecahedronGeometry(2);
        material = new THREE.MeshStandardMaterial({
          color: 0xff00ff,
          flatShading: true,
          emissive: 0x440044,
        });
        break;
        
      default:
        // Standard car-like shape
        geometry = new THREE.BoxGeometry(1, 1, 2);
        material = new THREE.MeshStandardMaterial({
          color: 0x0066ff,
          flatShading: true,
        });
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  /**
   * Get mesh from pool
   */
  private _getFromPool(enemyType: string): THREE.Object3D | null {
    const pool = this._meshPool.get(enemyType);
    if (pool && pool.length > 0) {
      return pool.pop()!;
    }
    return null;
  }

  /**
   * Return mesh to pool
   */
  private _returnMeshToPool(enemyType: string, mesh: THREE.Object3D): void {
    if (!this._meshPool.has(enemyType)) {
      this._meshPool.set(enemyType, []);
    }
    
    mesh.visible = false;
    this._meshPool.get(enemyType)!.push(mesh);
  }

  /**
   * Set spawn callback
   */
  onSpawn(callback: (component: AIComponent) => void): void {
    this._onSpawn = callback;
  }

  /**
   * Set defeat callback
   */
  onDefeated(callback: (component: AIComponent) => void): void {
    this._onDefeated = callback;
  }

  /**
   * Clear all pooled meshes
   */
  clearMeshPool(): void {
    this._meshPool.clear();
  }

  /**
   * Pre-warm mesh pool with specified counts
   */
  prewarmMeshPool(counts: Record<string, number>): void {
    for (const [enemyType, count] of Object.entries(counts)) {
      for (let i = 0; i < count; i++) {
        const mesh = this._createEnemyMesh(enemyType);
        mesh.visible = false;
        this._returnMeshToPool(enemyType, mesh);
      }
    }
  }
}

/**
 * Factory for creating spawner configurations
 */
export class SpawnerFactory {
  /**
   * Create a standard spawner
   */
  static createStandard(
    aiManager: AIManager,
    waypointGraph: WaypointGraph
  ): Spawner {
    return new Spawner(aiManager, waypointGraph);
  }

  /**
   * Create a spawner with pre-warmed mesh pools
   */
  static createPreWarmed(
    aiManager: AIManager,
    waypointGraph: WaypointGraph,
    poolCounts: Record<string, number> = {
      'basic': 50,
      'scout': 30,
      'tank': 20,
      'boss': 5,
    }
  ): Spawner {
    const spawner = new Spawner(aiManager, waypointGraph);
    spawner.prewarmMeshPool(poolCounts);
    return spawner;
  }
}
