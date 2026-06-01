/**
 * Rival AI Entity
 * Aggressive street racer with advanced behaviors: ram, block, draft, slingshot
 */

import * as THREE from 'three';
import { RIVAL_CONFIG, TRAFFIC_CONFIG } from '../config/gameConfig';

export enum RivalState {
  CHASE = 'CHASE',
  BLOCK = 'BLOCK',
  RAM = 'RAM',
  FLEE = 'FLEE',
}

export interface RivalCarData {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  speed: number;
  lane: number;
  state: RivalState;
  aggression: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';
  stateTimer: number;
  draftBonus: number;
  isDrafting: boolean;
}

export class RivalCar {
  public data: RivalCarData;
  private stateMachineWeights: Record<RivalState, number>;
  
  constructor(
    mesh: THREE.Group,
    lane: number,
    zPosition: number,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME' = 'MEDIUM'
  ) {
    const diffConfig = RIVAL_CONFIG[`DIFFICULTY_${difficulty}`];
    const baseSpeed = 0.6 * diffConfig.speed;

    this.data = {
      id: `rival_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mesh,
      position: new THREE.Vector3(lane * TRAFFIC_CONFIG.LANE_WIDTH, 0, zPosition),
      speed: baseSpeed,
      lane,
      state: RivalState.CHASE,
      aggression: diffConfig.aggression,
      difficulty,
      stateTimer: 0,
      draftBonus: 1,
      isDrafting: false,
    };

    // Initialize state machine weights based on aggression
    this.stateMachineWeights = {
      [RivalState.CHASE]: RIVAL_CONFIG.STATE_CHASE,
      [RivalState.BLOCK]: RIVAL_CONFIG.STATE_BLOCK,
      [RivalState.RAM]: RIVAL_CONFIG.STATE_RAM * this.data.aggression,
      [RivalState.FLEE]: RIVAL_CONFIG.STATE_FLEE,
    };

    mesh.position.copy(this.data.position);
  }

  update(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;

    // Update state machine
    this.updateStateMachine(dt, playerPosition, playerSpeed);

    // Check drafting opportunity
    this.checkDrafting(playerPosition, playerSpeed);

    // Apply behavior based on current state
    switch (data.state) {
      case RivalState.CHASE:
        this.updateChase(dt, playerPosition, playerSpeed);
        break;
      case RivalState.BLOCK:
        this.updateBlock(dt, playerPosition);
        break;
      case RivalState.RAM:
        this.updateRam(dt, playerPosition);
        break;
      case RivalState.FLEE:
        this.updateFlee(dt, playerPosition);
        break;
    }

    // Update mesh position
    data.mesh.position.copy(data.position);
    
    // Visual rotation based on movement
    const targetRotation = (data.position.x - playerPosition.x) * 0.05;
    data.mesh.rotation.y = THREE.MathUtils.lerp(data.mesh.rotation.y, targetRotation, 0.1);
  }

  private updateStateMachine(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;
    
    data.stateTimer += dt;

    // Minimum time in current state
    if (data.stateTimer < 2) {
      return;
    }

    // Calculate distances
    const distanceZ = data.position.z - playerPosition.z;
    const distanceX = Math.abs(data.position.x - playerPosition.x);
    const isClose = distanceZ > -10 && distanceZ < 30;
    const isInSameLane = distanceX < 2;

    // State transitions based on situation
    let newState = data.state;

    if (isClose && isInSameLane && data.aggression > 0.8) {
      // Close and same lane - consider ram
      if (Math.random() < RIVAL_CONFIG.RAM_ATTEMPT_CHANCE * data.aggression) {
        newState = RivalState.RAM;
      }
    } else if (isClose && !isInSameLane) {
      // Close but different lane - consider blocking
      if (Math.random() < RIVAL_CONFIG.BLOCK_LANE_CHANCE * data.aggression) {
        newState = RivalState.BLOCK;
      }
    } else if (distanceZ > 50) {
      // Player is ahead - chase
      newState = RivalState.CHASE;
    }

    // Apply state change
    if (newState !== data.state) {
      data.state = newState;
      data.stateTimer = 0;
    }
  }

  private updateChase(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;
    const diffConfig = RIVAL_CONFIG[`DIFFICULTY_${data.difficulty}`];

    // Target speed based on player speed
    const targetSpeed = playerSpeed * diffConfig.speed * (data.draftBonus > 1 ? data.draftBonus : 1);
    data.speed += (targetSpeed - data.speed) * 0.05;

    // Move towards player's lane
    const targetLane = Math.round(playerPosition.x / TRAFFIC_CONFIG.LANE_WIDTH);
    const clampedLane = THREE.MathUtils.clamp(targetLane, -TRAFFIC_CONFIG.LANE_COUNT / 2, TRAFFIC_CONFIG.LANE_COUNT / 2 - 1);
    
    if (data.lane !== clampedLane) {
      data.lane += Math.sign(clampedLane - data.lane) * 0.02;
    }

    data.position.z -= data.speed * 60 * dt;
    data.position.x = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updateBlock(dt: number, playerPosition: THREE.Vector3): void {
    const { data } = this;

    // Match player speed exactly to block
    data.speed = playerPosition.z > data.position.z ? playerPosition * 0.95 : playerPosition * 1.05;

    // Stay in player's lane or adjacent
    const playerLane = Math.round(playerPosition.x / TRAFFIC_CONFIG.LANE_WIDTH);
    const blockLane = playerLane + (Math.random() > 0.5 ? 1 : -1);
    const clampedLane = THREE.MathUtils.clamp(blockLane, -TRAFFIC_CONFIG.LANE_COUNT / 2, TRAFFIC_CONFIG.LANE_COUNT / 2 - 1);

    data.lane += (clampedLane - data.lane) * 0.03;
    data.position.z -= data.speed * 60 * dt;
    data.position.x = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updateRam(dt: number, playerPosition: THREE.Vector3): void {
    const { data } = this;

    // Accelerate to ram speed
    const ramSpeed = playerPosition * 1.2;
    data.speed += (ramSpeed - data.speed) * 0.1;

    // Move directly into player's lane
    const playerLaneX = playerPosition.x;
    const direction = playerLaneX - data.position.x;
    
    data.position.x += Math.sign(direction) * 0.15;
    data.position.z -= data.speed * 60 * dt;
    data.lane = data.position.x / TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updateFlee(dt: number, playerPosition: THREE.Vector3): void {
    const { data } = this;

    // Slow down to let player pass
    data.speed *= 0.95;
    data.position.z -= data.speed * 60 * dt;
  }

  private checkDrafting(playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;

    // Check if behind player in same lane
    const distanceZ = playerPosition.z - data.position.z;
    const distanceX = Math.abs(playerPosition.x - data.position.x);

    if (distanceZ > 5 && distanceZ < 15 && distanceX < 2) {
      // In drafting zone
      if (!data.isDrafting) {
        data.isDrafting = true;
        data.draftBonus = RIVAL_CONFIG.DRAFT_BONUS;
      }
    } else {
      data.isDrafting = false;
      data.draftBonus = 1;
    }

    // Slingshot bonus when exiting draft
    if (data.isDrafting && distanceZ < 8) {
      data.draftBonus = RIVAL_CONFIG.SLINGSHOT_BONUS;
    }
  }

  isActive(playerZ: number): boolean {
    return data.position.z > playerZ - 50;
  }

  dispose(): void {
    this.data.mesh.removeFromParent();
  }
}
