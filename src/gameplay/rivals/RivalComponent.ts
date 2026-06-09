/**
 * Rival Component - Tokyo Xtreme Racer Style
 * Defines rival properties, stats, behavior, and club affiliation
 */

import { RivalStats, RivalRole, WandererCondition } from '../types/ClubSystem';

export enum RivalAggression {
  PASSIVE = 'PASSIVE',
  NORMAL = 'NORMAL',
  AGGRESSIVE = 'AGGRESSIVE',
  EXTREME = 'EXTREME',
}

export interface RivalComponentData {
  id: string;
  name: string;
  clubId: string | null;
  carModel: string;
  stats: RivalStats;
  role: RivalRole;
  aggression: RivalAggression;
  spawnZones: string[];
  activeTimeRange: [number, number]; // Hour range (0-24)
  wandererConditions: WandererCondition[];
  isDefeated: boolean;
  defeatCount: number;
  lastEncounterTime: number;
}

export interface RivalBehaviorConfig {
  /** How closely rival follows player */
  followTendency: number; // 0-1
  /** Likelihood to accept challenge */
  challengeAcceptRate: number; // 0-1
  /** SP drain resistance */
  spResistance: number; // 0-1
  /** Speed when cruising */
  cruiseSpeed: number;
  /** Speed during battle */
  battleSpeed: number;
  /** Reaction time to player actions */
  reactionTime: number; // seconds
}

const DEFAULT_BEHAVIOR: RivalBehaviorConfig = {
  followTendency: 0.5,
  challengeAcceptRate: 0.8,
  spResistance: 0.5,
  cruiseSpeed: 0.6,
  battleSpeed: 1.0,
  reactionTime: 0.3,
};

export class RivalComponent {
  private data: RivalComponentData;
  private behavior: RivalBehaviorConfig;
  
  // Runtime state
  private currentPosition: { x: number; z: number } = { x: 0, z: 0 };
  private currentSpeed: number = 0;
  private currentLane: number = 0;
  private isChallenging: boolean = false;
  private isInBattle: boolean = false;
  
  constructor(data: Partial<RivalComponentData>) {
    this.data = {
      id: data.id ?? `rival_${Date.now()}`,
      name: data.name ?? 'Unknown Rival',
      clubId: data.clubId ?? null,
      carModel: data.carModel ?? 'unknown',
      stats: data.stats ?? {
        speed: 50,
        aggression: 50,
        skill: 50,
        spResistance: 50,
        stamina: 50,
      },
      role: data.role ?? 'MEMBER',
      aggression: data.aggression ?? RivalAggression.NORMAL,
      spawnZones: data.spawnZones ?? [],
      activeTimeRange: data.activeTimeRange ?? [0, 24],
      wandererConditions: data.wandererConditions ?? [],
      isDefeated: data.isDefeated ?? false,
      defeatCount: data.defeatCount ?? 0,
      lastEncounterTime: data.lastEncounterTime ?? 0,
    };
    
    this.behavior = { ...DEFAULT_BEHAVIOR };
    this.applyStatsToBehavior();
  }
  
  /**
   * Update rival component
   */
  update(deltaTime: number, playerPosition: { x: number; z: number }, playerSpeed: number): void {
    if (this.isInBattle) {
      this.updateBattleBehavior(deltaTime, playerPosition, playerSpeed);
    } else if (this.isChallenging) {
      this.updateChallengeBehavior(deltaTime, playerPosition);
    } else {
      this.updateCruisingBehavior(deltaTime, playerPosition);
    }
  }
  
  /**
   * Check if rival can be challenged
   */
  canBeChallenged(currentHour: number, playerZone: string): boolean {
    if (this.data.isDefeated && this.data.defeatCount > 0) {
      // Defeated rivals have cooldown
      const cooldownHours = 24 / Math.min(this.data.defeatCount, 3);
      const timeSinceDefeat = (Date.now() - this.data.lastEncounterTime) / (1000 * 60 * 60);
      
      if (timeSinceDefeat < cooldownHours) {
        return false;
      }
    }
    
    // Check zone
    if (!this.data.spawnZones.includes(playerZone)) {
      return false;
    }
    
    // Check time
    const [startHour, endHour] = this.data.activeTimeRange;
    const isInTimeRange = startHour <= endHour
      ? currentHour >= startHour && currentHour <= endHour
      : currentHour >= startHour || currentHour <= endHour;
    
    return isInTimeRange;
  }
  
