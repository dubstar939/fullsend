/**
 * AI Manager - Central management for all AI agents
 * Handles steering behaviors, path following, and obstacle avoidance
 */

import * as THREE from 'three';
import { AIComponent, AIState, AIConfig } from './AIComponent';
import { WaypointGraph, Waypoint, WaypointPath } from './WaypointGraph';
import { Profiler } from '../engine/core/Profiler';

export interface AIAgent {
  /** The AI component with all behavior data */
  component: AIComponent;
  /** Visual mesh/object for rendering */
  mesh: THREE.Object3D;
  /** Whether this agent is currently active */
  isActive: boolean;
}

export interface AIManagerConfig {
  /** Maximum concurrent AI agents */
  maxAgents: number;
  /** Waypoint graph for navigation */
  waypointGraph: WaypointGraph;
  /** Optional profiler reference */
  profiler?: Profiler;
  /** Default AI config template */
  defaultConfig?: Partial<AIConfig>;
}

export interface Obstacle {
  /** Obstacle position */
  position: THREE.Vector3;
  /** Obstacle radius for collision detection */
  radius: number;
}

/**
 * AIManager - Main controller for AI system
 * Implements Reynolds steering behaviors
 */
export class AIManager {
  /** All AI agents (active + inactive) */
  private _agents: AIAgent[] = [];
  
  /** Index mapping for fast lookup by component ID */
  private _agentMap: Map<string, number> = new Map();
  
  /** Free indices for quick allocation */
  private _freeIndices: number[] = [];
  
  /** Count of active agents */
  private _activeCount: number = 0;
  
  /** Waypoint graph for path following */
  private _waypointGraph: WaypointGraph;
  
  /** Known obstacles for avoidance */
  private _obstacles: Obstacle[] = [];
  
  /** Temporary vectors for calculations (zero GC) */
  private static _tempVec3A = new THREE.Vector3();
  private static _tempVec3B = new THREE.Vector3();
  // private static _tempVec3C = new THREE.Vector3();
  
  /** Optional profiler */
  private _profiler?: Profiler;

  constructor(config: AIManagerConfig) {
    this._waypointGraph = config.waypointGraph;
    this._profiler = config.profiler;
    
    // Pre-allocate agent slots
    const defaultConfig: AIConfig = {
      maxSpeed: 15,
      maxAcceleration: 8,
      turnRate: 2,
      detectionRadius: 5,
      pathLookAhead: 10,
      waypointReachDistance: 2,
      isTargetable: true,
      enemyType: 'basic',
      ...config.defaultConfig,
    };
    
    for (let i = 0; i < config.maxAgents; i++) {
      const component = new AIComponent(defaultConfig);
      component.isActive = false;
      
      // Create placeholder mesh
      const mesh = new THREE.Group();
      mesh.visible = false;
      
      const agent: AIAgent = {
        component,
        mesh,
        isActive: false,
      };
      
      this._agents.push(agent);
      this._freeIndices.push(i);
    }
  }

  /**
   * Add an AI agent at a position
   */
  addAgent(
    position: THREE.Vector3,
    config: AIConfig,
    mesh?: THREE.Object3D
  ): AIComponent | null {
    if (this._freeIndices.length === 0) {
      console.warn('[AIManager] Agent pool exhausted - consider increasing maxAgents');
      return null;
    }
    
    const index = this._freeIndices.pop()!;
    const agent = this._agents[index];
    
    // Reset and configure component
    agent.component.reset(config);
    agent.component.owner = mesh ?? agent.mesh;
    
    // Setup mesh
    if (mesh) {
      agent.mesh = mesh;
    } else {
      agent.mesh.position.copy(position);
      agent.mesh.visible = true;
    }
    
    agent.mesh.position.copy(position);
    agent.isActive = true;
    this._activeCount++;
    
    // Register in map
    this._agentMap.set(agent.component.id, index);
    
    return agent.component;
  }

  /**
   * Remove an AI agent
   */
  removeAgent(componentId: string): void;
  removeAgent(component: AIComponent): void;
  removeAgent(arg: string | AIComponent): void {
    let componentId: string;
    
    if (typeof arg === 'string') {
      componentId = arg;
    } else {
      componentId = arg.id;
    }
    
    const index = this._agentMap.get(componentId);
    if (index === undefined) return;
    
    const agent = this._agents[index];
    if (!agent.isActive) return;
    
    // Hide and deactivate
    agent.mesh.visible = false;
    agent.isActive = false;
    agent.component.isActive = false;
    
    // Remove from map
    this._agentMap.delete(componentId);
    
    // Return to free list
    this._freeIndices.push(index);
    this._activeCount--;
  }

