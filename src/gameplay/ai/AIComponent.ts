/**
 * AI Component - TXR-style rival AI behavior system
 */

import { RivalCar, RivalState } from '../../entities/RivalCar';
import { RIVAL_CONFIG } from '../../config/gameConfig';

export enum AIState {
  CRUISING = 'CRUISING',           // Normal highway driving
  APPROACHING_PLAYER = 'APPROACHING_PLAYER', // Moving toward player
  ACCEPTING_CHALLENGE = 'ACCEPTING_CHALLENGE', // Responding to headlight flash
  SP_BATTLE = 'SP_BATTLE',         // Active SP battle
  RETREATING = 'RETREATING',       // Low SP, trying to escape
  BLOCKING = 'BLOCKING',           // Trying to block player's path
  ATTACKING = 'ATTACKING',         // Aggressive ramming behavior
}

export interface AIConfig {
  aggression: number;        // 0-1, affects behavior weights
  skill: number;             // 0-1, affects driving precision
  reactionTime: number;      // Seconds before responding to player actions
  catchupThreshold: number;  // Distance gap that triggers catchup
  retreatSPThreshold: number; // SP percentage to start retreating
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  aggression: 0.5,
  skill: 0.5,
  reactionTime: 0.3,
  catchupThreshold: 30,
  retreatSPThreshold: 0.2,
};

export interface SteeringTarget {
  targetX: number;           // Target lane position
  targetSpeed: number;       // Target speed
  urgency: number;           // How quickly to reach target (0-1)
}

export class AIComponent {
  public currentState: AIState;
  private config: AIConfig;
  private entity: RivalCar | null;
  private stateTimer: number;
  private steeringTarget: SteeringTarget | null;
  private lastPlayerPosition: { x: number; z: number } | null;
  private behaviorCooldowns: Map<string, number>;
  
  constructor(config: Partial<AIConfig> = {}) {
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.currentState = AIState.CRUISING;
    this.entity = null;
    this.stateTimer = 0;
    this.steeringTarget = null;
    this.lastPlayerPosition = null;
    this.behaviorCooldowns = new Map();
  }

  bindEntity(entity: RivalCar): void {
    this.entity = entity;
    // Apply config to entity
    entity.data.aggression = this.config.aggression;
  }

  /**
   * Update AI behavior
   */
  update(deltaTime: number, playerPosition: { x: number; z: number }, 
         playerSpeed: number, spGauge?: { current: number; max: number }): void {
    this.stateTimer += deltaTime;
    this.lastPlayerPosition = playerPosition;

    // Update cooldowns
    for (const [key, value] of this.behaviorCooldowns.entries()) {
      if (value <= 0) {
        this.behaviorCooldowns.delete(key);
      } else {
        this.behaviorCooldowns.set(key, value - deltaTime);
      }
    }

    // State machine update
    switch (this.currentState) {
      case AIState.CRUISING:
        this.updateCruising(deltaTime, playerPosition, playerSpeed);
        break;
      case AIState.APPROACHING_PLAYER:
        this.updateApproachingPlayer(deltaTime, playerPosition);
        break;
      case AIState.ACCEPTING_CHALLENGE:
        this.updateAcceptingChallenge(deltaTime);
        break;
      case AIState.SP_BATTLE:
        this.updateSPBattle(deltaTime, playerPosition, playerSpeed, spGauge);
        break;
      case AIState.RETREATING:
        this.updateRetreating(deltaTime, playerPosition);
        break;
      case AIState.BLOCKING:
        this.updateBlocking(deltaTime, playerPosition);
        break;
      case AIState.ATTACKING:
        this.updateAttacking(deltaTime, playerPosition);
        break;
    }

    // Apply steering target to entity
    if (this.steeringTarget && this.entity) {
      this.applySteering(deltaTime);
    }
  }

  private updateCruising(deltaTime: number, playerPosition: { x: number; z: number }, 
                         playerSpeed: number): void {
    if (!this.entity) return;

    // Check if player is nearby
    const distanceToPlayer = Math.abs(this.entity.data.position.z - playerPosition.z);
    
    if (distanceToPlayer < 50 && !this.behaviorCooldowns.has('approach')) {
      // Player spotted, start approaching
      this.setState(AIState.APPROACHING_PLAYER);
      return;
    }

    // Normal cruising behavior - maintain lane and speed
    const laneWidth = 4.2;
    const targetLane = Math.round(this.entity.data.lane);
    
    this.steeringTarget = {
      targetX: targetLane * laneWidth,
      targetSpeed: this.entity.data.baseSpeed,
      urgency: 0.3,
    };
  }

  private updateApproachingPlayer(deltaTime: number, playerPosition: { x: number; z: number }): void {
    if (!this.entity) return;

    const distanceToPlayer = this.entity.data.position.z - playerPosition.z;
    
    // If we're close enough, wait for challenge or continue
    if (Math.abs(distanceToPlayer) < 20) {
      // Stay near player, match speed
      this.steeringTarget = {
        targetX: this.entity.data.position.x,
        targetSpeed: playerPosition.z < this.entity.data.position.z ? 
          playerSpeed * 0.95 : playerSpeed * 1.05,
        urgency: 0.5,
      };
    } else {
      // Move toward player's position
      const targetX = playerPosition.x;
      this.steeringTarget = {
        targetX,
        targetSpeed: this.entity.data.maxSpeed * 0.9,
        urgency: 0.6,
      };
    }
  }

  private updateAcceptingChallenge(_deltaTime: number): void {
    // Brief pause before battle starts
    if (this.stateTimer >= 0.5) {
      this.setState(AIState.SP_BATTLE);
    }
  }

