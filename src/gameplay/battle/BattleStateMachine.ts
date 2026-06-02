/**
 * Battle State Machine - TXR Style SP Battle System
 * Manages battle states from challenge to resolution
 */

import { SPGauge } from './SPGauge';
import { RivalCar } from '../../entities/RivalCar';
import { PlayerCar } from '../../entities/PlayerCar';

export enum BattleState {
  SEARCHING = 'SEARCHING',           // Looking for rivals on highway
  CHALLENGE_INITIATED = 'CHALLENGE_INITIATED', // Player flashed headlights at rival
  COUNTDOWN = 'COUNTDOWN',           // 3-2-1 Go! before battle starts
  BATTLE_ACTIVE = 'BATTLE_ACTIVE',   // SP battle in progress
  WIN = 'WIN',                       // Player won the battle
  LOSE = 'LOSE',                     // Player lost the battle
  COOLDOWN = 'COOLDOWN',             // Battle ended, waiting for reset
}

export interface BattleConfig {
  countdownDuration: number;       // Seconds for countdown
  cooldownDuration: number;        // Seconds after battle ends
  minChallengeDistance: number;    // Minimum distance to challenge rival
  maxChallengeDistance: number;    // Maximum distance to challenge rival
  winSPThreshold: number;          // SP remaining to count as win
}

export const DEFAULT_BATTLE_CONFIG: BattleConfig = {
  countdownDuration: 3.0,
  cooldownDuration: 5.0,
  minChallengeDistance: 5,
  maxChallengeDistance: 30,
  winSPThreshold: 100,
};

export interface BattleResult {
  won: boolean;
  spRemaining: number;
  rivalDefeated: string;
  rewardsEarned: number;
}

export class BattleStateMachine {
  public currentState: BattleState;
  public playerGauge: SPGauge;
  public rivalGauge: SPGauge;
  
  private config: BattleConfig;
  private stateTimer: number;
  private countdownValue: number;
  private activeRival: RivalCar | null;
  private player: PlayerCar | null;
  private battleResult: BattleResult | null;
  private onStateChange?: (state: BattleState) => void;

  constructor(config: Partial<BattleConfig> = {}) {
    this.config = { ...DEFAULT_BATTLE_CONFIG, ...config };
    this.currentState = BattleState.SEARCHING;
    this.playerGauge = new SPGauge();
    this.rivalGauge = new SPGauge();
    this.stateTimer = 0;
    this.countdownValue = 3;
    this.activeRival = null;
    this.player = null;
    this.battleResult = null;
  }