  /**
   * Get an agent by component ID
   */
  getAgent(componentId: string): AIAgent | null {
    const index = this._agentMap.get(componentId);
    if (index === undefined) return null;
    const agent = this._agents[index];
    return agent?.isActive ? agent : null;
  }

  /**
   * Get all active agents
   */
  getActiveAgents(): AIAgent[] {
    const result: AIAgent[] = [];
    for (const agent of this._agents) {
      if (agent.isActive) {
        result.push(agent);
      }
    }
    return result;
  }

  /**
   * Update all active AI agents
   * Call every frame with deltaTime
   */
  update(deltaTime: number): void {
    for (const agent of this._agents) {
      if (!agent.isActive) continue;
      
      const component = agent.component;
      const position = agent.mesh.position;
      
      // Clear forces from previous frame
      component.clearForces();
      
      // Apply steering based on current state
      switch (component.state) {
        case AIState.PATROLLING:
          this._updatePatrolling(agent, deltaTime);
          break;
        case AIState.CHASING:
          this._updateChasing(agent, deltaTime);
          break;
        case AIState.FLEEING:
          this._updateFleeing(agent, deltaTime);
          break;
        case AIState.AVOIDING:
          this._updateAvoiding(agent, deltaTime);
          break;
        case AIState.IDLE:
        case AIState.STOPPED:
          // No movement
          break;
      }
      
      // Apply obstacle avoidance (blended with current steering)
      this._applyObstacleAvoidance(agent, deltaTime);
      
      // Apply acceleration and move
      component.applyAcceleration(deltaTime);
      component.moveOwner(deltaTime);
    }
    
    // Update profiler stats
    if (this._profiler) {
      // @ts-ignore - extending profiler for gameplay metrics
      this._profiler.activeAIAgents = this._activeCount;
    }
  }

  /**
   * Update patrolling behavior
   */
  private _updatePatrolling(agent: AIAgent, deltaTime: number): void {
    const component = agent.component;
    
    if (!component.currentPath) {
      component.stop();
      return;
    }
    
    const path = this._waypointGraph.getPath(component.currentPath);
    if (!path || path.waypoints.length === 0) {
      component.stop();
      return;
    }
    
    // Get current waypoint
    if (!component.currentWaypointId) {
      component.currentWaypointId = path.waypoints[0];
    }
    
    const currentWp = this._waypointGraph.getWaypoint(component.currentWaypointId);
    if (!currentWp) {
      component.stop();
      return;
    }
    
    const position = agent.mesh.position;
    
    // Check if reached waypoint
    if (component.hasReachedWaypoint(position, currentWp.position)) {
      // Get next waypoint
      const nextId = this._waypointGraph.getNextWaypointInPath(
        component.currentPath,
        component.currentWaypointId
      );
      
      if (nextId) {
        component.currentWaypointId = nextId;
      } else {
        // End of path
        component.stop();
        return;
      }
    }
    
    // Seek current waypoint
    this._seek(agent, currentWp.position);
  }

  /**
   * Update chasing behavior
   */
  private _updateChasing(agent: AIAgent, deltaTime: number): void {
    const component = agent.component;
    
    if (!component.chaseTarget) {
      component.setState(AIState.IDLE);
      return;
    }
    
    this._seek(agent, component.chaseTarget.position);
  }

  /**
   * Update fleeing behavior
   */
  private _updateFleeing(agent: AIAgent, deltaTime: number): void {
    const component = agent.component;
    
    if (!component.fleeTarget) {
      component.setState(AIState.IDLE);
      return;
    }
    
    this._flee(agent, component.fleeTarget);
  }

  /**
   * Update avoiding behavior
   */
  private _updateAvoiding(agent: AIAgent, deltaTime: number): void {
    // Simple stop-and-wait for now
    // Could be extended with complex evasion patterns
    const component = agent.component;
    component.velocity.multiplyScalar(0.9); // Slow down
  }

  /**
   * Seek steering behavior
   */
  private _seek(agent: AIAgent, target: THREE.Vector3): void {
    const component = agent.component;
    const position = agent.mesh.position;
    
    const desiredVelocity = component.getDesiredDirection(
      AIManager._tempVec3A.subVectors(target, position)
    ).multiplyScalar(component.getEffectiveMaxSpeed());
    
    const steering = component.calculateSteering(desiredVelocity);
    component.acceleration.add(steering);
  }

  /**
   * Flee steering behavior
   */
  private _flee(agent: AIAgent, target: THREE.Vector3): void {
    const component = agent.component;
    const position = agent.mesh.position;
    
    const desiredVelocity = component.getDesiredDirection(
      AIManager._tempVec3A.subVectors(position, target)
    ).multiplyScalar(component.getEffectiveMaxSpeed());
    
    const steering = component.calculateSteering(desiredVelocity);
    component.acceleration.add(steering);
  }

