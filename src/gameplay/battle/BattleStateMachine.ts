/**
 * Battle State Machine - Tokyo Xtreme Racer Style
 * Manages battle states: Searching, ChallengeInitiated, Countdown, BattleActive, Win, Lose, Cooldown
 */

import { SPGauge, SPState } from './SPGauge';

export enum BattleState {
  /** Looking for rivals to challenge */
  SEARCHING = 'SEARCHING',
  /** Player has initiated a challenge (headlight flash) */
  CHALLENGE_INITIATED = 'CHALLENGE_INITIATED',
  /** Waiting for rival response */
  WAITING_RESPONSE = 'WAITING_RESPONSE',
  /** Pre-race countdown */
  COUNTDOWN = 'COUNTDOWN',
  /** Battle is actively running */
  BATTLE_ACTIVE = 'BATTLE_ACTIVE',
  /** Player won the battle */
  WIN = 'WIN',
  /** Player lost the battle */
  LOSE = 'LOSE',
  /** Post-battle cooldown before next challenge */
  COOLDOWN = 'COOLDOWN',
}

export interface BattleConfig {
  /** Time in seconds for countdown */
  countdownDuration: number;
  /** Time in seconds for cooldown after battle */
  cooldownDuration: number;
  /** Time to wait for rival response */
  responseTimeout: number;
  /** Minimum distance to start battle */
  minStartDistance: number;
  /** Maximum distance before battle forfeit */
  maxBattleDistance: number;
}

const DEFAULT_CONFIG: BattleConfig = {
  countdownDuration: 3.0,
  cooldownDuration: 10.0,
  responseTimeout: 5.0,
  minStartDistance: 30.0,
  maxBattleDistance: 100.0,
};

export interface BattleParticipant {
  id: string;
  name: string;
  spGauge: SPGauge;
  position: { x: number; z: number };
  speed: number;
  isPlayer: boolean;
}

export interface BattleResult {
  winner: string;
  loser: string;
  reason: 'sp_depleted' | 'forfeit' | 'timeout' | 'collision';
  duration: number;
  finalDistanceGap: number;
  playerWon: boolean;
}

export type BattleEvent = 
  | { type: 'SEARCH_RIVAL' }
  | { type: 'INITIATE_CHALLENGE'; rivalId: string }
  | { type: 'RIVAL_ACCEPTED' }
  | { type: 'RIVAL_REJECTED' }
  | { type: 'RESPONSE_TIMEOUT' }
  | { type: 'START_COUNTDOWN' }
  | { type: 'COUNTDOWN_COMPLETE' }
  | { type: 'BATTLE_START' }
  | { type: 'PLAYER_SP_DEPLETED' }
  | { type: 'RIVAL_SP_DEPLETED' }
  | { type: 'PLAYER_FORFEIT' }
  | { type: 'RIVAL_FORFEIT' }
  | { type: 'BATTLE_END'; result: BattleResult }
  | { type: 'COOLDOWN_COMPLETE' };

export class BattleStateMachine {
  private currentState: BattleState;
  private config: BattleConfig;
  
  // Battle participants
  private player: BattleParticipant | null = null;
  private rival: BattleParticipant | null = null;
  
  // Timing
  private stateTimer: number = 0;
  private countdownTimer: number = 0;
  private battleStartTime: number = 0;
  
  // Battle tracking
  private maxDistanceReached: number = 0;
  private battleDuration: number = 0;
  
  // Callbacks
  private onStateChanged?: (oldState: BattleState, newState: BattleState) => void;
  private onCountdownTick?: (remaining: number) => void;
  private onBattleEnd?: (result: BattleResult) => void;
  private onEventReceived?: (event: BattleEvent) => void;
  
  constructor(config: Partial<BattleConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentState = BattleState.SEARCHING;
  }
  
  /**
   * Process an event and transition state
   */
  handleEvent(event: BattleEvent): boolean {
    if (this.onEventReceived) {
      this.onEventReceived(event);
    }
    
    const oldState = this.currentState;
    let handled = true;
    
    switch (this.currentState) {
      case BattleState.SEARCHING:
        handled = this.handleSearchingState(event);
        break;
      case BattleState.CHALLENGE_INITIATED:
        handled = this.handleChallengeInitiatedState(event);
        break;
      case BattleState.WAITING_RESPONSE:
        handled = this.handleWaitingResponseState(event);
        break;
      case BattleState.COUNTDOWN:
        handled = this.handleCountdownState(event);
        break;
      case BattleState.BATTLE_ACTIVE:
        handled = this.handleBattleActiveState(event);
        break;
      case BattleState.WIN:
      case BattleState.LOSE:
        handled = this.handleTerminalState(event);
        break;
      case BattleState.COOLDOWN:
        handled = this.handleCooldownState(event);
        break;
    }
    
    if (handled && oldState !== this.currentState && this.onStateChanged) {
      this.onStateChanged(oldState, this.currentState);
    }
    
    return handled;
  }
  
