/**
 * Player Car Entity
 * Handles player vehicle physics, movement, and state
 */

import * as THREE from 'three';
import { PHYSICS_CONFIG } from '../config/gameConfig';
import { InputAxis } from '../core/InputHandler';

export interface PlayerCarState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speed: number;
  steerAngle: number;
  slipAngle: number;
  grip: number;
  nitrous: number;
  isNitrousActive: boolean;
  nitrousCooldown: number;
  health: number;
  maxHealth: number;
}

export class PlayerCar {
  public mesh: THREE.Group;
  public state: PlayerCarState;
  
  private carStats: {
    speed: number;
    handling: number;
    acceleration: number;
    grip: number;
  };

  constructor(mesh: THREE.Group, carStats: PlayerCarState['position'] extends THREE.Vector3 ? {
    speed: number;
    handling: number;
    acceleration: number;
    grip: number;
  } : never) {
    this.mesh = mesh;
    this.carStats = carStats as unknown as { speed: number; handling: number; acceleration: number; grip: number };
    
    this.state = {
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      speed: 0,
      steerAngle: 0,
      slipAngle: 0,
      grip: PHYSICS_CONFIG.GRIP_BASE,
      nitrous: PHYSICS_CONFIG.NITROUS_CAPACITY,
      isNitrousActive: false,
      nitrousCooldown: 0,
      health: 100,
      maxHealth: 100,
    };
  }

  update(axis: InputAxis, dt: number): void {
    const { state, carStats } = this;

    // Nitrous management
    this.updateNitrous(dt);

    // Calculate effective max speed
    const maxSpeed = state.isNitrousActive 
      ? PHYSICS_CONFIG.NITROUS_MAX_SPEED * carStats.speed
      : PHYSICS_CONFIG.MAX_SPEED * carStats.speed;

    // Acceleration / Deceleration
    if (axis.throttle > 0) {
      const accel = PHYSICS_CONFIG.ACCELERATION_BASE * carStats.acceleration;
      const nitrousBonus = state.isNitrousActive ? PHYSICS_CONFIG.ACCELERATION_NITROUS : 0;
      state.speed = Math.min(state.speed + (accel + nitrousBonus) * axis.throttle, maxSpeed);
    } else if (axis.brake > 0) {
      state.speed = Math.max(state.speed - PHYSICS_CONFIG.BRAKE_FORCE * axis.brake, 0);
    } else {
      // Natural deceleration
      state.speed = Math.max(state.speed - PHYSICS_CONFIG.DECELERATION_FRICTION, 0);
    }

    // Steering with speed-based sensitivity
    const steerSpeed = state.speed > 1.5 
      ? PHYSICS_CONFIG.STEER_SPEED_HIGH * carStats.handling
      : PHYSICS_CONFIG.STEER_SPEED_BASE * carStats.handling;
    
    if (axis.steer !== 0) {
      state.steerAngle += axis.steer * steerSpeed;
      state.steerAngle = THREE.MathUtils.clamp(
        state.steerAngle,
        -PHYSICS_CONFIG.MAX_STEER_ANGLE,
        PHYSICS_CONFIG.MAX_STEER_ANGLE
      );
    } else {
      // Return to center
      state.steerAngle += -state.steerAngle * PHYSICS_CONFIG.STEER_RETURN_RATE;
    }

    // Calculate slip angle based on steering and speed
    const targetSlipAngle = state.steerAngle * state.speed * 0.5;
    state.slipAngle += (targetSlipAngle - state.slipAngle) * state.grip * dt * 10;

    // Apply grip modifier from car stats
    state.grip = PHYSICS_CONFIG.GRIP_BASE * carStats.grip;

    // Update velocity based on speed and steering
    const forwardDir = new THREE.Vector3(0, 0, -1);
    forwardDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.slipAngle);
    
    state.velocity.copy(forwardDir.multiplyScalar(state.speed));

    // Update position
    state.position.add(state.velocity.clone().multiplyScalar(dt * 60));

    // Apply lateral movement from steering
    const lateralMove = state.steerAngle * state.speed * 0.3 * carStats.handling;
    state.position.x += lateralMove * dt * 60;

    // Update mesh position
    this.mesh.position.copy(state.position);
    
    // Apply visual rotation based on steering
    const visualRotation = state.steerAngle * state.speed * 0.5;
    this.mesh.rotation.y = visualRotation;
    this.mesh.rotation.z = -state.steerAngle * state.speed * 0.3;
    
    // Pitch based on acceleration
    const accelPitch = (axis.throttle - axis.brake) * state.speed * 0.05;
    this.mesh.rotation.x = accelPitch;
  }

  private updateNitrous(dt: number): void {
    const { state } = this;

    if (state.nitrousCooldown > 0) {
      state.nitrousCooldown -= dt;
      state.isNitrousActive = false;
    } else if (state.isNitrousActive) {
      state.nitrous -= PHYSICS_CONFIG.NITROUS_DRAIN_RATE;
      
      if (state.nitrous <= 0) {
        state.nitrous = 0;
        state.isNitrousActive = false;
        state.nitrousCooldown = PHYSICS_CONFIG.NITROUS_COOLDOWN;
      }
    } else {
      // Refill nitrous when not active
      state.nitrous = Math.min(state.nitrous + PHYSICS_CONFIG.NITROUS_REFILL_RATE, PHYSICS_CONFIG.NITROUS_CAPACITY);
    }
  }

  activateNitrous(): void {
    if (this.state.nitrous > 0 && this.state.nitrousCooldown <= 0) {
      this.state.isNitrousActive = true;
    }
  }

  deactivateNitrous(): void {
    this.state.isNitrousActive = false;
  }

  takeCollisionPenalty(): void {
    this.state.speed *= PHYSICS_CONFIG.COLLISION_PENALTY_SPEED;
    this.state.health -= 20;
    this.state.nitrousCooldown = PHYSICS_CONFIG.COLLISION_PENALTY_TIME;
  }

  getPosition(): THREE.Vector3 {
    return this.state.position.clone();
  }

  getSpeed(): number {
    return this.state.speed;
  }

  getNitrousLevel(): number {
    return this.state.nitrous;
  }

  isNitrousReady(): boolean {
    return this.state.nitrous > 0 && this.state.nitrousCooldown <= 0;
  }

  reset(position?: THREE.Vector3): void {
    this.state.position.copy(position ?? new THREE.Vector3(0, 0, 0));
    this.state.velocity.set(0, 0, 0);
    this.state.speed = 0;
    this.state.steerAngle = 0;
    this.state.slipAngle = 0;
    this.state.nitrous = PHYSICS_CONFIG.NITROUS_CAPACITY;
    this.state.isNitrousActive = false;
    this.state.nitrousCooldown = 0;
    this.state.health = this.state.maxHealth;
    
    this.mesh.position.copy(this.state.position);
    this.mesh.rotation.set(0, 0, 0);
  }
}
