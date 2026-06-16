/**
 * Traffic Manager
 * Manages instanced traffic cars with lane-based movement system
 * Integrates with InstancedMeshManager for GPU-accelerated rendering
 */

import * as THREE from 'three';
import { TRAFFIC_CONFIG, GameMode } from '../config/gameConfig';
import { InstancedMeshManager } from '../engine/rendering/InstancedMeshManager';

export interface TrafficVehicle {
  id: string;
  instanceIndex: number;
  position: THREE.Vector3;
  speed: number;
  targetSpeed: number;
  lane: number;
  targetLane: number | null;
  vehicleClass: keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES;
  isLaneChanging: boolean;
  laneChangeProgress: number;
  isActive: boolean;
  zPosition: number;
  // Cached transforms for performance
  _cachedMatrix?: THREE.Matrix4;
  _cachedRotation?: THREE.Euler;
  _cachedQuaternion?: THREE.Quaternion;
  _cachedScale?: THREE.Vector3;
}

export interface TrafficManagerConfig {
  /** Maximum number of traffic vehicles */
  maxVehicles: number;
  /** Base traffic density (0-1) */
  baseDensity: number;
  /** Zone-based density multiplier */
  zoneDensityMultiplier: number;
  /** Time-of-night density modifier */
  nightDensityModifier: number;
  /** Minimum spawn gap between vehicles */
  minSpawnGap: number;
  /** Spawn distance ahead of player */
  spawnAheadDistance: number;
  /** Despawn distance behind player */
  despawnBehindDistance: number;
}

const DEFAULT_CONFIG: TrafficManagerConfig = {
  maxVehicles: 50,
  baseDensity: TRAFFIC_CONFIG.DENSITY_BASE,
  zoneDensityMultiplier: 1.0,
  nightDensityModifier: 1.2,
  minSpawnGap: TRAFFIC_CONFIG.MIN_SPAWN_GAP,
  spawnAheadDistance: TRAFFIC_CONFIG.SPAWN_AHEAD_DISTANCE,
  despawnBehindDistance: TRAFFIC_CONFIG.DESPAWN_BEHIND_DISTANCE,
};

export class TrafficManager {
  private vehicles: Map<string, TrafficVehicle> = new Map();
  private config: TrafficManagerConfig;
  private instancedMeshManager: InstancedMeshManager | null = null;
  
  // Vehicle class meshes (created on demand)
  private vehicleGeometries: Map<string, THREE.BufferGeometry> = new Map();
  private vehicleMaterials: Map<string, THREE.MeshPhongMaterial> = new Map();
  
  // Instance pool management
  private freeIndices: number[] = [];
  private vehicleIdCounter: number = 0;
  
  // Object pooling for vehicles - reduces GC pressure
  private vehiclePool: TrafficVehicle[] = [];
  
  // Lane tracking for collision avoidance
  private laneOccupancy: Map<number, Set<string>> = new Map();
  
  // Current effective density
  private currentDensity: number = 0;
  
  // Player reference for spawning
  private playerSpeed: number = 0;
  private isNightTime: boolean = false;

  constructor(config: Partial<TrafficManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize lane occupancy maps
    const laneCount = TRAFFIC_CONFIG.LANE_COUNT;
    const halfLanes = Math.floor(laneCount / 2);
    for (let i = -halfLanes; i < halfLanes; i++) {
      this.laneOccupancy.set(i, new Set());
    }
  }

  /**
   * Initialize the traffic manager with instanced mesh
   */
  init(instancedMeshManager?: InstancedMeshManager): void {
    if (instancedMeshManager) {
      this.instancedMeshManager = instancedMeshManager;
    } else {
      // Create default instanced mesh for sedans (most common)
      this.createDefaultInstancedMesh();
    }
    
    this.vehicleIdCounter = 0;
    this.freeIndices = [];
    
    if (this.instancedMeshManager) {
      // Pre-populate free indices based on capacity
      for (let i = 0; i < this.config.maxVehicles; i++) {
        this.freeIndices.push(i);
      }
    }
  }