  /**
   * Update state machine with delta time
   */
  update(deltaTime: number): void {
    this.stateTimer += deltaTime;
    
    switch (this.currentState) {
      case BattleState.CHALLENGE_INITIATED:
      case BattleState.WAITING_RESPONSE:
        // Check for response timeout
        if (this.stateTimer >= this.config.responseTimeout) {
          this.handleEvent({ type: 'RESPONSE_TIMEOUT' });
        }
        break;
        
      case BattleState.COUNTDOWN:
        this.countdownTimer -= deltaTime;
        if (this.onCountdownTick) {
          this.onCountdownTick(Math.max(0, this.countdownTimer));
        }
        if (this.countdownTimer <= 0) {
          this.handleEvent({ type: 'COUNTDOWN_COMPLETE' });
        }
        break;
        
      case BattleState.BATTLE_ACTIVE:
        this.battleDuration += deltaTime;
        this.updateBattleConditions(deltaTime);
        break;
        
      case BattleState.COOLDOWN:
        if (this.stateTimer >= this.config.cooldownDuration) {
          this.handleEvent({ type: 'COOLDOWN_COMPLETE' });
        }
        break;
    }
  }
  
  /**
   * Set up battle participants
   */
  setupBattle(player: BattleParticipant, rival: BattleParticipant): void {
    this.player = player;
    this.rival = rival;
    this.maxDistanceReached = 0;
    this.battleDuration = 0;
  }
  
  /**
   * Get current battle state
   */
  getState(): BattleState {
    return this.currentState;
  }
  
  /**
   * Check if battle is active
   */
  isBattleActive(): boolean {
    return this.currentState === BattleState.BATTLE_ACTIVE;
  }
  
  /**
   * Check if in cooldown
   */
  isInCooldown(): boolean {
    return this.currentState === BattleState.COOLDOWN;
  }
  
  /**
   * Get remaining cooldown time
   */
  getCooldownRemaining(): number {
    if (this.currentState !== BattleState.COOLDOWN) {
      return 0;
    }
    return Math.max(0, this.config.cooldownDuration - this.stateTimer);
  }
  
  /**
   * Get countdown remaining
   */
  getCountdownRemaining(): number {
    if (this.currentState !== BattleState.COUNTDOWN) {
      return 0;
    }
    return Math.max(0, this.countdownTimer);
  }
  
  /**
   * Get current battle duration
   */
  getBattleDuration(): number {
    return this.battleDuration;
  }
  
  /**
   * Get max distance reached during battle
   */
  getMaxDistanceReached(): number {
    return this.maxDistanceReached;
  }
  
  /**
   * Force state transition (for debugging/testing)
   */
  forceState(state: BattleState): void {
    const oldState = this.currentState;
    this.currentState = state;
    
    if (this.onStateChanged) {
      this.onStateChanged(oldState, state);
    }
  }
  
  /**
   * Reset state machine
   */
  reset(): void {
    this.currentState = BattleState.SEARCHING;
    this.player = null;
    this.rival = null;
    this.stateTimer = 0;
    this.countdownTimer = 0;
    this.battleStartTime = 0;
    this.maxDistanceReached = 0;
    this.battleDuration = 0;
  }
  
  // ==========================================================================
  // STATE HANDLERS
  // ==========================================================================
  
  private handleSearchingState(event: BattleEvent): boolean {
    switch (event.type) {
      case 'INITIATE_CHALLENGE':
        this.currentState = BattleState.CHALLENGE_INITIATED;
        this.stateTimer = 0;
        return true;
    }
    return false;
  }
  
  private handleChallengeInitiatedState(event: BattleEvent): boolean {
    switch (event.type) {
      case 'RIVAL_ACCEPTED':
        this.currentState = BattleState.WAITING_RESPONSE;
        this.stateTimer = 0;
        return true;
      case 'RIVAL_REJECTED':
        // Return to searching
        this.currentState = BattleState.SEARCHING;
        return true;
      case 'RESPONSE_TIMEOUT':
        this.currentState = BattleState.SEARCHING;
        return true;
    }
    return false;
  }
  
