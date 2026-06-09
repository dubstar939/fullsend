/**
 * AI Manager - Tokyo Xtreme Racer Style
 * Manages all AI rivals on the highway, including spawning, updates, and battle integration
 */

import * as THREE from 'three';
import { AIComponent, AIState, SteeringOutput } from './AIComponent';
import { RivalComponent, RivalAggression } from '../rivals/RivalComponent';
import { BattleManager } from '../battle/BattleManager';
import { PerformanceMonitor } from '../engine/core/PerformanceMonitor';

export interface AIVehicle {
  id: string;
  aiComponent: AIComponent;
  rivalComponent: RivalComponent;
  mesh: THREE.Group | null;
  position: THREE.Vector3;
  speed: number;
  lane: number;
  isActive: boolean;
}

export interface AIManagerConfig {
  /** Maximum active AI rivals */
  maxActiveRivals: number;
  /** Spawn distance ahead of player */
  spawnAheadDistance: number;
  /** Despawn distance behind player */
  despawnBehindDistance: number;
  /** Lane width for positioning */
  laneWidth: number;
  /** Enable aggressive AI behavior */
  enableAggressiveAI: boolean;
}

const DEFAULT_CONFIG: AIManagerConfig = {
  maxActiveRivals: 10,
  spawnAheadDistance: 150,
  despawnBehindDistance: 50,
  laneWidth: 4.2,
  enableAggressiveAI: true,
};

export class AIManager {
  private config: AIManagerConfig;
  private performanceMonitor: PerformanceMonitor;
  
  // Active AI vehicles
  private aiVehicles: Map<string, AIVehicle> = new Map();
  
  // Battle manager reference
  private battleManager: BattleManager | null = null;
  
  // Zone-based spawning
  private currentZone: string = '';
  private zoneDensity: number = 1.0;
  
  // Traffic positions for avoidance
  private trafficPositions: THREE.Vector3[] = [];
  
