/**
 * Wave Manager - Data-driven wave spawning system
 * Handles enemy spawning, difficulty scaling, and wave events
 */

import { AIManager } from './AIManager';
import { AIConfig, AIConfigFactory } from './AIComponent';
import { Profiler } from '../engine/core/Profiler';

export interface WaveDefinition {
  /** Wave number (1-indexed) */
  waveNumber: number;
  /** Number of enemies to spawn */
  count: number;
  /** Time between spawns in seconds */
  spawnRate: number;
  /** Enemy type identifier */
  enemyType: string;
  /** Path name for enemies to follow */
  path: string;
  /** Health multiplier for this wave */
  healthMultiplier: number;
  /** Speed multiplier for this wave */
  speedMultiplier: number;
  /** Optional: delay before wave starts */
  startDelay?: number;
  /** Optional: custom AI config overrides */
  aiConfigOverrides?: Partial<AIConfig>;
}

export interface WaveState {
  /** Current wave index */
  currentWave: number;
  /** Total waves */
  totalWaves: number;
  /** Enemies spawned this wave */
  spawned: number;
  /** Enemies remaining alive */
  remaining: number;
  /** Time until next spawn */
  timeToNextSpawn: number;
  /** Whether wave is active */
  isWaveActive: boolean;
  /** Whether all waves complete */
  isComplete: boolean;
}

export type WaveEventCallback = (waveNumber: number) => void;
export type WaveCompleteCallback = () => void;

/**
 * WaveManager - Controls enemy spawning and wave progression
 * Emits events for wave start/end/completion
 */
export class WaveManager {
  /** All wave definitions */
  private _waves: WaveDefinition[] = [];
  
  /** Current wave index (0-based) */
  private _currentWaveIndex: number = -1;
  
  /** Enemies spawned in current wave */
  private _spawnedInWave: number = 0;
  
  /** Time accumulator for spawning */
  private _spawnTimer: number = 0;
  
  /** Time accumulator for start delay */
  private _startDelayTimer: number = 0;
  
  /** Whether manager is running */
  private _isRunning: boolean = false;
  
  /** Whether all waves are complete */
  private _isComplete: boolean = false;
  
  /** Reference to AI manager for spawning */
  private _aiManager: AIManager;
  
  /** Optional profiler */
  private _profiler?: Profiler;
  
  /** Event callbacks */
  private _onWaveStart?: WaveEventCallback;
  private _onWaveEnd?: WaveEventCallback;
  private _onAllWavesComplete?: WaveCompleteCallback;
  private _onEnemySpawned?: (enemyIndex: number, waveNumber: number) => void;

  constructor(
    aiManager: AIManager,
    profiler?: Profiler
  ) {
    this._aiManager = aiManager;
    this._profiler = profiler;
  }

  /**
   * Set wave definitions
   */
  setWaves(waves: WaveDefinition[]): void {
    this._waves = waves.sort((a, b) => a.waveNumber - b.waveNumber);
  }

  /**
   * Add a single wave definition
   */
  addWave(wave: WaveDefinition): void {
    // Find insertion point to maintain sorted order
    const insertIndex = this._waves.findIndex(w => w.waveNumber > wave.waveNumber);
    
    if (insertIndex === -1) {
      this._waves.push(wave);
    } else {
      this._waves.splice(insertIndex, 0, wave);
    }
  }

  /**
   * Create waves from a simple configuration array
   */
  createWavesFromConfig(config: {
    baseCount: number;
    baseSpawnRate: number;
    enemyType: string;
    path: string;
    waveCount: number;
    healthScaling: number; // e.g., 1.1 = 10% increase per wave
    speedScaling: number;  // e.g., 1.05 = 5% increase per wave
  }): void {
    this._waves = [];
    
    for (let i = 1; i <= config.waveCount; i++) {
      const wave: WaveDefinition = {
        waveNumber: i,
        count: Math.floor(config.baseCount * Math.pow(1.2, i - 1)),
        spawnRate: Math.max(0.3, config.baseSpawnRate * Math.pow(0.95, i - 1)),
        enemyType: config.enemyType,
        path: config.path,
        healthMultiplier: Math.pow(config.healthScaling, i - 1),
        speedMultiplier: Math.pow(config.speedScaling, i - 1),
      };
      
      this._waves.push(wave);
    }
  }

  /**
   * Start wave progression
   */
  start(): void {
    if (this._waves.length === 0) {
      console.warn('[WaveManager] No waves defined');
      return;
    }
    
    this._isRunning = true;
    this._isComplete = false;
    this._currentWaveIndex = -1;
    this._spawnedInWave = 0;
    this._spawnTimer = 0;
    this._startDelayTimer = 0;
    
    // Start first wave
    this._advanceToNextWave();
  }

