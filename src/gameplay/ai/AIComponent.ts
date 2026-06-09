/**
 * AI Component - Tokyo Xtreme Racer Style
 * Handles AI behavior states and steering for rival cars
 */

import * as THREE from 'three';
import { RivalAggression } from './RivalComponent';

export enum AIState {
  /** Cruising normally on highway */
  CRUISING = 'CRUISING',
  /** Approaching player to initiate challenge */
  APPROACHING_PLAYER = 'APPROACHING_PLAYER',
  /** Waiting for challenge response */
  ACCEPTING_CHALLENGE = 'ACCEPTING_CHALLENGE',
  /** Actively in SP battle */
  SP_BATTLE = 'SP_BATTLE',
  /** Retreating after defeat */
  RETREATING = 'RETREATING',
  /** Fleeing from player */
  FLEEING = 'FLEEING',
  /** Blocked by traffic */
  AVOIDING_TRAFFIC = 'AVOIDING_TRAFFIC',
}

export interface AIComponentConfig {
  /** Aggression level affects behavior */
  aggression: RivalAggression;
  /** Skill level (0-1) affects driving precision */
  skill: number;
  /** Speed stat (0-1) affects max speed */
  speed: number;
  /** SP resistance (0-1) affects battle performance */
  spResistance: number;
  /** Reaction time in seconds */
  reactionTime: number;
}

const DEFAULT_CONFIG: AIComponentConfig = {
  aggression: RivalAggression.NORMAL,
  skill: 0.5,
  speed: 0.5,
  spResistance: 0.5,
  reactionTime: 0.3,
};

export interface SteeringOutput {
  /** Desired acceleration (-1 to 1) */
  acceleration: number;
  /** Desired steering (-1 to 1) */
  steering: number;
  /** Target lane change direction */
  laneChange: number;
}

export class AIComponent {
  private config: AIComponentConfig;
  private currentState: AIState;
  
  // Position and movement
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private currentSpeed: number;
  private targetSpeed: number;
  private currentLane: number;
  private targetLane: number;
  
  // State tracking
  private stateTimer: number;
  private lastDecisionTime: number;
  private isRespondingToChallenge: boolean;
  private challengeResponseTimer: number;
  
  // Battle tracking
  private distanceToPlayer: number;
  private isLeading: boolean;
  private currentSP: number;
  private maxSP: number;
  
  // Avoidance
  private avoidanceTarget: THREE.Vector3 | null;
  private avoidanceTimer: number;
  
  constructor(config: Partial<AIComponentConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentState = AIState.CRUISIN​G;
    
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.currentLane = 0;
    this.targetLane = 0;
    
    this.stateTimer = 0;
    this.lastDecisionTime = 0;
    this.isRespondingToChallenge = false;
    this.challengeResponseTimer = 0;
    
    this.distanceToPlayer = 0;
    this.isLeading = false;
    this.currentSP = 1000;
    this.maxSP = 1000;
    
    this.avoidanceTarget = null;
    this.avoidanceTimer = 0;
  }
  
  /**
   * Update AI component
   */
  update(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number,
    trafficPositions: THREE.Vector3[]
  ): SteeringOutput {
    this.stateTimer += deltaTime;
    
    // Update state-specific behavior
    let output: SteeringOutput;
    
    switch (this.currentState) {
      case AIState.CRUISIN​G:
        output = this.updateCruising(deltaTime, playerPosition);
        break;
      case AIState.APPROACHING_PLAYER:
        output = this.updateApproachingPlayer(deltaTime, playerPosition);
        break;
      case AIState.ACCEPTING_CHALLENGE:
        output = this.updateAcceptingChallenge(deltaTime);
        break;
      case AIState.SP_BATTLE:
        output = this.updateSPBattle(deltaTime, playerPosition, playerSpeed);
        break;
      case AIState.RETREATING:
      case AIState.FLEEING:
        output = this.updateRetreating(deltaTime, playerPosition);
        break;
      case AIState.AVOIDING_TRAFFIC:
        output = this.updateAvoidingTraffic(deltaTime, trafficPositions);
        break;
      default:
        output = { acceleration: 0, steering: 0, laneChange: 0 };
    }
    
    // Apply traffic avoidance if needed
    if (trafficPositions.length > 0) {
      const avoidance = this.calculateAvoidance(trafficPositions);
      if (avoidance) {
        output.steering += avoidance.x * 0.5;
        output.acceleration += avoidance.z * 0.3;
      }
    }
    
    // Clamp outputs based on skill
    const skillFactor = this.config.skill;
    output.steering = THREE.MathUtils.clamp(output.steering, -skillFactor, skillFactor);
    output.acceleration = THREE.MathUtils.clamp(output.acceleration, -skillFactor, skillFactor);
    
    return output;
  }
  
