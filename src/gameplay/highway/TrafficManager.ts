/**
 * Traffic Manager - Tokyo Xtreme Racer Style
 * Manages instanced traffic cars on the highway
 * Handles spawning, despawning, and AI behavior for traffic vehicles
 */

import * as THREE from 'three';
import { InstancedMeshManager } from '../engine/rendering/InstancedMeshManager';
import { PerformanceMonitor } from '../engine/core/PerformanceMonitor';
import { TRAFFIC_CONFIG } from '../config/gameConfig';

export interface TrafficVehicle {
  id: string;
  instanceIndex: number;
  position: THREE.Vector3;
  speed: number;
  lane: number;
  vehicleClass: keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES;
  color: THREE.Color;
  isActive: boolean;
}

export interface TrafficManagerConfig {
  /** Maximum number of traffic vehicles */
  maxVehicles: number;
  /** Base spawn rate (0-1) */
  baseSpawnRate: number;
  /** Spawn distance ahead of player */
  spawnAheadDistance: number;
  /** Despawn distance behind player */
  despawnBehindDistance: number;
  /** Minimum gap between vehicles */
  minSpawnGap: number;
  /** Enable day/night headlights */
  enableHeadlights: boolean;
}

const DEFAULT_CONFIG: TrafficManagerConfig = {
  maxVehicles: 50,
  baseSpawnRate: 0.3,
  spawnAheadDistance: 120,
  despawnBehindDistance: 30,
  minSpawnGap: 8,
  enableHeadlights: true,
};

interface VehicleClassData {
  size: [number, number, number];
  speedRange: [number, number];
  weight: number;
}

export class TrafficManager {
  private config: TrafficManagerConfig;
  private performanceMonitor: PerformanceMonitor;
  
  // Instanced mesh for traffic
  private instancedMeshManager: InstancedMeshManager | null = null;
  private mesh: THREE.InstancedMesh | null = null;
  
  // Active traffic vehicles
  private vehicles: Map<string, TrafficVehicle> = new Map();
  private freeIndices: number[] = [];
  
  // Configuration
  private zoneDensity: number = 1.0;
  private isNightTime: boolean = false;
  
  // Geometry cache
  private vehicleGeometries: Map<string, THREE.BoxGeometry> = new Map();
  private vehicleMaterial: THREE.MeshPhongMaterial | null = null;
  
  constructor(config: Partial<TrafficManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize free indices
    for (let i = 0; i < this.config.maxVehicles; i++) {
      this.freeIndices.push(i);
    }
  }
  
  /**
   * Initialize traffic manager with instanced mesh
   */
  init(): void {
    this.createVehicleGeometry();
    this.createInstancedMesh();
  }
  
