/**
 * Battle Manager - Tokyo Xtreme Racer Style
 * Orchestrates SP battles between player and rivals
 * Integrates SPGauge, BattleStateMachine, and collision detection
 */

import * as THREE from 'three';
import { SPGauge, SPGaugeConfig } from './SPGauge';
import { 
  BattleStateMachine, 
  BattleState, 
  BattleParticipant, 
  BattleResult,
  BattleEvent 
} from './BattleStateMachine';
import { PerformanceMonitor } from '../engine/core/PerformanceMonitor';

export interface BattleManagerConfig {
  /** SP gauge configuration for player */
  playerSPConfig: Partial<SPGaugeConfig>;
  /** SP gauge configuration for rivals */
  rivalSPConfig: Partial<SPGaugeConfig>;
  /** Enable collision penalties */
  enableCollisionPenalties: boolean;
  /** Auto-start battle when challenge accepted */
  autoStartBattle: boolean;
}

const DEFAULT_CONFIG: BattleManagerConfig = {
  playerSPConfig: {
    maxSP: 1000,
    baseDrainRate: 2.5,
  },
  rivalSPConfig: {
    maxSP: 1000,
    baseDrainRate: 2.5,
  },
  enableCollisionPenalties: true,
  autoStartBattle: true,
};

export interface ActiveBattle {
  player: BattleParticipant;
  rival: BattleParticipant;
  stateMachine: BattleStateMachine;
  startTime: number;
}

export interface CollisionInfo {
  type: 'wall' | 'traffic' | 'rival';
  severity: number; // 0-1
  position: THREE.Vector3;
  timestamp: number;
}

export class BattleManager {
  private config: BattleManagerConfig;
  private performanceMonitor: PerformanceMonitor;
  
  // Current active battle
  private activeBattle: ActiveBattle | null = null;
  
  // Battle history
  private battleHistory: BattleResult[] = [];
  
  // Collision tracking
  private recentCollisions: CollisionInfo[] = [];
  
  // Callbacks
  private onBattleStart?: (battle: ActiveBattle) => void;
  private onBattleEnd?: (result: BattleResult) => void;
  private onSPChanged?: (participant: string, currentSP: number, maxSP: number) => void;
  private onStateChanged?: (state: BattleState) => void;
  