  /**
   * Apply obstacle avoidance steering
   */
  private _applyObstacleAvoidance(agent: AIAgent, deltaTime: number): void {
    const component = agent.component;
    const position = agent.mesh.position;
    
    if (this._obstacles.length === 0) return;
    
    let avoidanceForce = AIManager._tempVec3A.set(0, 0, 0);
    let obstaclesFound = 0;
    
    for (const obstacle of this._obstacles) {
      const toObstacle = AIManager._tempVec3B.subVectors(obstacle.position, position);
      const distance = toObstacle.length();
      
      if (distance < component.detectionRadius + obstacle.radius) {
        // Calculate avoidance force (stronger when closer)
        const avoidanceStrength = 1 - (distance / (component.detectionRadius + obstacle.radius));
        const pushDirection = toObstacle.normalize().negate();
        
        avoidanceForce.add(
          pushDirection.multiplyScalar(avoidanceStrength * component.maxAcceleration)
        );
        obstaclesFound++;
      }
    }
    
    if (obstaclesFound > 0) {
      avoidanceForce.divideScalar(obstaclesFound);
      component.acceleration.add(avoidanceForce);
      component.setState(AIState.AVOIDING);
    }
  }

  /**
   * Add an obstacle for avoidance
   */
  addObstacle(position: THREE.Vector3, radius: number): void {
    this._obstacles.push({ position, radius });
  }

  /**
   * Remove an obstacle
   */
  removeObstacle(position: THREE.Vector3): void {
    this._obstacles = this._obstacles.filter(
      obs => obs.position.distanceToSquared(position) > 0.01
    );
  }

  /**
   * Clear all obstacles
   */
  clearObstacles(): void {
    this._obstacles = [];
  }

  /**
   * Get active agent count
   */
  getActiveCount(): number {
    return this._activeCount;
  }

  /**
   * Get available capacity
   */
  getAvailableCapacity(): number {
    return this._freeIndices.length;
  }

  /**
   * Get all targetable agents (for tower targeting)
   */
  getTargetableAgents(): AIAgent[] {
    const result: AIAgent[] = [];
    for (const agent of this._agents) {
      if (agent.isActive && agent.component.userData.isTargetable !== false) {
        result.push(agent);
      }
    }
    return result;
  }

  /**
   * Get agents within a radius (for area effects)
   */
  getAgentsInRadius(center: THREE.Vector3, radius: number): AIAgent[] {
    const result: AIAgent[] = [];
    const radiusSq = radius * radius;
    
    for (const agent of this._agents) {
      if (agent.isActive) {
        const distSq = agent.mesh.position.distanceToSquared(center);
        if (distSq <= radiusSq) {
          result.push(agent);
        }
      }
    }
    return result;
  }

  /**
   * Clear all active agents
   */
  clearAll(): void {
    for (const agent of this._agents) {
      if (agent.isActive) {
        agent.mesh.visible = false;
        agent.isActive = false;
        agent.component.isActive = false;
        this._agentMap.delete(agent.component.id);
      }
    }
    this._activeCount = 0;
    this._freeIndices = Array.from({ length: this._agents.length }, (_, i) => i);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.clearAll();
    this._agents = [];
    this._agentMap.clear();
    this._freeIndices = [];
  }
}

/**
 * Factory for creating AI manager configurations
 */
export class AIManagerFactory {
  /**
   * Create an AI manager for car enemies
   */
  static createCarManager(
    waypointGraph: WaypointGraph,
    maxAgents: number = 150,
    profiler?: Profiler
  ): AIManager {
    return new AIManager({
      maxAgents,
      waypointGraph,
      profiler,
      defaultConfig: {
        maxSpeed: 15,
        maxAcceleration: 8,
        turnRate: 2,
        detectionRadius: 5,
        pathLookAhead: 10,
        waypointReachDistance: 2,
        isTargetable: true,
        enemyType: 'car',
      },
    });
  }

  /**
   * Create an AI manager for fast scout enemies
   */
  static createScoutManager(
    waypointGraph: WaypointGraph,
    maxAgents: number = 100,
    profiler?: Profiler
  ): AIManager {
    return new AIManager({
      maxAgents,
      waypointGraph,
      profiler,
      defaultConfig: {
        maxSpeed: 25,
        maxAcceleration: 12,
        turnRate: 4,
        detectionRadius: 8,
        pathLookAhead: 15,
        waypointReachDistance: 3,
        isTargetable: true,
        enemyType: 'scout',
      },
    });
  }
}