  /**
   * Update traffic system
   */
  update(deltaTime: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    this.performanceMonitor.beginFrame();
    
    // Spawn new vehicles
    this.trySpawnVehicles(playerPosition);
    
    // Update existing vehicles
    this.updateVehicles(deltaTime, playerPosition, playerSpeed);
    
    // Update instanced mesh
    this.updateInstancedMesh();
    
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Set zone density multiplier
   */
  setZoneDensity(density: number): void {
    this.zoneDensity = Math.max(0, Math.min(2, density));
  }
  
  /**
   * Set night time mode
   */
  setNightTime(isNight: boolean): void {
    this.isNightTime = isNight;
  }
  
  /**
   * Get instanced mesh manager
   */
  getInstancedMeshManager(): InstancedMeshManager | null {
    return this.instancedMeshManager;
  }
  
  /**
   * Get all active traffic vehicles
   */
  getTrafficInstances(): TrafficVehicle[] {
    return Array.from(this.vehicles.values()).filter(v => v.isActive);
  }
  
  /**
   * Get active count
   */
  getActiveCount(): number {
    return Array.from(this.vehicles.values()).filter(v => v.isActive).length;
  }
  
  /**
   * Check collision with player bounds
   */
  checkPlayerCollision(playerBounds: {
    min: THREE.Vector3;
    max: THREE.Vector3;
  }): string | null {
    for (const vehicle of this.vehicles.values()) {
      if (!vehicle.isActive) continue;
      
      const vehicleBounds = {
        min: new THREE.Vector3(
          vehicle.position.x - 1,
          0,
          vehicle.position.z - 2
        ),
        max: new THREE.Vector3(
          vehicle.position.x + 1,
          1,
          vehicle.position.z + 2
        ),
      };
      
      if (this.boundsIntersect(playerBounds, vehicleBounds)) {
        return vehicle.id;
      }
    }
    
    return null;
  }
  
  /**
   * Clear all traffic
   */
  clear(): void {
    for (const vehicle of this.vehicles.values()) {
      this.freeIndices.push(vehicle.instanceIndex);
    }
    this.vehicles.clear();
    
    if (this.instancedMeshManager) {
      this.instancedMeshManager.setVisible(false);
    }
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    
    for (const geo of this.vehicleGeometries.values()) {
      geo.dispose();
    }
    this.vehicleGeometries.clear();
    
    if (this.vehicleMaterial) {
      this.vehicleMaterial.dispose();
      this.vehicleMaterial = null;
    }
    
    if (this.instancedMeshManager) {
      this.instancedMeshManager.dispose();
      this.instancedMeshManager = null;
    }
  }
  
  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Create vehicle geometries
   */
  private createVehicleGeometry(): void {
    const classes = TRAFFIC_CONFIG.VEHICLE_CLASSES as Record<string, VehicleClassData>;
    
    for (const [className, data] of Object.entries(classes)) {
      const [width, height, length] = data.size;
      const geometry = new THREE.BoxGeometry(width, height, length);
      this.vehicleGeometries.set(className, geometry);
    }
    
    // Create shared material
    this.vehicleMaterial = new THREE.MeshPhongMaterial({
      roughness: 0.6,
      metalness: 0.4,
    });
  }
  
  /**
   * Create instanced mesh
   */
  private createInstancedMesh(): void {
    if (!this.vehicleGeometries.size || !this.vehicleMaterial) return;
    
    // Use sedan as base geometry for instancing
    const baseGeometry = this.vehicleGeometries.get('SEDAN')!;
    
    this.instancedMeshManager = new InstancedMeshManager(baseGeometry, this.vehicleMaterial, {
      maxCount: this.config.maxVehicles,
    });
    
    this.mesh = this.instancedMeshManager.getMesh();
    if (this.mesh) {
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }
  
  /**
   * Try to spawn new vehicles
   */
  private trySpawnVehicles(playerPosition: THREE.Vector3): void {
    if (this.freeIndices.length === 0) return;
    
    const spawnChance = this.config.baseSpawnRate * this.zoneDensity;
    if (Math.random() > spawnChance) return;
    
    // Find spawn position ahead of player
    const spawnZ = playerPosition.z - this.config.spawnAheadDistance;
    
    // Check if spawn area is clear
    if (!this.isSpawnAreaClear(spawnZ, this.config.minSpawnGap)) return;
    
    // Select random lane
    const laneCount = TRAFFIC_CONFIG.LANE_COUNT;
    const lane = Math.floor(Math.random() * laneCount) - laneCount / 2;
    
    // Select vehicle class
    const vehicleClass = this.selectVehicleClass();
    
    // Create vehicle
    this.spawnVehicle(vehicleClass, lane, spawnZ);
  }
  
  /**
   * Select vehicle class based on weights
   */
  private selectVehicleClass(): keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES {
    const classes = Object.keys(TRAFFIC_CONFIG.VEHICLE_CLASSES) as Array<
      keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES
    >;
    const weights = classes.map(c => TRAFFIC_CONFIG.VEHICLE_CLASSES[c].weight);
    
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < classes.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return classes[i];
      }
    }
    
    return 'SEDAN';
  }
  
  /**
   * Spawn a vehicle
   */
  private spawnVehicle(
    vehicleClass: keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES,
    lane: number,
    zPosition: number
  ): void {
    const index = this.freeIndices.pop();
    if (index === undefined) return;
    
    const classData = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicleClass] as VehicleClassData;
    const [width, height, length] = classData.size;
    const [minSpeed, maxSpeed] = classData.speedRange;
    
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    const xPosition = lane * TRAFFIC_CONFIG.LANE_WIDTH;
    
    // Random color
    const color = new THREE.Color().setHSL(Math.random(), 0.5, 0.5);
    
