/**
 * Highway Free Roam System
 * Integrates HighwayLoopManager, TrafficManager, RivalSpawner, 
 * HeadlightFlashDetector, and ZoneManager for Tokyo Xtreme Racer-style gameplay
 */

import * as THREE from 'three';
import { HighwayLoopManager, HighwaySegment } from './HighwayLoopManager';
import { TrafficManager, TrafficVehicle } from './TrafficManager';
import { RivalSpawner, SpawnedRival } from './RivalSpawner';
import { HeadlightFlashDetector, FlashDetectionResult } from './HeadlightFlashDetector';
import { ZoneManager, ZoneProperties, zoneManager } from './ZoneManager';
import { InstancedMeshManager } from '../engine/rendering/InstancedMeshManager';
import { PerformanceMonitor } from '../engine/core/PerformanceMonitor';

export interface FreeRoamConfig {
  /** Enable traffic */
  enableTraffic: boolean;
  /** Enable rivals */
  enableRivals: boolean;
  /** Enable headlight flash challenges */
  enableFlashChallenge: boolean;
  /** Enable dynamic zones */
  enableZones: boolean;
  /** Maximum traffic vehicles */
  maxTrafficVehicles: number;
  /** Maximum active rivals */
  maxActiveRivals: number;
  /** Time of day (0-24) */
  timeOfDay: number;
  /** Weather type */
  weather: 'clear' | 'rain' | 'fog';
}

const DEFAULT_CONFIG: FreeRoamConfig = {
  enableTraffic: true,
  enableRivals: true,
  enableFlashChallenge: true,
  enableZones: true,
  maxTrafficVehicles: 50,
  maxActiveRivals: 8,
  timeOfDay: 20, // 8 PM - night racing
  weather: 'clear',
};

export interface FreeRoamStats {
  activeSegments: number;
  activeTraffic: number;
  activeRivals: number;
  currentZone: string | null;
  fps: number;
  frameTime: number;
}

export interface FreeRoamEvents {
  onRivalChallenge?: (rival: SpawnedRival) => void;
  onRivalDefeated?: (rival: SpawnedRival) => void;
  onZoneEntered?: (zoneName: string, properties: ZoneProperties) => void;
  onTrafficCollision?: (vehicle: TrafficVehicle) => void;
  onFlashChallenge?: (result: FlashDetectionResult) => void;
}

export class HighwayFreeRoamSystem {
  // Core managers
  public highwayLoop: HighwayLoopManager;
  public trafficManager: TrafficManager;
  public rivalSpawner: RivalSpawner;
  public flashDetector: HeadlightFlashDetector;
  public zoneManager: ZoneManager;
  
  // Configuration
  private config: FreeRoamConfig;
  private events: FreeRoamEvents;
  
  // State tracking
  private lastZoneName: string | null = null;
  private playerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private playerSpeed: number = 0;
  private playerDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  
  // Performance monitoring
  private performanceMonitor: PerformanceMonitor;
  
  // Scene references
  private scene: THREE.Scene;
  
  constructor(
    scene: THREE.Scene,
    config: Partial<FreeRoamConfig> = {},
    events: FreeRoamEvents = {}
  ) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.events = events;
    