  private handleWaitingResponseState(event: BattleEvent): boolean {
    switch (event.type) {
      case 'START_COUNTDOWN':
        this.currentState = BattleState.COUNTDOWN;
        this.countdownTimer = this.config.countdownDuration;
        return true;
      case 'RIVAL_REJECTED':
        this.currentState = BattleState.SEARCHING;
        return true;
      case 'RESPONSE_TIMEOUT':
        this.currentState = BattleState.SEARCHING;
        return true;
    }
    return false;
  }
  
  private handleCountdownState(event: BattleEvent): boolean {
    switch (event.type) {
      case 'COUNTDOWN_COMPLETE':
        this.currentState = BattleState.BATTLE_ACTIVE;
        this.battleStartTime = Date.now();
        return true;
    }
    return false;
  }
  
  private handleBattleActiveState(event: BattleEvent): boolean {
    switch (event.type) {
      case 'PLAYER_SP_DEPLETED':
        this.currentState = BattleState.LOSE;
        this.endBattle('sp_depleted', false);
        return true;
      case 'RIVAL_SP_DEPLETED':
        this.currentState = BattleState.WIN;
        this.endBattle('sp_depleted', true);
        return true;
      case 'PLAYER_FORFEIT':
        this.currentState = BattleState.LOSE;
        this.endBattle('forfeit', false);
        return true;
      case 'RIVAL_FORFEIT':
        this.currentState = BattleState.WIN;
        this.endBattle('forfeit', true);
        return true;
    }
    return false;
  }
  
  private handleTerminalState(event: BattleEvent): boolean {
    switch (event.type) {
      case 'BATTLE_END':
        this.currentState = BattleState.COOLDOWN;
        this.stateTimer = 0;
        return true;
    }
    return false;
  }
  
  private handleCooldownState(event: BattleEvent): boolean {
    switch (event.type) {
      case 'COOLDOWN_COMPLETE':
        this.currentState = BattleState.SEARCHING;
        this.stateTimer = 0;
        return true;
    }
    return false;
  }
  
  // ==========================================================================
  // BATTLE LOGIC
  // ==========================================================================
  
  /**
   * Update battle conditions (distance checks, SP depletion)
   */
  private updateBattleConditions(deltaTime: number): void {
    if (!this.player || !this.rival) return;
    
    // Calculate distance
    const distance = Math.abs(this.player.position.z - this.rival.position.z);
    this.maxDistanceReached = Math.max(this.maxDistanceReached, distance);
    
    // Check for forfeit due to distance
    if (distance > this.config.maxBattleDistance) {
      // Determine who is behind (they forfeit)
      const playerBehind = this.player.position.z > this.rival.position.z;
      
      if (playerBehind) {
        this.handleEvent({ type: 'PLAYER_FORFEIT' });
      } else {
        this.handleEvent({ type: 'RIVAL_FORFEIT' });
      }
      return;
    }
    
    // Check SP depletion
    if (this.player.spGauge.isDepleted()) {
      this.handleEvent({ type: 'PLAYER_SP_DEPLETED' });
    } else if (this.rival.spGauge.isDepleted()) {
      this.handleEvent({ type: 'RIVAL_SP_DEPLETED' });
    }
    
    // Update SP gauges
    const hasCollision = false; // Would be passed from collision system
    this.player.spGauge.update(deltaTime, this.player.position, this.rival.position, hasCollision);
    this.rival.spGauge.update(deltaTime, this.rival.position, this.player.position, hasCollision);
  }
  
  /**
   * End the battle and create result
   */
  private endBattle(reason: BattleResult['reason'], playerWon: boolean): void {
    if (!this.player || !this.rival) return;
    
    const distanceGap = Math.abs(this.player.position.z - this.rival.position.z);
    
    const result: BattleResult = {
      winner: playerWon ? this.player.id : this.rival.id,
      loser: playerWon ? this.rival.id : this.player.id,
      reason,
      duration: this.battleDuration,
      finalDistanceGap: distanceGap,
      playerWon,
    };
    
    if (this.onBattleEnd) {
      this.onBattleEnd(result);
    }
    
    // Transition to COOLDOWN
    this.handleEvent({ type: 'BATTLE_END', result });
  }
  
  // ==========================================================================
  // CALLBACK REGISTRATION
  // ==========================================================================
  
  onStateChange(callback: (oldState: BattleState, newState: BattleState) => void): void {
    this.onStateChanged = callback;
  }
  
  onCountdown(callback: (remaining: number) => void): void {
    this.onCountdownTick = callback;
  }
  
  onBattleEndEvent(callback: (result: BattleResult) => void): void {
    this.onBattleEnd = callback;
  }
  
  onEvent(callback: (event: BattleEvent) => void): void {
    this.onEventReceived = callback;
  }
}

export default BattleStateMachine;
