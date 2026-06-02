/**
 * AI Manager - Manages all rival AI components and coordinates behavior
 */

import { AIComponent, AIState } from './AIComponent';
import { RivalCar } from '../../entities/RivalCar';
import { PlayerCar } from '../../entities/PlayerCar';
import { BattleManager } from '../battle/BattleManager';

export interface AIManagerConfig {
  maxActiveAI: number;
  updateDistanceThreshold: number; // Only update AI within this distance of player
  enableRubberBanding: boolean;
  rubberBandStrength: number;
}

export const DEFAULT_AI_MANAGER_CONFIG: AIManagerConfig = {
  maxActiveAI: 8,
  updateDistanceThreshold: 100,
  enableRubberBanding: true,
  rubberBandStrength: 0.02,
};

export interface AIUpdateResult {
  rivalId: string;
  state: AIState;
  position: { x: number; z: number };
  speed: number;
}

export class AIManager {
  private config: AIManagerConfig;
  private aiComponents: Map<string, AIComponent>;
  private battleManager: BattleManager | null;
  private activeAI: Set<string>;
  private updateResults: AIUpdateResult[];

  constructor(config: Partial<AIManagerConfig> = {}) {
    this.config = { ...DEFAULT_AI_MANAGER_CONFIG, ...config };
    this.aiComponents = new Map();
    this.battleManager = null;
    this.activeAI = new Set();
    this.updateResults = [];
  }

  setBattleManager(manager: BattleManager): void {
    this.battleManager = manager;
  }

  /**
   * Register an AI component for a rival
   */
  registerRival(rival: RivalCar, aggression?: number, skill?: number): AIComponent {
    const ai = new AIComponent({
      aggression: aggression ?? 0.5,
      skill: skill ?? 0.5,
    });
    
    ai.bindEntity(rival);
    this.aiComponents.set(rival.data.id, ai);
    
    return ai;
  }

  /**
   * Get AI component for a rival
   */
  getAI(rivalId: string): AIComponent | null {
    return this.aiComponents.get(rivalId) || null;
  }

  /**
   * Remove AI component
   */
  removeAI(rivalId: string): void {
    this.aiComponents.delete(rivalId);
    this.activeAI.delete(rivalId);
  }

  /**
   * Update all AI components
   */
  update(deltaTime: number, player: PlayerCar, currentTime: number): AIUpdateResult[] {
    this.updateResults = [];
    const playerPos = player.getPosition();
    const playerSpeed = player.getSpeed();

    // Determine which AIs to update based on distance
    for (const [rivalId, ai] of this.aiComponents.entries()) {
      const rival = ai.getEntity();
      if (!rival) continue;

      const distanceToPlayer = Math.abs(rival.data.position.z - playerPos.z);
      
      // Check if within update range
      if (distanceToPlayer > this.config.updateDistanceThreshold) {
        this.activeAI.delete(rivalId);
        continue;
      }

      this.activeAI.add(rivalId);

      // Get SP gauge if in battle
      let spGauge = undefined;
      if (this.battleManager?.isBattleActive()) {
        const activeRival = this.battleManager.getActiveRival();
        if (activeRival?.data.id === rivalId) {
          spGauge = {
            current: this.battleManager.getPlayerGauge().getCurrent(),
            max: this.battleManager.getPlayerGauge().maxSP,
          };
        }
      }

      // Update AI
      ai.update(deltaTime, playerPos, playerSpeed, spGauge);

      // Apply rubber banding if enabled
      if (this.config.enableRubberBanding && ai.isInBattle()) {
        this.applyRubberBanding(ai, playerPos, deltaTime);
      }

      // Record update result
      this.updateResults.push({
        rivalId,
        state: ai.getState(),
        position: { ...rival.data.position },
        speed: rival.data.speed,
      });
    }

    return this.updateResults;
  }

  private applyRubberBanding(ai: AIComponent, playerPos: { x: number; z: number }, 
                              deltaTime: number): void {
    const rival = ai.getEntity();
    if (!rival) return;

    const distanceGap = rival.data.position.z - playerPos.z;

    // If rival is too far behind, give speed boost
    if (distanceGap > 50) {
      rival.data.speed += this.config.rubberBandStrength * deltaTime * 60;
    }
    // If rival is too far ahead, slow down slightly
    else if (distanceGap < -50) {
      rival.data.speed *= 1 - (this.config.rubberBandStrength * deltaTime);
    }
  }

  /**
   * Start battle for a specific rival
   */
  startBattle(rivalId: string): void {
    const ai = this.aiComponents.get(rivalId);
    if (ai) {
      ai.startBattle();
    }
  }

  /**
   * End battle for a specific rival
   */
  endBattle(rivalId: string, playerWon: boolean): void {
    const ai = this.aiComponents.get(rivalId);
    if (ai) {
      ai.endBattle(playerWon);
    }
  }

  /**
   * Get all active AI IDs
   */
  getActiveAIIds(): string[] {
    return Array.from(this.activeAI);
  }

  /**
   * Get count of active AI
   */
  getActiveCount(): number {
    return this.activeAI.size;
  }

  /**
   * Get total registered AI count
   */
  getTotalCount(): number {
    return this.aiComponents.size;
  }

  /**
   * Get AI states summary
   */
  getStateSummary(): Record<AIState, number> {
    const summary: Record<AIState, number> = {
      CRUISING: 0,
      APPROACHING_PLAYER: 0,
      ACCEPTING_CHALLENGE: 0,
      SP_BATTLE: 0,
      RETREATING: 0,
      BLOCKING: 0,
      ATTACKING: 0,
    };

    for (const ai of this.aiComponents.values()) {
      const state = ai.getState();
      summary[state]++;
    }

    return summary;
  }

  /**
   * Set aggression for a rival
   */
  setAggression(rivalId: string, aggression: number): void {
    const ai = this.aiComponents.get(rivalId);
    if (ai) {
      // Note: Would need to expose setter in AIComponent or recreate
      ai.bindEntity(ai.getEntity()!);
    }
  }

  /**
   * Clear all AI
   */
  clear(): void {
    this.aiComponents.clear();
    this.activeAI.clear();
    this.updateResults = [];
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.clear();
  }
}