  /**
   * Stop wave progression
   */
  stop(): void {
    this._isRunning = false;
  }

  /**
   * Pause wave progression
   */
  pause(): void {
    this._isRunning = false;
  }

  /**
   * Resume wave progression
   */
  resume(): void {
    if (!this._isComplete) {
      this._isRunning = true;
    }
  }

  /**
   * Update wave manager
   * Call every frame with deltaTime
   */
  update(deltaTime: number): void {
    if (!this._isRunning || this._isComplete) return;
    
    const currentWave = this._getCurrentWave();
    if (!currentWave) return;
    
    // Handle start delay
    if (currentWave.startDelay && this._startDelayTimer < currentWave.startDelay) {
      this._startDelayTimer += deltaTime;
      
      if (this._startDelayTimer >= currentWave.startDelay) {
        this._onWaveStarted(currentWave.waveNumber);
      }
      return;
    }
    
    // Spawn enemies
    if (this._spawnedInWave < currentWave.count) {
      this._spawnTimer += deltaTime;
      
      if (this._spawnTimer >= currentWave.spawnRate) {
        this._spawnEnemy(currentWave, this._spawnedInWave);
        this._spawnedInWave++;
        this._spawnTimer = 0;
      }
    } else {
      // Check if wave is complete (all enemies defeated)
      // This would require tracking alive enemies - simplified here
      // In practice, you'd call checkWaveComplete() when enemies die
    }
  }

  /**
   * Spawn a single enemy from a wave
   */
  private _spawnEnemy(wave: WaveDefinition, index: number): void {
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
    
    // Apply wave scaling
    aiConfig.isTargetable = true;
    
    if (wave.aiConfigOverrides) {
      Object.assign(aiConfig, wave.aiConfigOverrides);
    }
    
    // Get spawn position (start of path)
    const pathPositions = wave.path 
      ? [] // Would get from WaypointGraph
      : [];
    
    const spawnPosition = pathPositions.length > 0 
      ? pathPositions[0] 
      : new THREE.Vector3(0, 0, 0);
    
    // Spawn via AI manager
    const component = this._aiManager.addAgent(spawnPosition, aiConfig);
    
    if (component) {
      // Apply wave multipliers
      component.applyWaveScaling(wave.healthMultiplier, wave.speedMultiplier);
      component.startPatrolling(wave.path);
      
      // Track spawn
      if (this._onEnemySpawned) {
        this._onEnemySpawned(index, wave.waveNumber);
      }
    }
  }

  /**
   * Advance to the next wave
   */
  private _advanceToNextWave(): void {
    this._currentWaveIndex++;
    
    if (this._currentWaveIndex >= this._waves.length) {
      this._completeAllWaves();
      return;
    }
    
    const wave = this._getCurrentWave();
    if (wave) {
      this._spawnedInWave = 0;
      this._spawnTimer = 0;
      this._startDelayTimer = 0;
      
      // Fire start delay or immediate start
      if (wave.startDelay && wave.startDelay > 0) {
        // Will fire onWaveStarted after delay in update()
      } else {
        this._onWaveStarted(wave.waveNumber);
      }
    }
  }

  /**
   * Called when a wave starts
   */
  private _onWaveStarted(waveNumber: number): void {
    if (this._onWaveStart) {
      this._onWaveStart(waveNumber);
    }
  }

  /**
   * Called when a wave ends
   */
  private _onWaveEnded(waveNumber: number): void {
    if (this._onWaveEnd) {
      this._onWaveEnd(waveNumber);
    }
    
    // Advance to next wave
    this._advanceToNextWave();
  }

  /**
   * Called when all waves are complete
   */
  private _completeAllWaves(): void {
    this._isComplete = true;
    this._isRunning = false;
    
    if (this._onAllWavesComplete) {
      this._onAllWavesComplete();
    }
  }

  /**
   * Notify that an enemy was defeated
   * Used to track wave completion
   */
  onEnemyDefeated(): void {
    const currentWave = this._getCurrentWave();
    if (!currentWave) return;
    
    // In a full implementation, you'd track alive enemies
    // and end the wave when all are defeated
    // For now, we'll just check if spawning is done
    if (this._spawnedInWave >= currentWave.count) {
      // All spawned, wave effectively complete
      // In practice, wait for all to be defeated
      this._onWaveEnded(currentWave.waveNumber);
    }
  }

  /**
   * Force end current wave
   */
  forceEndCurrentWave(): void {
    const currentWave = this._getCurrentWave();
    if (currentWave) {
      this._onWaveEnded(currentWave.waveNumber);
    }
  }