  /**
   * Check if wanderer conditions are met
   */
  checkWandererConditions(playerState: {
    currentCarModel: string;
    currentCarColor: string;
    totalMileage: number;
    currentSpeed: number;
    currentTimeOfDay: number;
    isAlone: boolean;
    weatherCondition: string;
  }): boolean {
    if (this.data.wandererConditions.length === 0) return true;
    
    for (const condition of this.data.wandererConditions) {
      if (!this.checkCondition(condition, playerState)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Accept challenge from player
   */
  acceptChallenge(): boolean {
    if (Math.random() > this.behavior.challengeAcceptRate) {
      return false;
    }
    
    this.isChallenging = true;
    return true;
  }
  
  /**
   * Start battle
   */
  startBattle(): void {
    this.isChallenging = false;
    this.isInBattle = true;
    this.currentSpeed = this.behavior.battleSpeed;
  }
  
  /**
   * End battle
   */
  endBattle(won: boolean): void {
    this.isInBattle = false;
    this.currentSpeed = this.behavior.cruiseSpeed;
    
    if (!won) {
      this.data.isDefeated = true;
      this.data.defeatCount++;
      this.data.lastEncounterTime = Date.now();
    }
  }
  
  /**
   * Get rival data
   */
  getData(): RivalComponentData {
    return { ...this.data };
  }
  
  /**
   * Get behavior config
   */
  getBehavior(): RivalBehaviorConfig {
    return { ...this.behavior };
  }
  
  /**
   * Get current position
   */
  getPosition(): { x: number; z: number } {
    return { ...this.currentPosition };
  }
  
  /**
   * Set position
   */
  setPosition(x: number, z: number): void {
    this.currentPosition = { x, z };
  }
  
  /**
   * Get current speed
   */
  getCurrentSpeed(): number {
    return this.currentSpeed;
  }
  
  /**
   * Check if in battle
   */
  isBattleActive(): boolean {
    return this.isInBattle;
  }
  
  /**
   * Check if challenging
   */
  isChallengePending(): boolean {
    return this.isChallenging;
  }
  
  /**
   * Apply stats to behavior
   */
  private applyStatsToBehavior(): void {
    const { stats } = this.data;
    
    // Speed affects battle speed
    this.behavior.battleSpeed = 0.5 + (stats.speed / 200);
    
    // Aggression affects challenge acceptance
    this.behavior.challengeAcceptRate = 0.5 + (stats.aggression / 200);
    
    // SP resistance
    this.behavior.spResistance = stats.spResistance / 100;
    
    // Skill affects reaction time
    this.behavior.reactionTime = Math.max(0.1, 0.5 - (stats.skill / 200));
  }
  
  /**
   * Update cruising behavior
   */
  private updateCruisingBehavior(
    deltaTime: number,
    playerPosition: { x: number; z: number }
  ): void {
    // Maintain cruise speed
    this.currentSpeed = this.behavior.cruiseSpeed;
    
    // Simple lane following
    const targetLane = this.currentLane;
    const laneWidth = 4.2;
    const targetX = targetLane * laneWidth;
    
    // Smooth X movement
    this.currentPosition.x += (targetX - this.currentPosition.x) * 0.05;
    
    // Move forward
    this.currentPosition.z -= this.currentSpeed * deltaTime * 60;
  }
  
  /**
   * Update challenge behavior
   */
  private updateChallengeBehavior(
    deltaTime: number,
    playerPosition: { x: number; z: number }
  ): void {
    // Slow down to let player catch up
    this.currentSpeed = Math.max(0.3, this.behavior.cruiseSpeed * 0.7);
    
    // Move towards player's lane
    const playerLane = Math.round(playerPosition.x / 4.2);
    const targetLane = Math.max(-2, Math.min(2, playerLane));
    
    if (this.currentLane !== targetLane) {
      this.currentLane += Math.sign(targetLane - this.currentLane) * 0.02;
    }
    
    this.currentPosition.z -= this.currentSpeed * deltaTime * 60;
  }
  
  /**
   * Update battle behavior
   */
  private updateBattleBehavior(
    deltaTime: number,
    playerPosition: { x: number; z: number },
    playerSpeed: number
  ): void {
    const { stats, aggression } = this.data;
    
    // Match or exceed player speed based on stats
    const targetSpeed = playerSpeed * (0.9 + stats.speed / 200);
    this.currentSpeed += (targetSpeed - this.currentSpeed) * 0.05;
    
    // Aggressive rivals try to block
    if (aggression === RivalAggression.AGGRESSIVE || aggression === RivalAggression.EXTREME) {
      const distanceZ = this.currentPosition.z - playerPosition.z;
      
      // If close, try to move into player's lane
      if (distanceZ > -10 && distanceZ < 20) {
        const playerLane = Math.round(playerPosition.x / 4.2);
        if (this.currentLane !== playerLane) {
          this.currentLane += Math.sign(playerLane - this.currentLane) * 0.03;
        }
      }
    }
    
    // Update position
    this.currentPosition.z -= this.currentSpeed * deltaTime * 60;
    
    // Clamp lane
    this.currentLane = Math.max(-2, Math.min(2, this.currentLane));
    this.currentPosition.x = this.currentLane * 4.2;
  }
  
  /**
   * Check individual wanderer condition
   */
  private checkCondition(
    condition: WandererCondition,
    playerState: {
      currentCarModel: string;
      currentCarColor: string;
      totalMileage: number;
      currentSpeed: number;
      currentTimeOfDay: number;
      isAlone: boolean;
      weatherCondition: string;
    }
  ): boolean {
    switch (condition.type) {
      case 'carModel':
        return playerState.currentCarModel === condition.value;
      
      case 'carColor':
        return playerState.currentCarColor === condition.value;
      
      case 'minMileage':
        return playerState.totalMileage >= (condition.value as number);
      
      case 'minSpeed':
        return playerState.currentSpeed >= (condition.value as number);
      
      case 'maxSpeed':
        return playerState.currentSpeed <= (condition.value as number);
      
      case 'timeRange': {
        const [start, end] = condition.value as [number, number];
        const hour = playerState.currentTimeOfDay;
        return start <= end
          ? hour >= start && hour <= end
          : hour >= start || hour <= end;
      }
      
      case 'aloneOnHighway':
        return playerState.isAlone === condition.value;
      
      case 'weatherCondition':
        return playerState.weatherCondition === condition.value;
      
      default:
        return true;
    }
  }
}

export default RivalComponent;
