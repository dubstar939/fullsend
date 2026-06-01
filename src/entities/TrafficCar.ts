/**
 * Traffic Vehicle Entity
 * Handles AI-controlled traffic cars with lane-changing behavior
 */

import * as THREE from 'three';
import { TRAFFIC_CONFIG } from '../config/gameConfig';

export interface TrafficCarData {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  speed: number;
  targetSpeed: number;
  lane: number;
  targetLane: number | null;
  vehicleClass: keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES;
  isLaneChanging: boolean;
  laneChangeProgress: number;
  reactionDelay: number;
  hasBlindSpot: boolean;
}

export class TrafficCar {
  public data: TrafficCarData;
  private laneChangeTimer: number = 0;
  private blindSpotCheckTimer: number = 0;

  constructor(
    mesh: THREE.Group,
    lane: number,
    zPosition: number,
    vehicleClass: keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES = 'SEDAN'
  ) {
    const classConfig = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicleClass];
    const [speedMin, speedMax] = classConfig.speedVar;
    const baseSpeed = speedMin + Math.random() * (speedMax - speedMin);

    this.data = {
      id: `traffic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mesh,
      position: new THREE.Vector3(lane * TRAFFIC_CONFIG.LANE_WIDTH, 0, zPosition),
      speed: baseSpeed,
      targetSpeed: baseSpeed,
      lane,
      targetLane: null,
      vehicleClass,
      isLaneChanging: false,
      laneChangeProgress: 0,
      reactionDelay: TRAFFIC_CONFIG.REACTION_DELAY[0] + 
        Math.random() * (TRAFFIC_CONFIG.REACTION_DELAY[1] - TRAFFIC_CONFIG.REACTION_DELAY[0]),
      hasBlindSpot: TRAFFIC_CONFIG.BLIND_SPOT_CHECK,
    };

    mesh.position.copy(this.data.position);
  }

  update(dt: number, playerZ: number, playerX: number): void {
    const { data } = this;

    // Only update if within active range
    const distanceToPlayer = Math.abs(data.position.z - playerZ);
    if (distanceToPlayer > TRAFFIC_CONFIG.SPAWN_AHEAD_DISTANCE + 50) {
      return;
    }

    // Speed variation
    if (Math.random() < 0.01) {
      const [speedMin, speedMax] = TRAFFIC_CONFIG.VEHICLE_CLASSES[data.vehicleClass].speedVar;
      data.targetSpeed = speedMin + Math.random() * (speedMax - speedMin);
    }

    // Smooth speed transitions
    data.speed += (data.targetSpeed - data.speed) * 0.02;

    // Lane changing logic
    this.updateLaneChange(dt, playerX);

    // Update position
    data.position.z -= data.speed * 60 * dt;

    // Apply lane change interpolation
    if (data.isLaneChanging && data.targetLane !== null) {
      data.laneChangeProgress += dt * 0.5;
      
      if (data.laneChangeProgress >= 1) {
        data.lane = data.targetLane;
        data.isLaneChanging = false;
        data.targetLane = null;
        data.laneChangeProgress = 0;
      } else {
        // Smooth lane transition
        const currentLaneX = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
        const targetLaneX = data.targetLane * TRAFFIC_CONFIG.LANE_WIDTH;
        const t = this.easeInOutCubic(data.laneChangeProgress);
        data.position.x = currentLaneX + (targetLaneX - currentLaneX) * t;
      }
    } else {
      data.position.x = data.lane * TRAFFIC_CONFIG.LANE_WIDTH;
    }

    // Update mesh
    data.mesh.position.copy(data.position);
    
    // Slight rotation during lane changes
    if (data.isLaneChanging) {
      const turnDirection = data.targetLane! > data.lane ? 1 : -1;
      data.mesh.rotation.y = turnDirection * 0.1 * (1 - data.laneChangeProgress);
    } else {
      data.mesh.rotation.y = 0;
    }
  }

  private updateLaneChange(dt: number, playerX: number): void {
    const { data } = this;

    if (data.isLaneChanging) {
      return;
    }

    this.laneChangeTimer += dt;
    this.blindSpotCheckTimer += dt;

    // Check lane change opportunity
    if (this.laneChangeTimer < 2 / TRAFFIC_CONFIG.LANE_CHANGE_PROBABILITY) {
      return;
    }

    this.laneChangeTimer = 0;

    // Random chance to consider lane change
    if (Math.random() > TRAFFIC_CONFIG.LANE_CHANGE_PROBABILITY * 2) {
      return;
    }

    // Determine potential lanes
    const possibleLanes: number[] = [];
    if (data.lane > -TRAFFIC_CONFIG.LANE_COUNT / 2) possibleLanes.push(data.lane - 1);
    if (data.lane < TRAFFIC_CONFIG.LANE_COUNT / 2 - 1) possibleLanes.push(data.lane + 1);

    if (possibleLanes.length === 0) {
      return;
    }

    // Check for player in target lane (blind spot check)
    if (data.hasBlindSpot && this.blindSpotCheckTimer < 0.5) {
      return;
    }
    this.blindSpotCheckTimer = 0;

    for (const targetLane of possibleLanes) {
      const targetLaneX = targetLane * TRAFFIC_CONFIG.LANE_WIDTH;
      
      // Check if player is in this lane and close
      const playerInLane = Math.abs(playerX - targetLaneX) < 2;
      const playerAhead = data.position.z < playerX + 20 && data.position.z > playerX - 20;

      if (playerInLane && playerAhead) {
        // Player is in the way - don't change lane
        continue;
      }

      // Valid lane change found
      data.targetLane = targetLane;
      data.isLaneChanging = true;
      data.laneChangeProgress = 0;
      break;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  isActive(playerZ: number): boolean {
    const despawnDistance = TRAFFIC_CONFIG.DESPAWN_BEHIND_DISTANCE;
    return data.position.z > playerZ - despawnDistance;
  }

  getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
    const [width, height, length] = TRAFFIC_CONFIG.VEHICLE_CLASSES[this.data.vehicleClass].size;
    const pos = this.data.position;
    
    return {
      min: new THREE.Vector3(pos.x - width / 2, pos.y, pos.z - length / 2),
      max: new THREE.Vector3(pos.x + width / 2, pos.y + height, pos.z + length / 2),
    };
  }

  dispose(): void {
    this.data.mesh.removeFromParent();
  }
}