  /**
   * Skip to a specific wave
   */
  skipToWave(waveNumber: number): void {
    const waveIndex = this._waves.findIndex(w => w.waveNumber === waveNumber);
    
    if (waveIndex !== -1) {
      this._currentWaveIndex = waveIndex - 1; // Will advance on next call
      this._advanceToNextWave();
    }
  }

  /**
   * Get current wave state
   */
  getWaveState(): WaveState {
    const currentWave = this._getCurrentWave();
    
    return {
      currentWave: currentWave?.waveNumber ?? 0,
      totalWaves: this._waves.length,
      spawned: this._spawnedInWave,
      remaining: currentWave ? currentWave.count - this._spawnedInWave : 0,
      timeToNextSpawn: currentWave 
        ? Math.max(0, currentWave.spawnRate - this._spawnTimer)
        : 0,
      isWaveActive: this._isRunning && !this._isComplete,
      isComplete: this._isComplete,
    };
  }

  /**
   * Get current wave definition
   */
  getCurrentWave(): WaveDefinition | null {
    return this._getCurrentWave();
  }

  /**
   * Get wave by number
   */
  getWave(waveNumber: number): WaveDefinition | undefined {
    return this._waves.find(w => w.waveNumber === waveNumber);
  }

  /**
   * Get total wave count
   */
  getTotalWaves(): number {
    return this._waves.length;
  }

  /**
   * Check if all waves are complete
   */
  isComplete(): boolean {
    return this._isComplete;
  }

  /**
   * Check if waves are running
   */
  isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Set wave start callback
   */
  onWaveStart(callback: WaveEventCallback): void {
    this._onWaveStart = callback;
  }

  /**
   * Set wave end callback
   */
  onWaveEnd(callback: WaveEventCallback): void {
    this._onWaveEnd = callback;
  }

  /**
   * Set all waves complete callback
   */
  onAllWavesComplete(callback: WaveCompleteCallback): void {
    this._onAllWavesComplete = callback;
  }

  /**
   * Set enemy spawned callback
   */
  onEnemySpawned(callback: (enemyIndex: number, waveNumber: number) => void): void {
    this._onEnemySpawned = callback;
  }

  /**
   * Get internal helper for current wave
   */
  private _getCurrentWave(): WaveDefinition | null {
    if (this._currentWaveIndex < 0 || this._currentWaveIndex >= this._waves.length) {
      return null;
    }
    return this._waves[this._currentWaveIndex];
  }
}

// Import THREE for Vector3
import * as THREE from 'three';

/**
 * Factory for creating common wave configurations
 */
export class WaveFactory {
  /**
   * Create a standard difficulty curve
   */
  static createStandardWaves(
    path: string,
    waveCount: number = 10,
    baseCount: number = 5,
    baseSpawnRate: number = 2
  ): WaveDefinition[] {
    const waves: WaveDefinition[] = [];
    
    for (let i = 1; i <= waveCount; i++) {
      waves.push({
        waveNumber: i,
        count: Math.floor(baseCount * Math.pow(1.15, i - 1)),
        spawnRate: Math.max(0.5, baseSpawnRate * Math.pow(0.95, i - 1)),
        enemyType: 'basic',
        path,
        healthMultiplier: Math.pow(1.1, i - 1),
        speedMultiplier: Math.pow(1.03, i - 1),
      });
    }
    
    return waves;
  }

  /**
   * Create waves with mixed enemy types
   */
  static createMixedWaves(
    path: string,
    waveCount: number = 10
  ): WaveDefinition[] {
    const waves: WaveDefinition[] = [];
    
    for (let i = 1; i <= waveCount; i++) {
      let enemyType = 'basic';
      let count = Math.floor(5 * Math.pow(1.15, i - 1));
      
      // Introduce new enemy types as waves progress
      if (i >= 3 && i % 3 === 0) {
        enemyType = 'scout';
        count = Math.floor(count * 1.3); // More scouts
      }
      if (i >= 5 && i % 5 === 0) {
        enemyType = 'tank';
        count = Math.floor(count * 0.6); // Fewer tanks
      }
      if (i === waveCount) {
        enemyType = 'boss';
        count = 1;
      }
      
      waves.push({
        waveNumber: i,
        count,
        spawnRate: Math.max(0.5, 2 * Math.pow(0.95, i - 1)),
        enemyType,
        path,
        healthMultiplier: Math.pow(1.1, i - 1),
        speedMultiplier: Math.pow(1.03, i - 1),
      });
    }
    
    return waves;
  }

  /**
   * Create a boss wave
   */
  static createBossWave(
    path: string,
    waveNumber: number,
    bossCount: number = 1
  ): WaveDefinition {
    return {
      waveNumber,
      count: bossCount,
      spawnRate: 2,
      enemyType: 'boss',
      path,
      healthMultiplier: 3,
      speedMultiplier: 0.8,
      startDelay: 3,
    };
  }
}
