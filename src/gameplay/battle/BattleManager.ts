/**
 * Battle Manager - Coordinates SP battles between player and rivals
 * Integrates with game systems for complete battle flow
 */

import { BattleStateMachine, BattleState, BattleResult, BattleConfig } from './BattleStateMachine';
import { SPGauge } from './SPGauge';
import { RivalCar } from '../../entities/RivalCar';
import { PlayerCar } from '../../entities/PlayerCar';
import { RivalManager } from '../rivals/RivalManager';

export interface BattleManagerConfig extends BattleConfig {
  enableRubberBanding: boolean;    // AI catches up when behind
  rubberBandStrength: number;      // How aggressively AI catches up
}

export const DEFAULT_BATTLE_MANAGER_CONFIG: BattleManagerConfig = {
  countdownDuration: 3.0,
  cooldownDuration: 5.0,
  minChallengeDistance: 5,
  maxChallengeDistance: 30,
  winSPThreshold: 100,
  enableRubberBanding: true,
  rubberBandStrength: 0.02,
};

export type BattleEvent = 
  | { type: 'CHALLENGE_STARTED'; rivalId: string }
  | { type: 'COUNTDOWN'; value: number }
  | { type: 'BATTLE_STARTED'; rivalId: string }
  | { type: 'BATTLE_UPDATE'; playerSP: number; rivalSP: number; distanceGap: number }
  | { type: 'BATTLE_ENDED'; result: BattleResult }
  | { type: 'COOLDOWN_COMPLETE' };

export class BattleManager {
  private stateMachine: BattleStateMachine;
  private config: BattleManagerConfig;
  private rivalManager: RivalManager | null;
  private eventListeners: Set<(event: BattleEvent) => void>;
  private battleStartTime: number;
  private totalBattles: number;
  private totalWins: number;

  constructor(config: Partial<BattleManagerConfig> = {}) {
    this.config = { ...DEFAULT_BATTLE_MANAGER_CONFIG, ...config };
    this.stateMachine = new BattleStateMachine(this.config);
    this.rivalManager = null;
    this.eventListeners = new Set();
    this.battleStartTime = 0;
    this.totalBattles = 0;
    this.totalWins = 0;

    // Hook into state changes
    this.stateMachine.setStateChangeCallback(this.onStateChanged.bind(this));
  }

  setRivalManager(manager: RivalManager): void {
    this.rivalManager = manager;
  }

  subscribeEvents(listener: (event: BattleEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private emitEvent(event: BattleEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  private onStateChanged(state: BattleState): void {
    switch (state) {
      case BattleState.COUNTDOWN:
        this.emitEvent({
          type: 'COUNTDOWN',
          value: this.stateMachine.getCountdownValue(),
        });
        break;
      case BattleState.BATTLE_ACTIVE:
        this.battleStartTime = performance.now() / 1000;
        const rival = this.stateMachine.getActiveRival();
        if (rival) {
          this.emitEvent({
            type: 'BATTLE_STARTED',
            rivalId: rival.data.id,
          });
        }
        break;
      case BattleState.WIN:
      case BattleState.LOSE:
        const result = this.stateMachine.getResult();
        if (result) {
          this.totalBattles++;
          if (result.won) this.totalWins++;
          this.emitEvent({ type: 'BATTLE_ENDED', result });
        }
        break;
      case BattleState.COOLDOWN:
        setTimeout(() => {
          this.emitEvent({ type: 'COOLDOWN_COMPLETE' });
        }, this.config.cooldownDuration * 1000);
        break;
    }
  }

  /**
   * Update battle manager
   */
  update(deltaTime: number, currentTime: number, player: PlayerCar): void {
    this.stateMachine.update(deltaTime, currentTime);

    // Emit battle updates during active battle
    if (this.stateMachine.isBattleActive()) {
      const rival = this.stateMachine.getActiveRival();
      if (rival) {
        const playerPos = player.getPosition();
        const rivalPos = rival.data.position;
        const distanceGap = playerPos.z - rivalPos.z;

        this.emitEvent({
          type: 'BATTLE_UPDATE',
          playerSP: this.stateMachine.getBattleProgress() * 100,
          rivalSP: this.stateMachine.getRivalProgress() * 100,
          distanceGap,
        });

        // Apply rubber banding to rival AI
        if (this.config.enableRubberBanding) {
          this.applyRubberBanding(rival, distanceGap, deltaTime);
        }
      }
    }
  }

  private applyRubberBanding(rival: RivalCar, distanceGap: number, deltaTime: number): void {
    // If rival is too far behind, give them a speed boost
    if (distanceGap > 50) {
      rival.data.speed += this.config.rubberBandStrength * deltaTime * 60;
    }
    // If rival is too far ahead, slow them down slightly
    else if (distanceGap < -50) {
      rival.data.speed *= 1 - (this.config.rubberBandStrength * deltaTime);
    }
  }

  /**
   * Challenge a rival via headlight flash
   */
  challengeRival(rival: RivalCar, player: PlayerCar): boolean {
    const success = this.stateMachine.challengeRival(rival, player);
    if (success) {
      this.emitEvent({ type: 'CHALLENGE_STARTED', rivalId: rival.data.id });
      
      // Notify rival they've been challenged
      if (this.rivalManager) {
        this.rivalManager.notifyChallenge(rival.data.id);
      }
    }
    return success;
  }

  /**
   * Check if player can challenge a rival
   */
  canChallengeRival(rival: RivalCar, player: PlayerCar): boolean {
    if (this.stateMachine.getState() !== BattleState.SEARCHING) {
      return false;
    }

    const distance = player.getPosition().distanceTo(rival.data.position);
    return (
      distance >= this.config.minChallengeDistance &&
      distance <= this.config.maxChallengeDistance
    );
  }

  /**
   * Apply collision penalty during battle
   */
  applyCollisionPenalty(currentTime: number): void {
    this.stateMachine.applyPlayerCollision(currentTime);
  }

  /**
   * Get current battle state
   */
  getState(): BattleState {
    return this.stateMachine.getState();
  }

  /**
   * Get battle progress (0-1)
   */
  getProgress(): number {
    return this.stateMachine.getBattleProgress();
  }

  /**
   * Get rival progress (0-1)
   */
  getRivalProgress(): number {
    return this.stateMachine.getRivalProgress();
  }

  /**
   * Get countdown value
   */
  getCountdown(): number {
    return this.stateMachine.getCountdownValue();
  }

  /**
   * Get current battle result
   */
  getResult(): BattleResult | null {
    return this.stateMachine.getResult();
  }

  /**
   * Check if battle is active
   */
  isBattleActive(): boolean {
    return this.stateMachine.isBattleActive();
  }

  /**
   * Get active rival
   */
  getActiveRival(): RivalCar | null {
    return this.stateMachine.getActiveRival();
  }

  /**
   * Get battle statistics
   */
  getStats(): { totalBattles: number; totalWins: number; winRate: number } {
    return {
      totalBattles: this.totalBattles,
      totalWins: this.totalWins,
      winRate: this.totalBattles > 0 ? this.totalWins / this.totalBattles : 0,
    };
  }

  /**
   * Reset battle manager
   */
  reset(): void {
    this.stateMachine.reset();
  }

  /**
   * Get player SP gauge
   */
  getPlayerGauge(): SPGauge {
    return this.stateMachine.playerGauge;
  }

  /**
   * Get rival SP gauge
   */
  getRivalGauge(): SPGauge {
    return this.stateMachine.rivalGauge;
  }
}