  /**
   * Create default instanced mesh for traffic
   */
  private createDefaultInstancedMesh(): void {
    // Simple car geometry (box with cabin)
    const carGroup = new THREE.Group();
    
    // Main body
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.8, 4.2);
    const bodyMat = new THREE.MeshPhongMaterial({ 
      color: 0x666677,
      flatShading: true,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    carGroup.add(body);
    
    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.5);
    const cabinMat = new THREE.MeshPhongMaterial({ 
      color: 0x333344,
      flatShading: true,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 1.0;
    cabin.position.z = -0.3;
    carGroup.add(cabin);
    
    // Merge geometries for instancing
    this.mergeGroupToGeometry(carGroup, 'SEDAN');
    
    this.instancedMeshManager = new InstancedMeshManager(
      this.vehicleGeometries.get('SEDAN')!,
      this.vehicleMaterials.get('SEDAN')!,
      { maxCount: this.config.maxVehicles }
    );
  }

  /**
   * Merge a group's geometries into a single buffer geometry
   */
  private mergeGroupToGeometry(group: THREE.Group, className: string): void {
    const meshes = group.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    
    if (meshes.length === 0) return;
    
    // For simplicity, use the first mesh's geometry
    // In production, you'd properly merge all meshes
    const baseMesh = meshes[0];
    this.vehicleGeometries.set(className, baseMesh.geometry.clone());
    
    // Create averaged material
    const materials = meshes.map((m) => m.material as THREE.MeshPhongMaterial);
    const avgColor = this.averageColors(materials.map((m) => m.color));
    
    this.vehicleMaterials.set(
      className,
      new THREE.MeshPhongMaterial({
        color: avgColor,
        flatShading: true,
      })
    );
  }

  /**
   * Average multiple colors
   */
  private averageColors(colors: THREE.Color[]): THREE.Color {
    const result = new THREE.Color(0, 0, 0);
    for (const color of colors) {
      result.r += color.r;
      result.g += color.g;
      result.b += color.b;
    }
    result.r /= colors.length;
    result.g /= colors.length;
    result.b /= colors.length;
    return result;
  }

  /**
   * Spawn traffic vehicles
   */
  spawnTraffic(count: number, playerZ: number): void {
    const spawned: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const vehicle = this.createVehicle(playerZ);
      if (vehicle) {
        this.vehicles.set(vehicle.id, vehicle);
        spawned.push(vehicle.id);
        
        // Update lane occupancy
        const laneSet = this.laneOccupancy.get(vehicle.lane);
        if (laneSet) {
          laneSet.add(vehicle.id);
        }
      }
    }
    
    return;
  }

  /**
   * Create a single traffic vehicle with object pooling
   */
  private createVehicle(playerZ: number): TrafficVehicle | null {
    // Select random lane
    const laneCount = TRAFFIC_CONFIG.LANE_COUNT;
    const halfLanes = Math.floor(laneCount / 2);
    const lane = Math.floor(Math.random() * laneCount) - halfLanes;
    
    // Check minimum spawn gap in this lane
    const laneVehicles = Array.from(this.vehicles.values()).filter(
      (v) => v.lane === lane && v.isActive
    );
    
    // Find appropriate spawn position
    let spawnZ = playerZ - this.config.spawnAheadDistance - Math.random() * 50;
    
    // Ensure minimum gap from other vehicles
    for (const other of laneVehicles) {
      const gap = Math.abs(other.zPosition - spawnZ);
      if (gap < this.config.minSpawnGap) {
        // Adjust spawn position
        spawnZ = other.zPosition - this.config.minSpawnGap - Math.random() * 10;
      }
    }
    
    // Select vehicle class based on weights
    const vehicleClass = this.selectVehicleClass();
    const classConfig = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicleClass];
    const [speedMin, speedMax] = classConfig.speedVar;
    const baseSpeed = speedMin + Math.random() * (speedMax - speedMin);
    
    // Get or allocate instance index
    const instanceIndex = this.allocateInstance();
    if (instanceIndex === null) {
      return null; // Pool exhausted
    }
    
    let vehicle: TrafficVehicle;
    
    // Reuse from pool if available (object pooling optimization)
    if (this.vehiclePool.length > 0) {
      vehicle = this.vehiclePool.pop()!;
      // Reset pooled properties
      vehicle.id = `traffic_${this.vehicleIdCounter++}`;
      vehicle.instanceIndex = instanceIndex;
      vehicle.position.set(
        lane * TRAFFIC_CONFIG.LANE_WIDTH,
        0,
        spawnZ
      );
      vehicle.speed = baseSpeed;
      vehicle.targetSpeed = baseSpeed;
      vehicle.lane = lane;
      vehicle.targetLane = null;
      vehicle.vehicleClass = vehicleClass;
      vehicle.isLaneChanging = false;
      vehicle.laneChangeProgress = 0;
      vehicle.isActive = true;
      vehicle.zPosition = spawnZ;
    } else {
      // Create new vehicle
      vehicle = {
        id: `traffic_${this.vehicleIdCounter++}`,
        instanceIndex,
        position: new THREE.Vector3(
          lane * TRAFFIC_CONFIG.LANE_WIDTH,
          0,
          spawnZ
        ),
        speed: baseSpeed,
        targetSpeed: baseSpeed,
        lane,
        targetLane: null,
        vehicleClass,
        isLaneChanging: false,
        laneChangeProgress: 0,
        isActive: true,
        zPosition: spawnZ,
      };
    }
    
    // Update instance transform
    this.updateInstanceTransform(vehicle);
    
    return vehicle;
  }