  setStateChangeCallback(callback: (state: BattleState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Update state machine
   * @param deltaTime - Time elapsed in seconds
   * @param currentTime - Current game time in seconds
   */
  update(deltaTime: number, currentTime: number): void {
    this.stateTimer += deltaTime;

    switch (this.currentState) {
      case BattleState.SEARCHING:
        this.updateSearching(deltaTime);
        break;
      case BattleState.CHALLENGE_INITIATED:
        this.updateChallengeInitiated(deltaTime);
        break;
      case BattleState.COUNTDOWN:
        this.updateCountdown(deltaTime);
        break;
      case BattleState.BATTLE_ACTIVE:
        this.updateBattleActive(deltaTime, currentTime);
        break;
      case BattleState.WIN:
      case BattleState.LOSE:
        this.updateBattleEnded(deltaTime);
        break;
      case BattleState.COOLDOWN:
        this.updateCooldown(deltaTime);
        break;
    }
  }

  private updateSearching(_deltaTime: number): void {
    // Waiting for player to challenge a rival
    // State changed externally via challengeRival()
  }

  private updateChallengeInitiated(deltaTime: number): void {
    // Wait briefly before starting countdown
    if (this.stateTimer >= 0.5) {
      this.startCountdown();
    }
  }

  private updateCountdown(deltaTime: number): void {
    const countdownInterval = this.config.countdownDuration / 3;
    const newCountdownValue = Math.ceil((this.config.countdownDuration - this.stateTimer) / countdownInterval);
    
    if (newCountdownValue !== this.countdownValue && newCountdownValue > 0) {
      this.countdownValue = newCountdownValue;
    }

    if (this.stateTimer >= this.config.countdownDuration) {
      this.startBattle();
    }
  }

  private updateBattleActive(deltaTime: number, currentTime: number): void {
    if (!this.player || !this.activeRival) return;

    // Calculate distance gap
    const playerPos = this.player.getPosition();
    const rivalPos = this.activeRival.data.position;
    const distanceGap = playerPos.z - rivalPos.z; // Positive = player behind
    const isLeading = distanceGap < 0;

    // Update both gauges
    this.playerGauge.update(deltaTime, isLeading ? -Math.abs(distanceGap) : Math.abs(distanceGap), isLeading);
    
    // Rival AI SP calculation
    const rivalDistanceGap = isLeading ? Math.abs(distanceGap) : -Math.abs(distanceGap);
    this.rivalGauge.update(deltaTime, rivalDistanceGap, !isLeading);

    // Check for collisions (would be called from collision system)
    // this.playerGauge.applyCollisionPenalty(currentTime);

    // Check win/lose conditions
    if (this.playerGauge.isDepleted()) {
      this.endBattle(false);
    } else if (this.rivalGauge.isDepleted()) {
      this.endBattle(true);
    }
  }

  private updateBattleEnded(_deltaTime: number): void {
    // Wait for result acknowledgment before cooldown
    if (this.stateTimer >= 2.0) {
      this.currentState = BattleState.COOLDOWN;
      this.stateTimer = 0;
      this.onStateChange?.(this.currentState);
    }
  }

  private updateCooldown(deltaTime: number): void {
    if (this.stateTimer >= this.config.cooldownDuration) {
      this.reset();
    }
  }

  /**
   * Initiate challenge to a rival (headlight flash)
   */
  challengeRival(rival: RivalCar, player: PlayerCar): boolean {
    if (this.currentState !== BattleState.SEARCHING) {
      return false;
    }

    const distance = player.getPosition().distanceTo(rival.data.position);
    if (distance < this.config.minChallengeDistance || distance > this.config.maxChallengeDistance) {
      return false;
    }

    this.activeRival = rival;
    this.player = player;
    this.currentState = BattleState.CHALLENGE_INITIATED;
    this.stateTimer = 0;
    this.countdownValue = 3;
    
    // Initialize rival gauge based on difficulty
    const diffConfig = { 
      EASY: 800, 
      MEDIUM: 1000, 
      HARD: 1200, 
      EXTREME: 1500 
    }[rival.data.difficulty] || 1000;
    
    this.rivalGauge = new SPGauge({ maxSP: diffConfig });
    
    this.onStateChange?.(this.currentState);
    return true;
  }

  private startCountdown(): void {
    this.currentState = BattleState.COUNTDOWN;
    this.stateTimer = 0;
    this.countdownValue = 3;
    this.onStateChange?.(this.currentState);
  }

  private startBattle(): void {
    this.currentState = BattleState.BATTLE_ACTIVE;
    this.stateTimer = 0;
    this.playerGauge.startDepleting();
    this.rivalGauge.startDepleting();
    this.onStateChange?.(this.currentState);
  }

  private endBattle(playerWon: boolean): void {
    this.currentState = playerWon ? BattleState.WIN : BattleState.LOSE;
    this.stateTimer = 0;
    this.playerGauge.stopDepleting();
    this.rivalGauge.stopDepleting();

    const spRemaining = this.playerGauge.getCurrent();
    const rewards = playerWon ? Math.floor(spRemaining / 10) : 0;

    this.battleResult = {
      won: playerWon,
      spRemaining,
      rivalDefeated: this.activeRival?.data.id ?? 'unknown',
      rewardsEarned: rewards,
    };

    this.onStateChange?.(this.currentState);
  }

  /**
   * Reset state machine to searching state
   */
  reset(): void {
    this.currentState = BattleState.SEARCHING;
    this.stateTimer = 0;
    this.countdownValue = 3;
    this.activeRival = null;
    this.player = null;
    this.battleResult = null;
    this.playerGauge.reset();
    this.rivalGauge.reset();
    this.onStateChange?.(this.currentState);
  }

  /**
   * Get current countdown value (3, 2, 1, GO!)
   */
  getCountdownValue(): number {
    return this.countdownValue;
  }

  /**
   * Get battle progress (0-1)
   */
  getBattleProgress(): number {
    if (!this.activeRival) return 0;
    return this.playerGauge.getPercentage();
  }

  /**
   * Get rival battle progress (0-1)
   */
  getRivalProgress(): number {
    return this.rivalGauge.getPercentage();
  }

  /**
   * Get current battle result
   */
  getResult(): BattleResult | null {
    return this.battleResult;
  }

  /**
   * Get active rival
   */
  getActiveRival(): RivalCar | null {
    return this.activeRival;
  }

  /**
   * Check if battle is active
   */
  isBattleActive(): boolean {
    return this.currentState === BattleState.BATTLE_ACTIVE;
  }

  /**
   * Apply collision penalty to player
   */
  applyPlayerCollision(currentTime: number): void {
    if (this.currentState === BattleState.BATTLE_ACTIVE) {
      this.playerGauge.applyCollisionPenalty(currentTime);
    }
  }

  /**
   * Get current state
   */
  getState(): BattleState {
    return this.currentState;
  }
}
