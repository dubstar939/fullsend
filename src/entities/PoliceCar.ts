/**
 * Police Car Entity
 * Pursuit logic with PIT maneuvers, spike strips, and backup calls
 */

import * as THREE from 'three';
import { POLICE_CONFIG, TRAFFIC_CONFIG } from '../config/gameConfig';

export enum PoliceState {
  IDLE = 'IDLE',
  ALERT = 'ALERT',
  PURSUIT = 'PURSUIT',
  FLANK_LEFT = 'FLANK_LEFT',
  FLANK_RIGHT = 'FLANK_RIGHT',
  BOX_IN = 'BOX_IN',
  PIT_ATTEMPT = 'PIT_ATTEMPT',
}

export interface PoliceCarData {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  speed: number;
  lane: number;
  state: PoliceState;
  heatLevel: number;
  isBackup: boolean;
  pitCooldown: number;
  sirenPhase: number;
}

export class PoliceCar {
  public data: PoliceCarData;
  private pursuitTimer: number = 0;
  private flankOffset: number = 0;

  constructor(
    mesh: THREE.Group,
    lane: number,
    zPosition: number,
    isBackup: boolean = false
  ) {
    this.data = {
      id: `police_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mesh,
      position: new THREE.Vector3(lane * TRAFFIC_CONFIG.LANE_WIDTH, 0, zPosition),
      speed: 0.7,
      lane,
      state: PoliceState.IDLE,
      heatLevel: 0,
      isBackup,
      pitCooldown: 0,
      sirenPhase: Math.random() * Math.PI * 2,
    };

    mesh.position.copy(this.data.position);
  }

  update(
    dt: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number,
    globalHeat: number
  ): void {
    const { data } = this;

    // Update heat level
    data.heatLevel = globalHeat;

    // Determine state based on heat and situation
    this.updateState(playerPosition, playerSpeed);

    // Update pit cooldown
    if (data.pitCooldown > 0) {
      data.pitCooldown -= dt;
    }

    // Apply behavior based on state
    switch (data.state) {
      case PoliceState.IDLE:
        this.updateIdle(dt);
        break;
      case PoliceState.ALERT:
        this.updateAlert(dt, playerPosition);
        break;
      case PoliceState.PURSUIT:
        this.updatePursuit(dt, playerPosition, playerSpeed);
        break;
      case PoliceState.FLANK_LEFT:
      case PoliceState.FLANK_RIGHT:
        this.updateFlank(dt, playerPosition, playerSpeed);
        break;
      case PoliceState.BOX_IN:
        this.updateBoxIn(dt, playerPosition, playerSpeed);
        break;
      case PoliceState.PIT_ATTEMPT:
        this.updatePitAttempt(dt, playerPosition, playerSpeed);
        break;
    }

    // Update siren animation
    data.sirenPhase += dt * 8;

    // Update mesh position
    data.mesh.position.copy(data.position);
    
    // Visual rotation
    const targetRotation = (data.position.x - playerPosition.x) * 0.03;
    data.mesh.rotation.y = THREE.MathUtils.lerp(data.mesh.rotation.y, targetRotation, 0.1);
  }

  private updateState(playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;
    const distance = data.position.distanceTo(playerPosition);
    const isAhead = data.position.z < playerPosition.z;

    // State transitions based on heat level
    if (data.heatLevel < POLICE_CONFIG.HEAT_THRESHOLD_ALERT) {
      data.state = PoliceState.IDLE;
    } else if (data.heatLevel < POLICE_CONFIG.HEAT_THRESHOLD_PURSUIT) {
      data.state = PoliceState.ALERT;
    } else if (distance > POLICE_CONFIG.BOX_IN_DISTANCE || !isAhead) {
      data.state = PoliceState.PURSUIT;
    } else if (distance < POLICE_CONFIG.BOX_IN_DISTANCE && isAhead) {
      // Check if we have enough cars for box-in
      data.state = PoliceState.BOX_IN;
    } else if (data.pitCooldown <= 0 && distance < 8 && isAhead) {
      data.state = PoliceState.PIT_ATTEMPT;
    } else if (isAhead && distance < 20) {
      // Flanking position
      data.state = data.position.x < playerPosition.x 
        ? PoliceState.FLANK_LEFT 
        : PoliceState.FLANK_RIGHT;
    }
  }

  private updateIdle(dt: number): void {
    const { data } = this;
    // Patrol at normal speed
    data.speed = 0.5;
    data.position.z -= data.speed * 60 * dt;
    data.position.x = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updateAlert(dt: number, playerPosition: THREE.Vector3): void {
    const { data } = this;
    // Move towards player but don't engage
    const targetZ = playerPosition.z + 30;
    const direction = Math.sign(targetZ - data.position.z);
    
    data.speed = 0.6;
    data.position.z -= data.speed * 60 * dt * direction;
    data.position.x = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updatePursuit(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;
    this.pursuitTimer += dt;

    // Match or exceed player speed
    const targetSpeed = playerSpeed * 1.1;
    data.speed += (targetSpeed - data.speed) * 0.08;

    // Move to player's lane
    const playerLane = Math.round(playerPosition.x / TRAFFIC_CONFIG.LANE_WIDTH);
    data.lane += (playerLane - data.lane) * 0.02;

    data.position.z -= data.speed * 60 * dt;
    data.position.x = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updateFlank(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;
    
    // Match speed and move to side
    data.speed = playerSpeed;
    
    const flankDirection = data.state === PoliceState.FLANK_LEFT ? -1 : 1;
    const targetX = playerPosition.x + flankDirection * 5;
    
    data.position.x += (targetX - data.position.x) * 0.05;
    data.position.z -= data.speed * 60 * dt;
    data.lane = data.position.x / TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updateBoxIn(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;
    
    // Slow down to box in player
    data.speed = playerSpeed * 0.9;
    
    // Stay ahead in same lane
    const playerLane = Math.round(playerPosition.x / TRAFFIC_CONFIG.LANE_WIDTH);
    data.lane += (playerLane - data.lane) * 0.03;

    // Maintain distance ahead
    const targetDistance = 8;
    const currentDistance = data.position.z - playerPosition.z;
    
    if (currentDistance < targetDistance) {
      data.speed = playerSpeed * 0.85;
    } else if (currentDistance > targetDistance + 5) {
      data.speed = playerSpeed * 1.05;
    }

    data.position.z -= data.speed * 60 * dt;
    data.position.x = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
  }

  private updatePitAttempt(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    const { data } = this;

    if (data.speed < POLICE_CONFIG.PIT_MIN_SPEED) {
      // Too slow for PIT, return to pursuit
      data.state = PoliceState.PURSUIT;
      return;
    }

    // Accelerate to PIT speed
    data.speed = playerSpeed * 1.15;

    // Move into player's rear quarter
    const offset = 2;
    const targetX = playerPosition.x + offset;
    data.position.x += (targetX - data.position.x) * 0.08;

    // Close distance
    data.position.z -= data.speed * 60 * dt;
    data.lane = data.position.x / TRAFFIC_CONFIG.LANE_WIDTH;

    // Check PIT success
    const distance = data.position.distanceTo(playerPosition);
    if (distance < 3 && Math.random() < POLICE_CONFIG.PIT_SUCCESS_CHANCE) {
      // PIT successful - would trigger player spin
      data.pitCooldown = 5;
      data.state = PoliceState.PURSUIT;
    }
  }

  /**
   * Check if this police car can attempt a PIT maneuver
   */
  canPit(playerPosition: THREE.Vector3): boolean {
    const { data } = this;
    const distance = data.position.distanceTo(playerPosition);
    const isBehind = data.position.z > playerPosition.z;
    const isInAdjacentLane = Math.abs(data.lane - Math.round(playerPosition.x / TRAFFIC_CONFIG.LANE_WIDTH)) <= 1;

    return (
      data.pitCooldown <= 0 &&
      data.speed >= POLICE_CONFIG.PIT_MIN_SPEED &&
      distance < 10 &&
      isBehind &&
      isInAdjacentLane
    );
  }

  /**
   * Get siren intensity for audio/visual effects
   */
  getSirenIntensity(): number {
    const { data } = this;
    if (data.state === PoliceState.IDLE) return 0;
    return (Math.sin(data.sirenPhase) + 1) / 2;
  }

  isActive(playerZ: number): boolean {
    return data.position.z > playerZ - 50;
  }

  dispose(): void {
    this.data.mesh.removeFromParent();
  }
}

/**
 * Police Manager - Handles multiple police cars and pursuit coordination
 */
export class PoliceManager {
  private cars: PoliceCar[] = [];
  private globalHeat: number = 0;
  private backupTimer: number = 0;
  private spikeStripDeployed: boolean = false;

  addPolice(car: PoliceCar): void {
    this.cars.push(car);
  }

  removePolice(car: PoliceCar): void {
    const index = this.cars.indexOf(car);
    if (index !== -1) {
      this.cars.splice(index, 1);
    }
  }

  update(dt: number, playerPosition: THREE.Vector3, playerSpeed: number): void {
    // Update heat decay
    if (this.globalHeat > 0) {
      this.globalHeat -= POLICE_CONFIG.HEAT_DECAY_RATE * dt;
      this.globalHeat = Math.max(0, this.globalHeat);
    }

    // Check for backup spawn
    if (this.globalHeat >= POLICE_CONFIG.HEAT_THRESHOLD_BACKUP) {
      this.backupTimer += dt;
      if (this.backupTimer >= POLICE_CONFIG.BACKUP_SPAWN_TIME && 
          this.cars.length < POLICE_CONFIG.BACKUP_MAX_CARS) {
        this.backupTimer = 0;
        // Would spawn backup car here
      }
    }

    // Update all police cars
    this.cars.forEach((car) => {
      car.update(dt, playerPosition, playerSpeed, this.globalHeat);
    });

    // Cleanup inactive cars
    this.cars = this.cars.filter((car) => car.isActive(playerPosition.z));
  }

  addHeat(amount: number): void {
    this.globalHeat += amount;
    this.globalHeat = Math.min(100, this.globalHeat);
  }

  reduceHeat(amount: number): void {
    this.globalHeat -= amount;
    this.globalHeat = Math.max(0, this.globalHeat);
  }

  getHeatLevel(): number {
    return this.globalHeat;
  }

  getPursuitState(): PoliceState {
    if (this.globalHeat < POLICE_CONFIG.HEAT_THRESHOLD_ALERT) return PoliceState.IDLE;
    if (this.globalHeat < POLICE_CONFIG.HEAT_THRESHOLD_PURSUIT) return PoliceState.ALERT;
    return PoliceState.PURSUIT;
  }

  canDeploySpikeStrip(): boolean {
    return (
      this.globalHeat >= POLICE_CONFIG.HEAT_THRESHOLD_SPIKE_STRIP &&
      !this.spikeStripDeployed
    );
  }

  deploySpikeStrip(): boolean {
    if (this.canDeploySpikeStrip()) {
      this.spikeStripDeployed = true;
      return true;
    }
    return false;
  }

  getCars(): PoliceCar[] {
    return this.cars;
  }

  reset(): void {
    this.cars.forEach((car) => car.dispose());
    this.cars = [];
    this.globalHeat = 0;
    this.backupTimer = 0;
    this.spikeStripDeployed = false;
  }
}