    const vehicle: TrafficVehicle = {
      id: `traffic_${Date.now()}_${index}`,
      instanceIndex: index,
      position: new THREE.Vector3(xPosition, height / 2, zPosition),
      speed,
      lane,
      vehicleClass,
      color,
      isActive: true,
    };
    
    this.vehicles.set(vehicle.id, vehicle);
  }
  
  /**
   * Check if spawn area is clear
   */
  private isSpawnAreaClear(zPosition: number, minGap: number): boolean {
    for (const vehicle of this.vehicles.values()) {
      if (!vehicle.isActive) continue;
      
      const distance = Math.abs(vehicle.position.z - zPosition);
      if (distance < minGap) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Update all vehicles
   */
  private updateVehicles(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number
  ): void {
    const vehiclesToRemove: string[] = [];
    
    for (const [id, vehicle] of this.vehicles.entries()) {
      if (!vehicle.isActive) continue;
      
      // Move vehicle forward (negative Z)
      vehicle.position.z -= vehicle.speed * 60 * deltaTime;
      
      // Simple AI: occasional lane changes
      if (Math.random() < TRAFFIC_CONFIG.LANE_CHANGE_PROBABILITY) {
        this.tryLaneChange(vehicle);
      }
      
      // Check despawn
      if (vehicle.position.z > playerPosition.z + this.config.despawnBehindDistance) {
        vehiclesToRemove.push(id);
      }
    }
    
    // Remove despawned vehicles
    for (const id of vehiclesToRemove) {
      this.despawnVehicle(id);
    }
  }
  
  /**
   * Try lane change for vehicle
   */
  private tryLaneChange(vehicle: TrafficVehicle): void {
    const laneCount = TRAFFIC_CONFIG.LANE_COUNT;
    const maxLane = laneCount / 2 - 1;
    const minLane = -laneCount / 2;
    
    // Random direction
    const direction = Math.random() > 0.5 ? 1 : -1;
    const newLane = vehicle.lane + direction;
    
    // Check bounds
    if (newLane < minLane || newLane > maxLane) return;
    
    // Check if lane is clear
    const targetX = newLane * TRAFFIC_CONFIG.LANE_WIDTH;
    for (const other of this.vehicles.values()) {
      if (other === vehicle || !other.isActive) continue;
      
      const laneDistance = Math.abs(other.position.x - targetX);
      const zDistance = Math.abs(other.position.z - vehicle.position.z);
      
      if (laneDistance < 2 && zDistance < TRAFFIC_CONFIG.LANE_CHANGE_MIN_DISTANCE) {
        return;
      }
    }
    
    // Perform lane change
    vehicle.lane = newLane;
    vehicle.position.x = targetX;
  }
  
  /**
   * Despawn a vehicle
   */
  private despawnVehicle(id: string): void {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return;
    
    this.freeIndices.push(vehicle.instanceIndex);
    this.vehicles.delete(id);
  }
  
  /**
   * Update instanced mesh matrices
   */
  private updateInstancedMesh(): void {
    if (!this.instancedMeshManager || !this.mesh) return;
    
    const dummy = new THREE.Object3D();
    
    // Reset visibility
    for (let i = 0; i < this.config.maxVehicles; i++) {
      this.mesh!.setColorAt(i, new THREE.Color(0, 0, 0));
    }
    
    for (const vehicle of this.vehicles.values()) {
      if (!vehicle.isActive) continue;
      
      dummy.position.copy(vehicle.position);
      dummy.rotation.set(0, 0, 0);
      
      // Scale based on vehicle class
      const classData = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicle.vehicleClass] as VehicleClassData;
      dummy.scale.set(classData.size[0], classData.size[1], classData.size[2]);
      
      dummy.updateMatrix();
      this.mesh!.setMatrixAt(vehicle.instanceIndex, dummy.matrix);
      this.mesh!.setColorAt(vehicle.instanceIndex, vehicle.color);
    }
    
    this.mesh!.instanceMatrix.needsUpdate = true;
    if (this.mesh!.instanceColor) {
      this.mesh!.instanceColor.needsUpdate = true;
    }
    
    this.instancedMeshManager.setVisible(this.vehicles.size > 0);
  }
  
  /**
   * Check bounding box intersection
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
}

export default TrafficManager;
