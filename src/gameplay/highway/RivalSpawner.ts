/**
 * Rival Spawner - Manages rival spawning on highway zones
 */

import * as THREE from 'three';
import { RivalCar } from '../../entities/RivalCar';
import { RIVAL_CONFIG, TRAFFIC_CONFIG } from '../../config/gameConfig';

export interface RivalSpawnZone {
  id: string;
  startZ: number;
  endZ: number;
  spawnChance: number;      // 0-1 chance per second
  minRivals: number;
  maxRivals: number;
  difficultyWeights: Record<string, number>;
}

export interface RivalSpawnerConfig {
  maxActiveRivals: number;
  defaultSpawnChance: number;
  enableZones: boolean;
}

export const DEFAULT_RIVAL_SPAWNER_CONFIG: RivalSpawnerConfig = {
  maxActiveRivals: 6,
  defaultSpawnChance: 0.02,
  enableZones: true,
};

export class RivalSpawner {
  private config: RivalSpawnerConfig;
  private zones: RivalSpawnZone[];
  private activeRivals: RivalCar[];
  private meshPool: THREE.Group[];
  private availableMeshes: Set<number>;
  private lastSpawnTime: number;
  private totalSpawned: number;

  constructor(config: Partial<RivalSpawnerConfig> = {}) {
    this.config = { ...DEFAULT_RIVAL_SPAWNER_CONFIG, ...config };
    this.zones = [];
    this.activeRivals = [];
    this.meshPool = [];
    this.availableMeshes = new Set();
    this.lastSpawnTime = 0;
    this.totalSpawned = 0;
  }

  /**
   * Initialize spawner with mesh pool
   */
  initialize(createRivalMesh: () => THREE.Group, poolSize: number = 10): void {
    for (let i = 0; i < poolSize; i++) {
      const mesh = createRivalMesh();
      mesh.visible = false;
      this.meshPool.push(mesh);
      this.availableMeshes.add(i);
    }
  }

  /**
   * Add a spawn zone
   */
  addZone(zone: RivalSpawnZone): void {
    this.zones.push(zone);
  }

  /**
   * Clear all zones
   */
  clearZones(): void {
    this.zones = [];
  }

  /**
   * Update spawner
   */
  update(deltaTime: number, playerZ: number, currentTime: number): void {
    // Remove inactive rivals
    this.cleanupInactiveRivals(playerZ);

    // Check if we can spawn more rivals
    if (this.activeRivals.length >= this.config.maxActiveRivals) return;
    if (this.availableMeshes.size === 0) return;

    // Check spawn timer
    if (currentTime - this.lastSpawnTime < 1 / this.defaultSpawnChance) return;

    // Get current zone or use default spawn chance
    const currentZone = this.getCurrentZone(playerZ);
    const spawnChance = currentZone 
      ? currentZone.spawnChance 
      : this.defaultSpawnChance;

    if (Math.random() > spawnChance * deltaTime) return;

    // Spawn a rival
    this.spawnRival(playerZ, currentZone);
    this.lastSpawnTime = currentTime;
  }

  private getCurrentZone(playerZ: number): RivalSpawnZone | null {
    if (!this.config.enableZones) return null;

    return this.zones.find(
      zone => playerZ <= zone.startZ && playerZ >= zone.endZ
    ) || null;
  }

  private spawnRival(playerZ: number, zone: RivalSpawnZone | null): void {
    const meshIndex = Array.from(this.availableMeshes)[0];
    this.availableMeshes.delete(meshIndex);

    const mesh = this.meshPool[meshIndex];
    const lane = this.selectLane(playerZ);
    const zPosition = playerZ - 30 - Math.random() * 50; // Spawn ahead of player
    const difficulty = this.selectDifficulty(zone);

    const rival = new RivalCar(mesh, lane, zPosition, difficulty);
    mesh.visible = true;

    this.activeRivals.push(rival);
    this.totalSpawned++;
  }

  private selectLane(playerZ: number): number {
    const laneCount = TRAFFIC_CONFIG.LANE_COUNT;
    const halfLanes = laneCount / 2;
    
    // Random lane, avoid occupied lanes
    let attempts = 0;
    let lane: number;
    
    do {
      lane = Math.floor(Math.random() * laneCount) - halfLanes;
      attempts++;
    } while (this.isLaneOccupied(lane, playerZ) && attempts < 10);

    return lane;
  }

  private isLaneOccupied(lane: number, playerZ: number): boolean {
    const checkDistance = 30;
    return this.activeRivals.some(rival => {
      return (
        Math.round(rival.data.lane) === lane &&
        Math.abs(rival.data.position.z - playerZ) < checkDistance
      );
    });
  }

  private selectDifficulty(zone: RivalSpawnZone | null): 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME' {
    if (!zone || !zone.difficultyWeights) {
      // Default weights
      const rand = Math.random();
      if (rand < 0.4) return 'EASY';
      if (rand < 0.7) return 'MEDIUM';
      if (rand < 0.9) return 'HARD';
      return 'EXTREME';
    }

    // Zone-specific weights
    const weights = zone.difficultyWeights;
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    const rand = Math.random() * total;
    
    let cumulative = 0;
    for (const [diff, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand < cumulative) {
        return diff as 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
      }
    }

    return 'MEDIUM';
  }

  private cleanupInactiveRivals(playerZ: number): void {
    const despawnDistance = 100;

    for (let i = this.activeRivals.length - 1; i >= 0; i--) {
      const rival = this.activeRivals[i];

      if (!rival.isActive(playerZ) || rival.data.position.z > playerZ + despawnDistance) {
        // Return mesh to pool
        const meshIndex = this.meshPool.indexOf(rival.data.mesh);
        if (meshIndex !== -1) {
          rival.data.mesh.visible = false;
          this.availableMeshes.add(meshIndex);
        }

        rival.dispose();
        this.activeRivals.splice(i, 1);
      }
    }
  }

  /**
   * Get all active rivals
   */
  getActiveRivals(): RivalCar[] {
    return this.activeRivals;
  }

  /**
   * Get all rival meshes for rendering
   */
  getRivalMeshes(): THREE.Group[] {
    return this.activeRivals.map(rival => rival.data.mesh);
  }

  /**
   * Get rival by ID
   */
  getRivalById(id: string): RivalCar | null {
    return this.activeRivals.find(r => r.data.id === id) || null;
  }

  /**
   * Remove a specific rival
   */
  removeRival(id: string): void {
    const index = this.activeRivals.findIndex(r => r.data.id === id);
    if (index !== -1) {
      const rival = this.activeRivals[index];
      const meshIndex = this.meshPool.indexOf(rival.data.mesh);
      if (meshIndex !== -1) {
        rival.data.mesh.visible = false;
        this.availableMeshes.add(meshIndex);
      }
      rival.dispose();
      this.activeRivals.splice(index, 1);
    }
  }

  /**
   * Clear all rivals
   */
  clear(): void {
    for (const rival of this.activeRivals) {
      const meshIndex = this.meshPool.indexOf(rival.data.mesh);
      if (meshIndex !== -1) {
        rival.data.mesh.visible = false;
        this.availableMeshes.add(meshIndex);
      }
      rival.dispose();
    }
    this.activeRivals = [];
  }

  /**
   * Get total spawned count
   */
  getTotalSpawned(): number {
    return this.totalSpawned;
  }

  /**
   * Get active rival count
   */
  getActiveCount(): number {
    return this.activeRivals.length;
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.clear();
    for (const mesh of this.meshPool) {
      mesh.removeFromParent();
    }
    this.meshPool = [];
    this.availableMeshes.clear();
    this.zones = [];
  }
}