  /**
   * Select vehicle class based on configuration weights
   */
  private selectVehicleClass(): keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES {
    const classes = Object.keys(TRAFFIC_CONFIG.VEHICLE_CLASSES) as Array<
      keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES
    >;
    const weights = classes.map((c) => TRAFFIC_CONFIG.VEHICLE_CLASSES[c].weight);
    
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const random = Math.random() * totalWeight;
    
    let cumulative = 0;
    for (let i = 0; i < classes.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return classes[i];
      }
    }
    
    return 'SEDAN';
  }

  /**
   * Allocate an instance index from the pool
   */
  private allocateInstance(): number | null {
    if (this.freeIndices.length === 0) {
      return null;
    }
    return this.freeIndices.pop()!;
  }

  /**
   * Free an instance index back to the pool
   */
  private freeInstance(index: number): void {
    this.freeIndices.push(index);
  }

  /**
   * Update all traffic vehicles
   */
  update(deltaTime: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    this.playerSpeed = playerSpeed;
    const playerZ = playerPosition.z;
    const playerX = playerPosition.x;
    
    const vehiclesToRemove: string[] = [];
    
    for (const [id, vehicle] of this.vehicles.entries()) {
      if (!vehicle.isActive) continue;
      
      // Check if should despawn
      if (vehicle.zPosition < playerZ - this.config.despawnBehindDistance) {
        vehiclesToRemove.push(id);
        continue;
      }
      
      // Only update if within active range
      const distanceToPlayer = Math.abs(vehicle.zPosition - playerZ);
      if (distanceToPlayer > this.config.spawnAheadDistance + 50) {
        continue;
      }
      
      // Update vehicle state
      this.updateVehicle(vehicle, deltaTime, playerX, playerZ);
    }
    
    // Remove despawned vehicles
    for (const id of vehiclesToRemove) {
      this.removeVehicle(id);
    }
    
    // Spawn new vehicles if needed
    this.maintainTrafficDensity(playerZ);
  }

  /**
   * Update a single vehicle's state
   */
  private updateVehicle(
    vehicle: TrafficVehicle,
    dt: number,
    playerX: number,
    playerZ: number
  ): void {
    // Speed variation
    if (Math.random() < 0.01) {
      const classConfig = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicle.vehicleClass];
      const [speedMin, speedMax] = classConfig.speedVar;
      vehicle.targetSpeed = speedMin + Math.random() * (speedMax - speedMin);
    }
    
    // Smooth speed transitions
    vehicle.speed += (vehicle.targetSpeed - vehicle.speed) * 0.02;
    
    // Lane changing logic
    this.updateLaneChange(vehicle, dt, playerX);
    
    // Update position (moving towards negative Z like the player)
    vehicle.zPosition -= vehicle.speed * 60 * dt;
    
    // Apply lane change interpolation
    if (vehicle.isLaneChanging && vehicle.targetLane !== null) {
      vehicle.laneChangeProgress += dt * 0.5;
      
      if (vehicle.laneChangeProgress >= 1) {
        // Complete lane change
        const oldLaneSet = this.laneOccupancy.get(vehicle.lane);
        if (oldLaneSet) {
          oldLaneSet.delete(vehicle.id);
        }
        
        vehicle.lane = vehicle.targetLane;
        vehicle.isLaneChanging = false;
        vehicle.targetLane = null;
        vehicle.laneChangeProgress = 0;
        
        const newLaneSet = this.laneOccupancy.get(vehicle.lane);
        if (newLaneSet) {
          newLaneSet.add(vehicle.id);
        }
      } else {
        // Smooth lane transition
        const currentLaneX = vehicle.lane * TRAFFIC_CONFIG.LANE_WIDTH;
        const targetLaneX = vehicle.targetLane * TRAFFIC_CONFIG.LANE_WIDTH;
        const t = this.easeInOutCubic(vehicle.laneChangeProgress);
        vehicle.position.x = currentLaneX + (targetLaneX - currentLaneX) * t;
      }
    } else {
      vehicle.position.x = vehicle.lane * TRAFFIC_CONFIG.LANE_WIDTH;
    }
    
    vehicle.position.z = vehicle.zPosition;
    
    // Update instance transform
    this.updateInstanceTransform(vehicle);
  }

  /**
   * Update lane change behavior
   */
  private updateLaneChange(vehicle: TrafficVehicle, dt: number, playerX: number): void {
    if (vehicle.isLaneChanging) return;
    
    // Random chance to consider lane change
    if (Math.random() > TRAFFIC_CONFIG.LANE_CHANGE_PROBABILITY * 2) {
      return;
    }
    
    // Determine possible lanes
    const possibleLanes: number[] = [];
    const halfLanes = Math.floor(TRAFFIC_CONFIG.LANE_COUNT / 2);
    
    if (vehicle.lane > -halfLanes) possibleLanes.push(vehicle.lane - 1);
    if (vehicle.lane < halfLanes - 1) possibleLanes.push(vehicle.lane + 1);
    
    if (possibleLanes.length === 0) return;
    
    // Check each potential lane
    for (const targetLane of possibleLanes) {
      const targetLaneX = targetLane * TRAFFIC_CONFIG.LANE_WIDTH;
      
      // Check if player is in this lane and close
      const playerInLane = Math.abs(playerX - targetLaneX) < 2;
      const playerAhead = vehicle.zPosition < playerX + 20 && vehicle.zPosition > playerX - 20;
      
      if (playerInLane && playerAhead) {
        // Player is in the way - don't change lane
        continue;
      }
      
      // Check for other vehicles in target lane
      const targetLaneVehicles = Array.from(this.vehicles.values()).filter(
        (v) => v.lane === targetLane && v.isActive && Math.abs(v.zPosition - vehicle.zPosition) < 15
      );
      
      if (targetLaneVehicles.length > 0) {
        continue; // Lane not clear
      }
      
      // Valid lane change found
      vehicle.targetLane = targetLane;
      vehicle.isLaneChanging = true;
      vehicle.laneChangeProgress = 0;
      break;
    }
  }

  /**
   * Ease-in-out cubic interpolation
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Update instance transform in the instanced mesh
   */
  private updateInstanceTransform(vehicle: TrafficVehicle): void {
    if (!this.instancedMeshManager) return;
    
    // Cache matrices to avoid allocations
    if (!vehicle._cachedMatrix) {
      vehicle._cachedMatrix = new THREE.Matrix4();
      vehicle._cachedRotation = new THREE.Euler();
      vehicle._cachedQuaternion = new THREE.Quaternion();
      vehicle._cachedScale = new THREE.Vector3(1, 1, 1);
    }
    
    const rotation = vehicle._cachedRotation;
    rotation.set(0, 0, 0);
    
    // Slight rotation during lane changes
    if (vehicle.isLaneChanging && vehicle.targetLane !== null) {
      const turnDirection = vehicle.targetLane > vehicle.lane ? 1 : -1;
      rotation.y = turnDirection * 0.1 * (1 - vehicle.laneChangeProgress);
    }
    
    vehicle._cachedQuaternion.setFromEuler(rotation);
    vehicle._cachedMatrix.compose(
      vehicle.position,
      vehicle._cachedQuaternion,
      vehicle._cachedScale
    );
    
    this.instancedMeshManager.updateInstanceWithMatrix(
      vehicle.instanceIndex,
      vehicle._cachedMatrix
    );
  }

  /**
   * Maintain traffic density based on current conditions
   */
  private maintainTrafficDensity(playerZ: number): void {
    const activeCount = Array.from(this.vehicles.values()).filter(
      (v) => v.isActive && v.zPosition > playerZ - this.config.spawnAheadDistance
    ).length;
    
    // Calculate target count based on density
    const effectiveDensity = this.calculateEffectiveDensity();
    const targetCount = Math.floor(effectiveDensity * this.config.maxVehicles);
    
    if (activeCount < targetCount && this.freeIndices.length > 0) {
      // Spawn more vehicles
      const spawnCount = Math.min(targetCount - activeCount, 3); // Max 3 per frame
      this.spawnTraffic(spawnCount, playerZ);
    }
  }

  /**
   * Calculate effective density based on modifiers
   */
  private calculateEffectiveDensity(): number {
    let density = this.config.baseDensity;
    
    // Apply zone multiplier
    density *= this.config.zoneDensityMultiplier;
    
    // Apply time-of-night modifier
    if (this.isNightTime) {
      density *= this.config.nightDensityModifier;
    }
    
    // Clamp to valid range
    this.currentDensity = Math.max(0, Math.min(density, TRAFFIC_CONFIG.DENSITY_MAX));
    
    return this.currentDensity;
  }

  /**
   * Remove a vehicle and return to pool
   */
  private removeVehicle(id: string): void {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return;
    
    // Free instance
    this.freeInstance(vehicle.instanceIndex);
    
    // Hide instance
    if (this.instancedMeshManager) {
      this.instancedMeshManager.removeInstance(vehicle.instanceIndex);
    }
    
    // Update lane occupancy
    const laneSet = this.laneOccupancy.get(vehicle.lane);
    if (laneSet) {
      laneSet.delete(id);
    }
    
    // Return to pool instead of deleting (object pooling optimization)
    vehicle.isActive = false;
    this.vehiclePool.push(vehicle);
    
    this.vehicles.delete(id);
  }

  /**
   * Set zone density multiplier
   */
  setZoneDensity(multiplier: number): void {
    this.config.zoneDensityMultiplier = multiplier;
  }

  /**
   * Set time of night
   */
  setNightTime(isNight: boolean): void {
    this.isNightTime = isNight;
  }

  /**
   * Check collision with player
   */
  checkPlayerCollision(playerBounds: { min: THREE.Vector3; max: THREE.Vector3 }): string | null {
    for (const [, vehicle] of this.vehicles.entries()) {
      if (!vehicle.isActive) continue;
      
      const vehicleBounds = this.getVehicleBounds(vehicle);
      
      if (this.boundsIntersect(playerBounds, vehicleBounds)) {
        return vehicle.id;
      }
    }
    
    return null;
  }

  /**
   * Get vehicle bounding box
   */
  private getVehicleBounds(vehicle: TrafficVehicle): { min: THREE.Vector3; max: THREE.Vector3 } {
    const classConfig = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicle.vehicleClass];
    const [width, height, length] = classConfig.size;
    const pos = vehicle.position;
    
    return {
      min: new THREE.Vector3(pos.x - width / 2, pos.y, pos.z - length / 2),
      max: new THREE.Vector3(pos.x + width / 2, pos.y + height, pos.z + length / 2),
    };
  }

  /**
   * Check if two bounding boxes intersect
   */
  private boundsIntersect(
    a: { min: THREE.Vector3; max: THREE.Vector3 },
    b: { min: THREE.Vector3; max: THREE.Vector3 }
  ): boolean {
    return (
      a.min.x <= b.max.x && a.max.x >= b.min.x &&
      a.min.y <= b.max.y && a.max.y >= b.min.y &&
      a.min.z <= b.max.z && a.max.z >= b.min.z
    );
  }

  /**
   * Get all active traffic instances for rendering
   */
  getTrafficInstances(): TrafficVehicle[] {
    return Array.from(this.vehicles.values()).filter((v) => v.isActive);
  }

  /**
   * Get active vehicle count
   */
  getActiveCount(): number {
    return Array.from(this.vehicles.values()).filter((v) => v.isActive).length;
  }

  /**
   * Get instanced mesh manager for rendering
   */
  getInstancedMeshManager(): InstancedMeshManager | null {
    return this.instancedMeshManager;
  }

  /**
   * Clear all traffic
   */
  clear(): void {
    for (const id of this.vehicles.keys()) {
      this.removeVehicle(id);
    }
    this.vehicles.clear();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    
    for (const [, geo] of this.vehicleGeometries) {
      geo.dispose();
    }
    this.vehicleGeometries.clear();
    
    for (const [, mat] of this.vehicleMaterials) {
      mat.dispose();
    }
    this.vehicleMaterials.clear();
    
    if (this.instancedMeshManager) {
      this.instancedMeshManager.dispose();
    }
  }
}