  private updateSPBattle(deltaTime: number, playerPosition: { x: number; z: number },
                         playerSpeed: number, spGauge?: { current: number; max: number }): void {
    if (!this.entity) return;

    // Check if should retreat
    if (spGauge && spGauge.current / spGauge.max < this.config.retreatSPThreshold) {
      this.setState(AIState.RETREATING);
      return;
    }

    const distanceGap = this.entity.data.position.z - playerPosition.z;
    const isAhead = distanceGap < 0;

    // Decide behavior based on aggression and situation
    const aggressionRoll = Math.random();
    
    if (aggressionRoll < this.config.aggression * 0.3 && !this.behaviorCooldowns.has('block')) {
      // Try to block player
      this.setState(AIState.BLOCKING);
      this.behaviorCooldowns.set('block', 3);
      return;
    }

    if (aggressionRoll < this.config.aggression * 0.5 && !this.behaviorCooldowns.has('attack')) {
      // Try to attack/ram player
      this.setState(AIState.ATTACKING);
      this.behaviorCooldowns.set('attack', 5);
      return;
    }

    // Default: maintain position relative to player
    if (isAhead) {
      // Ahead - try to maintain lead
      this.steeringTarget = {
        targetX: this.entity.data.position.x,
        targetSpeed: Math.max(playerSpeed * 1.02, this.entity.data.baseSpeed),
        urgency: 0.7,
      };
    } else {
      // Behind - try to catch up
      this.steeringTarget = {
        targetX: playerPosition.x,
        targetSpeed: Math.max(playerSpeed * 1.05, this.entity.data.baseSpeed),
        urgency: 0.8,
      };
    }
  }

  private updateRetreating(deltaTime: number, playerPosition: { x: number; z: number }): void {
    if (!this.entity) return;

    // Try to get ahead and maintain distance
    const targetZ = playerPosition.z - 30; // Stay 30 units ahead
    
    this.steeringTarget = {
      targetX: this.entity.data.position.x,
      targetSpeed: this.entity.data.maxSpeed,
      urgency: 1.0,
    };

    // If we've created enough distance, return to cruising
    if (this.entity.data.position.z < playerPosition.z - 50) {
      this.setState(AIState.CRUISING);
    }
  }

  private updateBlocking(deltaTime: number, playerPosition: { x: number; z: number }): void {
    if (!this.entity) return;

    // Position car between player and optimal racing line
    const blockPosition = playerPosition.x;
    
    this.steeringTarget = {
      targetX: blockPosition,
      targetSpeed: playerPosition.z < this.entity.data.position.z ?
        playerSpeed * 0.9 : playerSpeed * 1.0,
      urgency: 0.9,
    };

    // Return to battle after blocking attempt
    if (this.stateTimer >= 2) {
      this.setState(AIState.SP_BATTLE);
    }
  }

  private updateAttacking(deltaTime: number, playerPosition: { x: number; z: number }): void {
    if (!this.entity) return;

    // Try to ram into player from behind/side
    const approachAngle = this.entity.data.position.x - playerPosition.x;
    
    this.steeringTarget = {
      targetX: playerPosition.x + (approachAngle > 0 ? -1 : 1) * 2,
      targetSpeed: this.entity.data.maxSpeed * 1.1,
      urgency: 1.0,
    };

    // Return to battle after attack attempt
    if (this.stateTimer >= 3) {
      this.setState(AIState.SP_BATTLE);
    }
  }

  private applySteering(deltaTime: number): void {
    if (!this.entity || !this.steeringTarget) return;

    const { targetX, targetSpeed, urgency } = this.steeringTarget;
    const steerFactor = this.config.skill * urgency;

    // Smooth steering toward target X
    const dx = targetX - this.entity.data.position.x;
    this.entity.data.position.x += dx * steerFactor * deltaTime * 5;

    // Smooth speed adjustment
    const ds = targetSpeed - this.entity.data.speed;
    this.entity.data.speed += ds * steerFactor * deltaTime * 3;

    // Clamp position to highway bounds
    const maxLane = 2;
    const laneWidth = 4.2;
    this.entity.data.position.x = Math.max(
      -maxLane * laneWidth,
      Math.min(maxLane * laneWidth, this.entity.data.position.x)
    );
  }

  /**
   * Set AI state
   */
  setState(state: AIState): void {
    this.currentState = state;
    this.stateTimer = 0;
    
    if (this.entity) {
      // Sync with entity state
      switch (state) {
        case AIState.CRUISING:
          this.entity.data.state = RivalState.CHASE;
          break;
        case AIState.SP_BATTLE:
          this.entity.data.state = RivalState.BATTLE;
          break;
        case AIState.RETREATING:
          this.entity.data.state = RivalState.FLEE;
          break;
        default:
          this.entity.data.state = RivalState.CHASE;
      }
    }
  }

  /**
   * Start SP battle mode
   */
  startBattle(): void {
    this.setState(AIState.ACCEPTING_CHALLENGE);
  }

  /**
   * End SP battle
   */
  endBattle(won: boolean): void {
    if (won) {
      // AI lost - may retreat or accept defeat
      this.setState(AIState.RETREATING);
    } else {
      // AI won - return to cruising
      this.setState(AIState.CRUISING);
    }
  }

  /**
   * Get current state
   */
  getState(): AIState {
    return this.currentState;
  }

  /**
   * Check if AI is in battle mode
   */
  isInBattle(): boolean {
    return this.currentState === AIState.SP_BATTLE;
  }

  /**
   * Get steering target for debugging
   */
  getSteeringTarget(): SteeringTarget | null {
    return this.steeringTarget;
  }
}
