/**
 * Traffic Manager - Instanced Traffic Car System
 * Manages traffic density, spawning, and pooling for highway
 */

import * as THREE from 'three';
import { TrafficCar } from '../../entities/TrafficCar';
import { TRAFFIC_CONFIG } from '../../config/gameConfig';

export interface TrafficManagerConfig {
  baseDensity: number;
  maxDensity: number;
  spawnAheadDistance: number;
  despawnBehindDistance: number;
  minSpawnGap: number;
  enableLaneChanges: boolean;
}

export const DEFAULT_TRAFFIC_CONFIG: TrafficManagerConfig = {
  baseDensity: TRAFFIC_CONFIG.DENSITY_BASE,
  maxDensity: TRAFFIC_CONFIG.DENSITY_MAX,
  spawnAheadDistance: TRAFFIC_CONFIG.SPAWN_AHEAD_DISTANCE,
  despawnBehindDistance: TRAFFIC_CONFIG.DESPAWN_BEHIND_DISTANCE,
  minSpawnGap: TRAFFIC_CONFIG.MIN_SPAWN_GAP,
  enableLaneChanges: true,
};

export interface TrafficSpawnParams {
  playerZ: number;
  speed: number;
  difficulty?: number; // 0-1 scaler for survival mode
}

export class TrafficManager {
  private config: TrafficManagerConfig;
  private trafficCars: TrafficCar[];
  private meshPool: THREE.Group[];
  private availableMeshes: Set<number>;
  private totalSpawned: number;
  private currentDensity: number;
  private lastSpawnZ: number;

  constructor(config: Partial<TrafficManagerConfig> = {}) {
    this.config = { ...DEFAULT_TRAFFIC_CONFIG, ...config };
    this.trafficCars = [];
    this.meshPool = [];
    this.availableMeshes = new Set();
    this.totalSpawned = 0;
    this.currentDensity = this.config.baseDensity;
    this.lastSpawnZ = 0;
  }

  /**
   * Initialize traffic manager with mesh pool
   */
  initialize(createTrafficMesh: () => THREE.Group, poolSize: number = 30): void {
    for (let i = 0; i < poolSize; i++) {
      const mesh = createTrafficMesh();
      mesh.visible = false;
      this.meshPool.push(mesh);
      this.availableMeshes.add(i);
    }
  }

  /**
   * Update traffic system
   */
  update(deltaTime: number, playerZ: number, playerSpeed: number): void {
    // Spawn new traffic
    this.spawnTraffic(playerZ, playerSpeed);

    // Update existing traffic
    this.updateTraffic(deltaTime, playerZ);

    // Remove traffic that's too far behind
    this.despawnTraffic(playerZ);
  }

  private spawnTraffic(playerZ: number, playerSpeed: number): void {
    const spawnPosition = playerZ - this.config.spawnAheadDistance;
    
    // Check if we should spawn based on density
    const spawnChance = this.currentDensity * deltaTime;
    
    if (Math.random() > spawnChance) return;

    // Check minimum gap from last spawn
    if (this.lastSpawnZ - spawnPosition < this.config.minSpawnGap) return;

    // Get available mesh
    if (this.availableMeshes.size === 0) return;

    const meshIndex = Array.from(this.availableMeshes)[0];
    this.availableMeshes.delete(meshIndex);

    // Select lane and vehicle class
    const lane = this.selectLane(playerZ);
    const vehicleClass = this.selectVehicleClass();
    const speed = this.selectSpeed(vehicleClass);

    // Create traffic car entity
    const mesh = this.meshPool[meshIndex];
    const trafficCar = new TrafficCar(mesh, lane, spawnPosition, vehicleClass, speed);

    mesh.visible = true;
    this.trafficCars.push(trafficCar);
    this.totalSpawned++;
    this.lastSpawnZ = spawnPosition;
  }

  private selectLane(playerZ: number): number {
    const laneCount = TRAFFIC_CONFIG.LANE_COUNT;
    const halfLanes = laneCount / 2;
    
    // Random lane selection, avoiding player's immediate area
    let lane: number;
    do {
      lane = Math.floor(Math.random() * laneCount) - halfLanes;
    } while (this.isLaneOccupied(lane, playerZ));

    return lane;
  }

  private isLaneOccupied(lane: number, playerZ: number): boolean {
    const checkDistance = 20;
    return this.trafficCars.some(car => {
      return (
        Math.round(car.data.lane) === lane &&
        Math.abs(car.data.position.z - playerZ) < checkDistance
      );
    });
  }

  private selectVehicleClass(): keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES {
    const rand = Math.random();
    const classes = Object.entries(TRAFFIC_CONFIG.VEHICLE_CLASSES);
    
    let cumulative = 0;
    for (const [className, data] of classes) {
      cumulative += data.weight;
      if (rand < cumulative) {
        return className as keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES;
      }
    }
    
    return 'SEDAN';
  }

  private selectSpeed(vehicleClass: string): number {
    const classData = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicleClass as keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES];
    const [minSpeed, maxSpeed] = classData.speedVar;
    return minSpeed + Math.random() * (maxSpeed - minSpeed);
  }

  private updateTraffic(deltaTime: number, playerZ: number): void {
    for (const car of this.trafficCars) {
      car.update(deltaTime, playerZ);

      // Lane changing behavior
      if (this.config.enableLaneChanges && Math.random() < TRAFFIC_CONFIG.LANE_CHANGE_PROBABILITY) {
        this.attemptLaneChange(car);
      }
    }
  }

  private attemptLaneChange(car: TrafficCar): void {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const newLane = car.data.lane + direction;
    
    // Check if lane change is safe
    if (!this.isLaneClear(newLane, car.data.position.z)) {
      return;
    }

    car.changeLane(newLane);
  }

  private isLaneClear(lane: number, zPosition: number): boolean {
    const clearDistance = 15;
    return !this.trafficCars.some(car => {
      return (
        Math.round(car.data.lane) === Math.round(lane) &&
        Math.abs(car.data.position.z - zPosition) < clearDistance
      );
    });
  }

  private despawnTraffic(playerZ: number): void {
    for (let i = this.trafficCars.length - 1; i >= 0; i--) {
      const car = this.trafficCars[i];
      
      if (car.data.position.z > playerZ + this.config.despawnBehindDistance) {
        // Return mesh to pool
        const meshIndex = this.meshPool.indexOf(car.data.mesh);
        if (meshIndex !== -1) {
          car.data.mesh.visible = false;
          this.availableMeshes.add(meshIndex);
        }

        this.trafficCars.splice(i, 1);
      }
    }
  }

  /**
   * Set traffic density (for survival mode scaling)
   */
  setDensity(density: number): void {
    this.currentDensity = Math.min(density, this.config.maxDensity);
  }

  /**
   * Get current traffic density
   */
  getDensity(): number {
    return this.currentDensity;
  }

  /**
   * Get all active traffic cars
   */
  getTrafficCars(): TrafficCar[] {
    return this.trafficCars;
  }

  /**
   * Get all traffic meshes for rendering
   */
  getTrafficMeshes(): THREE.Group[] {
    return this.trafficCars.map(car => car.data.mesh);
  }

  /**
   * Clear all traffic
   */
  clear(): void {
    for (const car of this.trafficCars) {
      const meshIndex = this.meshPool.indexOf(car.data.mesh);
      if (meshIndex !== -1) {
        car.data.mesh.visible = false;
        this.availableMeshes.add(meshIndex);
      }
    }
    this.trafficCars = [];
  }

  /**
   * Get total spawned count
   */
  getTotalSpawned(): number {
    return this.totalSpawned;
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
  }
}