  constructor(config: Partial<AIManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  /**
   * Set battle manager reference
   */
  setBattleManager(battleManager: BattleManager): void {
    this.battleManager = battleManager;
  }
  
  /**
   * Add an AI rival
   */
  addRival(
    id: string,
    rivalData: Partial<RivalComponent>,
    startPosition: THREE.Vector3,
    startLane: number
  ): AIVehicle | null {
    if (this.aiVehicles.size >= this.config.maxActiveRivals) {
      return null;
    }
    
    // Create AI component
    const aiConfig = {
      aggression: rivalData.aggression ?? RivalAggression.NORMAL,
      skill: (rivalData.stats?.skill ?? 50) / 100,
      speed: (rivalData.stats?.speed ?? 50) / 100,
      spResistance: (rivalData.stats?.spResistance ?? 50) / 100,
      reactionTime: 0.3,
    };
    
    const aiComponent = new AIComponent(aiConfig);
    aiComponent.setPosition(startPosition);
    aiComponent.setLane(startLane);
    
    // Create rival component
    const rivalComponent = new RivalComponent(rivalData);
    rivalComponent.setPosition(startPosition.x, startPosition.z);
    
    // Create vehicle entry
    const vehicle: AIVehicle = {
      id,
      aiComponent,
      rivalComponent,
      mesh: null,
      position: startPosition.clone(),
      speed: 0,
      lane: startLane,
      isActive: true,
    };
    
    this.aiVehicles.set(id, vehicle);
    return vehicle;
  }
  
  /**
   * Remove an AI rival
   */
  removeRival(id: string): void {
    const vehicle = this.aiVehicles.get(id);
    if (vehicle) {
      vehicle.isActive = false;
      
      if (vehicle.mesh) {
        vehicle.mesh.removeFromParent();
        vehicle.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      
      this.aiVehicles.delete(id);
    }
  }
  
  /**
   * Update all AI vehicles
   */
  update(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number
  ): void {
    this.performanceMonitor.beginFrame();
    
    // Update each AI vehicle
    for (const [id, vehicle] of this.aiVehicles.entries()) {
      if (!vehicle.isActive) continue;
      
      // Get steering output from AI
      const steering = vehicle.aiComponent.update(
        deltaTime,
        playerPosition,
        playerSpeed,
        this.trafficPositions
      );
      
      // Apply steering to position
      this.applySteering(vehicle, steering, deltaTime);
      
      // Update rival component
      vehicle.rivalComponent.update(deltaTime, playerPosition, playerSpeed);
      
      // Check despawn
      if (vehicle.position.z > playerPosition.z + this.config.despawnBehindDistance) {
        this.removeRival(id);
      }
    }
    
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Set traffic positions for AI avoidance
   */
  setTrafficPositions(positions: THREE.Vector3[]): void {
    this.trafficPositions = positions;
  }
  
  /**
   * Set current zone for spawning
   */
  setCurrentZone(zoneId: string): void {
    this.currentZone = zoneId;
  }
  
  /**
   * Set zone density multiplier
   */
  setZoneDensity(density: number): void {
    this.zoneDensity = Math.max(0, Math.min(2, density));
  }
  
  /**
   * Get all active AI vehicles
   */
  getActiveVehicles(): AIVehicle[] {
    return Array.from(this.aiVehicles.values()).filter(v => v.isActive);
  }
  
  /**
   * Get AI vehicle by ID
   */
  getVehicleById(id: string): AIVehicle | undefined {
    return this.aiVehicles.get(id);
  }
  
  /**
   * Get rival component by ID
   */
  getRivalById(id: string): RivalComponent | undefined {
    const vehicle = this.aiVehicles.get(id);
    return vehicle?.rivalComponent;
  }
  
  /**
   * Check if player is near any challengeable rival
   */
  findNearbyChallengeableRival(
    playerPosition: THREE.Vector3,
    searchRadius: number = 30
  ): AIVehicle | null {
    for (const vehicle of this.aiVehicles.values()) {
      if (!vehicle.isActive) continue;
      
      const distance = vehicle.position.distanceTo(playerPosition);
      
      if (distance <= searchRadius) {
        // Check if rival can be challenged
        const currentHour = new Date().getHours();
        
        if (vehicle.rivalComponent.canBeChallenged(currentHour, this.currentZone)) {
          return vehicle;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Initiate challenge with a rival
   */
  initiateChallenge(rivalId: string): boolean {
    const vehicle = this.aiVehicles.get(rivalId);
    if (!vehicle) return false;
    
    // Set AI state to accepting challenge
    vehicle.aiComponent.startChallengeResponse();
    
    return true;
  }
  
  /**
   * Start battle with a rival
   */
  startBattle(rivalId: string): boolean {
    const vehicle = this.aiVehicles.get(rivalId);
    if (!vehicle) return false;
    
    // Set both components to battle state
    vehicle.aiComponent.setState(AIState.SP_BATTLE);
    vehicle.rivalComponent.startBattle();
    
    return true;
  }
  
  /**
   * End battle with a rival
   */
  endBattle(rivalId: string, playerWon: boolean): void {
    const vehicle = this.aiVehicles.get(rivalId);
    if (!vehicle) return;
    
    vehicle.rivalComponent.endBattle(!playerWon);
    
    if (playerWon) {
      // Rival defeated - retreat
      vehicle.aiComponent.setState(AIState.RETREATING);
    } else {
      // Player lost - rival returns to cruising
      vehicle.aiComponent.resetToCruising();
    }
  }
  
  /**
   * Clear all AI vehicles
   */
  clear(): void {
    for (const id of this.aiVehicles.keys()) {
      this.removeRival(id);
    }
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
  }
  
  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Apply steering output to vehicle position
   */
  private applySteering(vehicle: AIVehicle, steering: SteeringOutput, deltaTime: number): void {
    // Apply acceleration to speed
    const maxSpeed = vehicle.aiComponent.getSpeed();
    const targetSpeed = maxSpeed * (1 + steering.acceleration);
    vehicle.speed += (targetSpeed - vehicle.speed) * 0.1;
    
    // Move forward (negative Z)
    vehicle.position.z -= vehicle.speed * 60 * deltaTime;
    
    // Apply lane change
    if (steering.laneChange !== 0) {
      const targetLane = vehicle.lane + steering.laneChange;
      
      // Clamp lane (-2 to 2 for 5 lanes)
      const clampedLane = Math.max(-2, Math.min(2, targetLane));
      
      if (clampedLane !== vehicle.lane) {
        vehicle.lane = clampedLane;
      }
    }
    
    // Smooth X position towards lane center
    const targetX = vehicle.lane * this.config.laneWidth;
    vehicle.position.x += (targetX - vehicle.position.x) * 0.05;
    
    // Update AI component position
    vehicle.aiComponent.setPosition(vehicle.position);
    vehicle.rivalComponent.setPosition(vehicle.position.x, vehicle.position.z);
  }
  
  /**
   * Find available lane at position
   */
  private findAvailableLane(zPosition: number): number {
    const lanes = [-2, -1, 0, 1, 2];
    const occupiedLanes = new Set<number>();
    
    for (const vehicle of this.aiVehicles.values()) {
      if (!vehicle.isActive) continue;
      
      const zDistance = Math.abs(vehicle.position.z - zPosition);
      if (zDistance < 20) {
        occupiedLanes.add(vehicle.lane);
      }
    }
    
    // Find first available lane
    for (const lane of lanes) {
      if (!occupiedLanes.has(lane)) {
        return lane;
      }
    }
    
    // All lanes occupied - return random
    return lanes[Math.floor(Math.random() * lanes.length)];
  }
  
  /**
   * Spawn rival at appropriate position
   */
  private spawnRivalAtPosition(
    rivalData: Partial<RivalComponent>,
    baseZPosition: number
  ): AIVehicle | null {
    const lane = this.findAvailableLane(baseZPosition);
    const xPosition = lane * this.config.laneWidth;
    
    const position = new THREE.Vector3(xPosition, 0, baseZPosition);
    
    return this.addRival(
      `ai_${Date.now()}_${Math.random()}`,
      rivalData,
      position,
      lane
    );
  }
}

export default AIManager;