  constructor(config: Partial<BattleManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  /**
   * Initialize a battle with a rival
   */
  initiateChallenge(rivalId: string, rivalName: string, rivalPosition: THREE.Vector3): void {
    if (this.activeBattle !== null) {
      console.warn('Battle already in progress');
      return;
    }
    
    // Create player SP gauge
    const playerSPGauge = new SPGauge(this.config.playerSPConfig);
    const rivalSPGauge = new SPGauge(this.config.rivalSPConfig);
    
    // Create participants
    const player: BattleParticipant = {
      id: 'player',
      name: 'Player',
      spGauge: playerSPGauge,
      position: { x: 0, z: 0 },
      speed: 0,
      isPlayer: true,
    };
    
    const rival: BattleParticipant = {
      id: rivalId,
      name: rivalName,
      spGauge: rivalSPGauge,
      position: { x: rivalPosition.x, z: rivalPosition.z },
      speed: 0,
      isPlayer: false,
    };
    
    // Create state machine
    const stateMachine = new BattleStateMachine();
    stateMachine.setupBattle(player, rival);
    
    // Setup callbacks
    this.setupBattleCallbacks(stateMachine, playerSPGauge, rivalSPGauge);
    
    // Create active battle
    this.activeBattle = {
      player,
      rival,
      stateMachine,
      startTime: Date.now(),
    };
    
    // Initiate challenge event
    stateMachine.handleEvent({ type: 'INITIATE_CHALLENGE', rivalId });
  }
  
  /**
   * Update battle manager
   */
  update(
    deltaTime: number,
    playerPosition: THREE.Vector3,
    playerSpeed: number,
    rivalPosition: THREE.Vector3 | null,
    rivalSpeed: number
  ): void {
    this.performanceMonitor.beginFrame();
    
    if (!this.activeBattle) {
      this.performanceMonitor.endFrame();
      return;
    }
    
    const { player, rival, stateMachine } = this.activeBattle;
    
    // Update participant positions and speeds
    player.position = { x: playerPosition.x, z: playerPosition.z };
    player.speed = playerSpeed;
    
    if (rivalPosition) {
      rival.position = { x: rivalPosition.x, z: rivalPosition.z };
      rival.speed = rivalSpeed;
    }
    
    // Check for collisions
    const hasCollision = this.checkCollisions(deltaTime);
    
    // Update state machine
    stateMachine.update(deltaTime);
    
    // Update SP gauges if battle is active
    if (stateMachine.isBattleActive() && rivalPosition) {
      const collisionType = hasCollision ? this.getCollisionType() : undefined;
      
      player.spGauge.update(
        deltaTime,
        player.position,
        rival.position,
        hasCollision,
        collisionType
      );
      
      rival.spGauge.update(
        deltaTime,
        rival.position,
        player.position,
        false // Rivals don't get collision penalties in this implementation
      );
    }
    
    // Cleanup finished battles
    if (stateMachine.getState() === BattleState.COOLDOWN) {
      const cooldownRemaining = stateMachine.getCooldownRemaining();
      if (cooldownRemaining <= 0) {
        this.endActiveBattle();
      }
    }
    
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Accept a challenge (called when rival accepts)
   */
  acceptChallenge(): void {
    if (!this.activeBattle) return;
    
    this.activeBattle.stateMachine.handleEvent({ type: 'RIVAL_ACCEPTED' });
    
    if (this.config.autoStartBattle) {
      this.startCountdown();
    }
  }
  
  /**
   * Reject a challenge
   */
  rejectChallenge(): void {
    if (!this.activeBattle) return;
    
    this.activeBattle.stateMachine.handleEvent({ type: 'RIVAL_REJECTED' });
    this.endActiveBattle();
  }
  
  /**
   * Start the countdown
   */
  startCountdown(): void {
    if (!this.activeBattle) return;
    
    this.activeBattle.stateMachine.handleEvent({ type: 'START_COUNTDOWN' });
    
    if (this.onStateChanged) {
      this.onStateChanged(BattleState.COUNTDOWN);
    }
  }
  
  /**
   * Forfeit the current battle
   */
  forfeit(): void {
    if (!this.activeBattle) return;
    
    this.activeBattle.stateMachine.handleEvent({ type: 'PLAYER_FORFEIT' });
  }
  
  /**
   * Record a collision
   */
  recordCollision(type: 'wall' | 'traffic' | 'rival', position: THREE.Vector3, severity: number = 1.0): void {
    const collision: CollisionInfo = {
      type,
      severity: Math.max(0, Math.min(1, severity)),
      position: position.clone(),
      timestamp: Date.now(),
    };
    
    this.recentCollisions.push(collision);
    
    // Apply immediate SP penalty if battle is active
    if (this.activeBattle && this.config.enableCollisionPenalties) {
      const spPenalty = type === 'wall' ? 150 : 75;
      this.activeBattle.player.spGauge.addSP(-spPenalty * severity);
    }
    
    // Cleanup old collisions
    const now = Date.now();
    this.recentCollisions = this.recentCollisions.filter(c => now - c.timestamp < 2000);
  }
  
  /**
   * Get current battle state
   */
  getBattleState(): BattleState | null {
    return this.activeBattle?.stateMachine.getState() ?? null;
  }
  
  /**
   * Check if battle is active
   */
  isBattleActive(): boolean {
    return this.activeBattle?.stateMachine.isBattleActive() ?? false;
  }
  
  /**
   * Check if in cooldown
   */
  isInCooldown(): boolean {
    return this.activeBattle?.stateMachine.isInCooldown() ?? false;
  }
  
  /**
   * Get remaining cooldown time
   */
  getCooldownRemaining(): number {
    return this.activeBattle?.stateMachine.getCooldownRemaining() ?? 0;
  }
  
  /**
   * Get countdown remaining
   */
  getCountdownRemaining(): number {
    return this.activeBattle?.stateMachine.getCountdownRemaining() ?? 0;
  }
  
  /**
   * Get player SP percentage
   */
  getPlayerSPPercentage(): number {
    return this.activeBattle?.player.spGauge.getPercentage() ?? 1.0;
  }
  
  /**
   * Get rival SP percentage
   */
  getRivalSPPercentage(): number {
    return this.activeBattle?.rival.spGauge.getPercentage() ?? 1.0;
  }
  
  /**
   * Get distance gap to rival
   */
  getDistanceGap(): number {
    if (!this.activeBattle) return 0;
    
    const { player, rival } = this.activeBattle;
    return Math.abs(player.position.z - rival.position.z);
  }
  
  /**
   * Check if player is leading
   */
  isPlayerLeading(): boolean {
    if (!this.activeBattle) return false;
    
    const { player, rival } = this.activeBattle;
    return player.position.z < rival.position.z;
  }
  
  /**
   * Get battle duration
   */
  getBattleDuration(): number {
    return this.activeBattle?.stateMachine.getBattleDuration() ?? 0;
  }
  
  /**
   * Get active battle info
   */
  getActiveBattle(): ActiveBattle | null {
    return this.activeBattle;
  }
  
  /**
   * Get battle history
   */
  getBattleHistory(): BattleResult[] {
    return [...this.battleHistory];
  }
  
  /**
   * Get total wins
   */
  getTotalWins(): number {
    return this.battleHistory.filter(b => b.playerWon).length;
  }
  
  /**
   * Get total losses
   */
  getTotalLosses(): number {
    return this.battleHistory.filter(b => !b.playerWon).length;
  }
  
  /**
   * Get win rate
   */
  getWinRate(): number {
    if (this.battleHistory.length === 0) return 0;
    return this.getTotalWins() / this.battleHistory.length;
  }
  
  /**
   * Reset battle manager
   */
  reset(): void {
    this.activeBattle = null;
    this.recentCollisions = [];
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.reset();
  }
  
  // ==========================================================================
  // CALLBACK REGISTRATION
  // ==========================================================================
  
  onBattleStartEvent(callback: (battle: ActiveBattle) => void): void {
    this.onBattleStart = callback;
  }
  
  onBattleEndEvent(callback: (result: BattleResult) => void): void {
    this.onBattleEnd = callback;
  }
  
  onSPChange(callback: (participant: string, currentSP: number, maxSP: number) => void): void {
    this.onSPChanged = callback;
  }
  
  onStateChange(callback: (state: BattleState) => void): void {
    this.onStateChanged = callback;
  }
  
  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Setup battle callbacks
   */
  private setupBattleCallbacks(
    stateMachine: BattleStateMachine,
    playerSPGauge: SPGauge,
    rivalSPGauge: SPGauge
  ): void {
    // State changes
    stateMachine.onStateChange((oldState, newState) => {
      if (this.onStateChanged) {
        this.onStateChanged(newState);
      }
      
      // Handle battle start
      if (newState === BattleState.BATTLE_ACTIVE && this.onBattleStart && this.activeBattle) {
        this.onBattleStart(this.activeBattle);
      }
    });
    
    // Battle end
    stateMachine.onBattleEndEvent((result) => {
      this.battleHistory.push(result);
      
      if (this.onBattleEnd) {
        this.onBattleEnd(result);
      }
    });
    
    // SP changes
    playerSPGauge.onSPChange((currentSP, maxSP) => {
      if (this.onSPChanged) {
        this.onSPChanged('player', currentSP, maxSP);
      }
    });
    
    rivalSPGauge.onSPChange((currentSP, maxSP) => {
      if (this.onSPChanged) {
        this.onSPChanged('rival', currentSP, maxSP);
      }
    });
  }
  
  /**
   * Check for recent collisions
   */
  private checkCollisions(deltaTime: number): boolean {
    if (!this.config.enableCollisionPenalties) return false;
    if (this.recentCollisions.length === 0) return false;
    
    const now = Date.now();
    const validCollisions = this.recentCollisions.filter(c => now - c.timestamp < 500);
    
    return validCollisions.length > 0;
  }
  
  /**
   * Get the most recent collision type
   */
  private getCollisionType(): 'wall' | 'traffic' | undefined {
    if (this.recentCollisions.length === 0) return undefined;
    
    const mostRecent = this.recentCollisions[this.recentCollisions.length - 1];
    return mostRecent.type === 'rival' ? undefined : mostRecent.type;
  }
  
  /**
   * End the active battle
   */
  private endActiveBattle(): void {
    this.activeBattle = null;
    this.recentCollisions = [];
  }
}

export default BattleManager;