  /**
   * Set AI state
   */
  setState(newState: AIState): void {
    this.currentState = newState;
    this.stateTimer = 0;
    
    switch (newState) {
      case AIState.ACCEPTING_CHALLENGE:
        this.challengeResponseTimer = this.config.reactionTime;
        break;
      case AIState.SP_BATTLE:
        this.targetSpeed = this.getBattleSpeed();
        break;
      case AIState.RETREATING:
      case AIState.FLEEING:
        this.targetSpeed = this.getCruiseSpeed() * 1.2;
        break;
    }
  }
  
  /**
   * Get current state
   */
  getState(): AIState {
    return this.currentState;
  }
  
  /**
   * Set position
   */
  setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
  }
  
  /**
   * Get position
   */
  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }
  
  /**
   * Set current lane
   */
  setLane(lane: number): void {
    this.currentLane = lane;
    this.targetLane = lane;
  }
  
  /**
   * Get current lane
   */
  getLane(): number {
    return this.currentLane;
  }
  
  /**
   * Set speed
   */
  setSpeed(speed: number): void {
    this.currentSpeed = speed;
    this.targetSpeed = speed;
  }
  
  /**
   * Get current speed
   */
  getSpeed(): number {
    return this.currentSpeed;
  }
  
  /**
   * Update battle state
   */
  updateBattleState(distanceToPlayer: number, isLeading: boolean, spPercentage: number): void {
    this.distanceToPlayer = distanceToPlayer;
    this.isLeading = isLeading;
    this.currentSP = spPercentage * this.maxSP;
    
    // Check for retreat condition
    if (this.currentState === AIState.SP_BATTLE && spPercentage < 0.2) {
      // Low SP - might retreat
      if (Math.random() < 0.3 * this.getAggressionFactor()) {
        this.setState(AIState.RETREATING);
      }
    }
  }
  
  /**
   * Start challenge response
   */
  startChallengeResponse(): void {
    this.isRespondingToChallenge = true;
    this.challengeResponseTimer = this.config.reactionTime + (Math.random() * 0.5);
    this.setState(AIState.ACCEPTING_CHALLENGE);
  }
  
  /**
   * Check if challenge accepted
   */
  hasAcceptedChallenge(): boolean {
    return !this.isRespondingToChallenge && this.challengeResponseTimer <= 0;
  }
  
  /**
   * Get challenge acceptance probability
   */
  getChallengeAcceptChance(): number {
    const baseChance = 0.7;
    const aggressionBonus = this.getAggressionFactor() * 0.2;
    return Math.min(1.0, baseChance + aggressionBonus);
  }
  
  /**
   * Reset AI to cruising
   */
  resetToCruising(): void {
    this.setState(AIState.CRUISIN​G);
    this.isRespondingToChallenge = false;
    this.challengeResponseTimer = 0;
    this.targetSpeed = this.getCruiseSpeed();
  }
  
  // ==========================================================================
  // STATE UPDATES
  // ==========================================================================
  
  private updateCruising(deltaTime: number, playerPosition: THREE.Vector3): SteeringOutput {
    const output: SteeringOutput = { acceleration: 0, steering: 0, laneChange: 0 };
    
    // Maintain cruise speed
    this.targetSpeed = this.getCruiseSpeed();
    output.acceleration = (this.targetSpeed - this.currentSpeed) / this.targetSpeed;
    
    // Check if player is nearby
    const distanceToPlayer = this.position.distanceTo(playerPosition);
    
    if (distanceToPlayer < 50 && distanceToPlayer > 10) {
      // Player is close - consider challenging
      if (Math.random() < 0.02 * this.getAggressionFactor()) {
        this.setState(AIState.APPROACHING_PLAYER);
      }
    }
    
    // Occasional lane changes
    if (Math.random() < 0.01) {
      output.laneChange = Math.random() > 0.5 ? 1 : -1;
    }
    
    return output;
  }
  
  private updateApproachingPlayer(deltaTime: number, playerPosition: THREE.Vector3): SteeringOutput {
    const output: SteeringOutput = { acceleration: 0, steering: 0, laneChange: 0 };
    
    // Slow down to let player catch up
    this.targetSpeed = this.getCruiseSpeed() * 0.7;
    output.acceleration = (this.targetSpeed - this.currentSpeed) / this.targetSpeed;
    
    // Move towards player's lane
    const playerLane = Math.round(playerPosition.x / 4.2);
    if (this.currentLane !== playerLane) {
      output.laneChange = Math.sign(playerLane - this.currentLane);
    }
    
    // Wait for player to flash headlights (challenge)
    const distanceToPlayer = this.position.distanceTo(playerPosition);
    
    if (distanceToPlayer < 15) {
      // Close enough - wait for challenge
      this.startChallengeResponse();
    }
    
    return output;
  }
  
  private updateAcceptingChallenge(deltaTime: number): SteeringOutput {
    this.challengeResponseTimer -= deltaTime;
    
    if (this.challengeResponseTimer <= 0) {
      this.isRespondingToChallenge = false;
      
      // Decide whether to accept
      if (Math.random() < this.getChallengeAcceptChance()) {
        // Accept - signal with headlights (handled externally)
        return { acceleration: 0, steering: 0, laneChange: 0 };
      } else {
        // Reject - speed away
        this.setState(AIState.FLEEING);
      }
    }
    
    return { acceleration: 0, steering: 0, laneChange: 0 };
  }
  
  private updateSPBattle(deltaTime: number, playerPosition: THREE.Vector3, playerSpeed: number): SteeringOutput {
    const output: SteeringOutput = { acceleration: 0, steering: 0, laneChange: 0 };
    
    // Match or exceed player speed based on stats
    const targetSpeed = playerSpeed * (0.95 + this.config.speed * 0.3);
    this.targetSpeed = targetSpeed;
    output.acceleration = (targetSpeed - this.currentSpeed) / targetSpeed;
    
    // Aggressive behavior: try to block player
    if (this.config.aggression === RivalAggression.AGGRESSIVE || 
        this.config.aggression === RivalAggression.EXTREME) {
      
      if (this.isLeading) {
        // We're ahead - try to maintain lead
        const playerLane = Math.round(playerPosition.x / 4.2);
        if (this.currentLane !== playerLane && Math.random() < 0.05) {
          output.laneChange = Math.sign(playerLane - this.currentLane);
        }
      } else {
        // We're behind - try to overtake
        const openLane = this.findOpenLane(playerPosition.x);
        if (openLane !== null && openLane !== this.currentLane) {
          output.laneChange = Math.sign(openLane - this.currentLane);
        }
      }
    }
    
    return output;
  }
  
  private updateRetreating(deltaTime: number, playerPosition: THREE.Vector3): SteeringOutput {
    const output: SteeringOutput = { acceleration: 0, steering: 0, laneChange: 0 };
    
    // Maximum speed to escape
    this.targetSpeed = this.getMaxSpeed();
    output.acceleration = 1;
    
    // Move away from player
    const direction = this.position.x < playerPosition.x ? -1 : 1;
    const targetLane = direction > 0 ? 2 : -2;
    
    if (this.currentLane !== targetLane) {
      output.laneChange = Math.sign(targetLane - this.currentLane);
    }
    
    return output;
  }
  
  private updateAvoidingTraffic(deltaTime: number, trafficPositions: THREE.Vector3[]): SteeringOutput {
    const output: SteeringOutput = { acceleration: 0, steering: 0, laneChange: 0 };
    
    this.avoidanceTimer -= deltaTime;
    
    if (this.avoidanceTimer <= 0) {
      this.avoidanceTarget = null;
      this.setState(AIState.SP_BATTLE); // Return to battle
    } else if (this.avoidanceTarget) {
      // Steer towards avoidance target
      const direction = this.avoidanceTarget.x - this.position.x;
      output.steering = Math.sign(direction) * 0.5;
    }
    
    return output;
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  
  private getCruiseSpeed(): number {
    return 0.6 + this.config.speed * 0.3;
  }
  
  private getBattleSpeed(): number {
    return 0.8 + this.config.speed * 0.4;
  }
  
  private getMaxSpeed(): number {
    return 1.0 + this.config.speed * 0.2;
  }
  
  private getAggressionFactor(): number {
    switch (this.config.aggression) {
      case RivalAggression.PASSIVE:
        return 0.3;
      case RivalAggression.NORMAL:
        return 0.6;
      case RivalAggression.AGGRESSIVE:
        return 0.85;
      case RivalAggression.EXTREME:
        return 1.0;
      default:
        return 0.5;
    }
  }
  
  private findOpenLane(playerX: number): number | null {
    const lanes = [-2, -1, 0, 1, 2];
    const occupiedLanes = new Set([Math.round(playerX / 4.2)]);
    
    for (const lane of lanes) {
      if (!occupiedLanes.has(lane)) {
        return lane;
      }
    }
    
    return null;
  }
  
  private calculateAvoidance(trafficPositions: THREE.Vector3[]): THREE.Vector3 | null {
    let avoidance = new THREE.Vector3();
    let count = 0;
    
    for (const trafficPos of trafficPositions) {
      const distance = this.position.distanceTo(trafficPos);
      
      if (distance < 10) {
        const direction = this.position.clone().sub(trafficPos).normalize();
        avoidance.add(direction.multiplyScalar(1 / distance));
        count++;
      }
    }
    
    if (count > 0) {
      avoidance.divideScalar(count);
      return avoidance;
    }
    
    return null;
  }
}

export default AIComponent;