    // Initialize subsystems
    this.highwayLoop = new HighwayLoopManager();
    this.trafficManager = new TrafficManager({
      maxVehicles: this.config.maxTrafficVehicles,
    });
    this.zoneManager = new ZoneManager();
    this.rivalSpawner = new RivalSpawner(this.zoneManager, {
      maxActiveRivals: this.config.maxActiveRivals,
      enableFlashChallenge: this.config.enableFlashChallenge,
    });
    this.flashDetector = new HeadlightFlashDetector();
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize systems
    this.initializeSystems();
    this.setupEventHandlers();
  }

  /**
   * Initialize all subsystems
   */
  private initializeSystems(): void {
    // Initialize highway loop
    this.highwayLoop.init();
    
    // Add highway segments to scene
    for (const segment of this.highwayLoop.getAllSegments()) {
      this.scene.add(segment.mesh);
    }
    
    // Initialize traffic manager with instanced mesh
    this.trafficManager.init();
    const trafficMesh = this.trafficManager.getInstancedMeshManager()?.getMesh();
    if (trafficMesh) {
      this.scene.add(trafficMesh);
    }
    
    // Initialize rival spawner
    this.rivalSpawner.init();
    
    // Initialize zone manager
    this.zoneManager.init();
    this.zoneManager.setTimeOfDay(this.config.timeOfDay);
    this.zoneManager.setWeather(this.config.weather);
    
    // Setup flash detector integration with rival spawner
    this.flashDetector.setGetRivalsInFrontFn(
      (position, direction, angle, distance) => {
        return this.getRivalsInCone(position, direction, angle, distance);
      }
    );
  }

  /**
   * Setup event handlers for subsystems
   */
  private setupEventHandlers(): void {
    // Rival challenge events
    this.rivalSpawner.onChallengeInitiated((rival) => {
      if (this.events.onRivalChallenge) {
        this.events.onRivalChallenge(rival);
      }
    });
    
    this.rivalSpawner.onRivalDefeated((rival) => {
      if (this.events.onRivalDefeated) {
        this.events.onRivalDefeated(rival);
      }
    });
    
    // Flash challenge events
    this.flashDetector.onFlash((result) => {
      if (this.events.onFlashChallenge && result.hasRivalInFront) {
        this.events.onFlashChallenge(result);
      }
    });
    
    this.flashDetector.onChallenge((rivalId) => {
      this.rivalSpawner.initiateChallenge(rivalId);
    });
  }

  /**
   * Get rivals within detection cone
   */
  private getRivalsInCone(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    maxAngle: number,
    maxDistance: number
  ): Array<{ id: string; position: THREE.Vector3 }> {
    const results: Array<{ id: string; position: THREE.Vector3 }> = [];
    
    for (const rival of this.rivalSpawner.getActiveRivals()) {
      const toRival = new THREE.Vector3().subVectors(rival.position, position);
      const distance = toRival.length();
      
      if (distance > maxDistance) continue;
      
      toRival.normalize();
      const cosAngle = direction.dot(toRival);
      const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
      
      if (angle <= maxAngle / 2) {
        results.push({
          id: rival.definition.id,
          position: rival.position.clone(),
        });
      }
    }
    
    return results;
  }

  /**
   * Update the free roam system
   */
  update(deltaTime: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    this.performanceMonitor.beginFrame();
    
    // Store player state
    this.playerPosition.copy(playerPosition);
    this.playerSpeed = playerSpeed;
    
    // Calculate player direction (assuming moving towards negative Z)
    this.playerDirection.set(0, 0, -1).normalize();
    
    // Update highway loop
    this.highwayLoop.update(playerPosition);
    
    // Update zone manager and check zone changes
    if (this.config.enableZones) {
      this.updateZones(playerPosition);
    }
    
    // Update traffic manager
    if (this.config.enableTraffic) {
      const zoneProps = this.zoneManager.getZoneProperties(playerPosition);
      if (zoneProps) {
        this.trafficManager.setZoneDensity(zoneProps.trafficDensity);
      }
      this.trafficManager.setNightTime(this.isNightTime());
      this.trafficManager.update(deltaTime, playerPosition, playerSpeed);
    }
    
    // Update rival spawner
    if (this.config.enableRivals) {
      this.rivalSpawner.update(deltaTime, playerPosition, playerSpeed);
    }
    
    // Update headlight flash detector
    if (this.config.enableFlashChallenge) {
      this.flashDetector.update(deltaTime, playerPosition, this.playerDirection);
    }
    
    // Check traffic collisions
    if (this.config.enableTraffic) {
      this.checkTrafficCollisions();
    }
    
    this.performanceMonitor.endFrame();
  }

  /**
   * Update zone tracking and events
   */
  private updateZones(playerPosition: THREE.Vector3): void {
    const currentZone = this.zoneManager.getCurrentZone(playerPosition);
    const zoneProps = this.zoneManager.getZoneProperties(playerPosition);
    
    if (currentZone && currentZone.name !== this.lastZoneName) {
      this.lastZoneName = currentZone.name;
      
      if (this.events.onZoneEntered && zoneProps) {
        this.events.onZoneEntered(currentZone.name, zoneProps);
      }
    }
  }

  /**
   * Check for traffic collisions
   */
  private checkTrafficCollisions(): void {
    // Simple bounding box collision check
    const playerBounds = {
      min: new THREE.Vector3(
        this.playerPosition.x - 1,
        0,
        this.playerPosition.z - 2
      ),
      max: new THREE.Vector3(
        this.playerPosition.x + 1,
        1,
        this.playerPosition.z + 2
      ),
    };
    
    const collisionId = this.trafficManager.checkPlayerCollision(playerBounds);
    if (collisionId) {
      const vehicles = this.trafficManager.getTrafficInstances();
      const collidedVehicle = vehicles.find((v) => v.id === collisionId);
      if (collidedVehicle && this.events.onTrafficCollision) {
        this.events.onTrafficCollision(collidedVehicle);
      }
    }
  }

  /**
   * Check if current time is night
   */
  private isNightTime(): boolean {
    const hour = this.config.timeOfDay;
    return hour >= 19 || hour < 6; // 7 PM to 6 AM
  }

  /**
   * Trigger headlight flash
   */
  triggerHeadlightFlash(): boolean {
    return this.flashDetector.triggerFlash();
  }

  /**
   * Set time of day
   */
  setTimeOfDay(hour: number): void {
    this.config.timeOfDay = ((hour % 24) + 24) % 24;
    this.zoneManager.setTimeOfDay(this.config.timeOfDay);
  }

  /**
   * Set weather
   */
  setWeather(weather: 'clear' | 'rain' | 'fog'): void {
    this.config.weather = weather;
    this.zoneManager.setWeather(weather);
  }

  /**
   * Toggle traffic
   */
  setTrafficEnabled(enabled: boolean): void {
    this.config.enableTraffic = enabled;
    if (!enabled) {
      this.trafficManager.clear();
    }
  }

  /**
   * Toggle rivals
   */
  setRivalsEnabled(enabled: boolean): void {
    this.config.enableRivals = enabled;
    if (!enabled) {
      this.rivalSpawner.clear();
    }
  }

  /**
   * Get current system statistics
   */
  getStats(): FreeRoamStats {
    const currentZone = this.zoneManager.getCurrentZone(this.playerPosition);
    
    return {
      activeSegments: this.highwayLoop.getActiveSegments().length,
      activeTraffic: this.trafficManager.getActiveCount(),
      activeRivals: this.rivalSpawner.getActiveCount(),
      currentZone: currentZone?.name ?? null,
      fps: this.performanceMonitor.getFPS(),
      frameTime: this.performanceMonitor.getFrameTime(),
    };
  }

  /**
   * Get current zone properties
   */
  getCurrentZoneProperties(): ZoneProperties | null {
    return this.zoneManager.getZoneProperties(this.playerPosition);
  }

  /**
   * Get active traffic vehicles
   */
  getTrafficVehicles(): TrafficVehicle[] {
    return this.trafficManager.getTrafficInstances();
  }

  /**
   * Get active rivals
   */
  getActiveRivals(): SpawnedRival[] {
    return this.rivalSpawner.getActiveRivals();
  }

  /**
   * Get highway segments
   */
  getHighwaySegments(): HighwaySegment[] {
    return this.highwayLoop.getActiveSegments();
  }

  /**
   * Clear all game objects
   */
  clear(): void {
    // Remove highway segments
    for (const segment of this.highwayLoop.getAllSegments()) {
      segment.mesh.removeFromParent();
    }
    
    // Clear subsystems
    this.trafficManager.clear();
    this.rivalSpawner.clear();
    this.highwayLoop.clear();
    this.zoneManager.clear();
    
    this.lastZoneName = null;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    
    this.highwayLoop.dispose();
    this.trafficManager.dispose();
    this.rivalSpawner.dispose();
    this.flashDetector.clearCallbacks();
  }
}

// Export singleton instance helper
export function createFreeRoamSystem(
  scene: THREE.Scene,
  config?: Partial<FreeRoamConfig>,
  events?: FreeRoamEvents
): HighwayFreeRoamSystem {
  return new HighwayFreeRoamSystem(scene, config, events);
}
