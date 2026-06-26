/**
 * Unit Tests: Currency & Purchase System
 * Tests for coin management, car purchases, and game over rewards
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CarStats, INITIAL_CARS } from '../../src/config/gameConfig';

// Mock the currency/purchase logic extracted from App.tsx
interface GameState {
  coins: number;
  highScore: number;
  cars: CarStats[];
  totalRaces: number;
}

class CurrencySystem {
  private state: GameState;

  constructor(initialState: Partial<GameState> = {}) {
    this.state = {
      coins: initialState.coins ?? 0,
      highScore: initialState.highScore ?? 0,
      cars: initialState.cars ?? JSON.parse(JSON.stringify(INITIAL_CARS)),
      totalRaces: initialState.totalRaces ?? 0,
    };
  }

  getState(): GameState {
    return { ...this.state };
  }

  getCoins(): number {
    return this.state.coins;
  }

  getHighScore(): number {
    return this.state.highScore;
  }

  getCars(): CarStats[] {
    return [...this.state.cars];
  }

  getTotalRaces(): number {
    return this.state.totalRaces;
  }

  buyCar(index: number): { success: boolean; reason?: string } {
    const car = this.state.cars[index];
    
    if (!car) {
      return { success: false, reason: 'Car does not exist' };
    }
    
    if (car.unlocked) {
      return { success: false, reason: 'Car already unlocked' };
    }
    
    if (this.state.coins < car.price) {
      return { success: false, reason: 'Insufficient coins' };
    }
    
    // Atomic update
    this.state.coins -= car.price;
    this.state.cars = this.state.cars.map((c, i) => 
      i === index ? { ...c, unlocked: true } : c
    );
    
    return { success: true };
  }

  handleGameOver(score: number): { earnedCoins: number; newHighScore: boolean; newTotalRaces: number } {
    const earnedCoins = Math.floor(score / 10);
    const distanceBonus = Math.floor(score / 10);
    const totalEarned = earnedCoins + distanceBonus;
    
    const newCoins = this.state.coins + totalEarned;
    const newHighScore = Math.max(this.state.highScore, score);
    const highScoreBeaten = score > this.state.highScore;
    const newTotalRaces = this.state.totalRaces + 1;
    
    this.state.coins = newCoins;
    this.state.highScore = newHighScore;
    this.state.totalRaces = newTotalRaces;
    
    return {
      earnedCoins: totalEarned,
      newHighScore: highScoreBeaten,
      newTotalRaces,
    };
  }

  canAchieveNegativeCoins(): boolean {
    return this.state.coins < 0;
  }
}

describe('CurrencySystem', () => {
  describe('Car Purchase Flow', () => {
    it('should successfully buy a car when affordable', () => {
      const system = new CurrencySystem({ coins: 1000 });
      
      // First car after starter is Urban Runner at 500 coins
      const result = system.buyCar(1);
      
      expect(result.success).toBe(true);
      expect(system.getCoins()).toBe(500);
      expect(system.getCars()[1].unlocked).toBe(true);
    });

    it('should fail to buy when coins insufficient', () => {
      const system = new CurrencySystem({ coins: 400 });
      
      const result = system.buyCar(1); // Urban Runner costs 500
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Insufficient coins');
      expect(system.getCoins()).toBe(400);
      expect(system.getCars()[1].unlocked).toBe(false);
    });

    it('should fail to buy when already unlocked', () => {
      const cars = JSON.parse(JSON.stringify(INITIAL_CARS));
      cars[1].unlocked = true;
      const system = new CurrencySystem({ coins: 1000, cars });
      
      const result = system.buyCar(1);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Car already unlocked');
      expect(system.getCoins()).toBe(1000);
    });

    it('should fail to buy non-existent car', () => {
      const system = new CurrencySystem({ coins: 1000 });
      
      const result = system.buyCar(999);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Car does not exist');
    });

    it('should prevent negative coin balance', () => {
      const system = new CurrencySystem({ coins: 500 });
      
      system.buyCar(1); // Costs exactly 500
      expect(system.getCoins()).toBe(0);
      expect(system.canAchieveNegativeCoins()).toBe(false);
      
      // Try to buy another car with 0 coins
      system.buyCar(2); // Highway Cruiser costs 1500
      expect(system.getCoins()).toBe(0);
      expect(system.canAchieveNegativeCoins()).toBe(false);
    });

    it('should handle exact coin amount purchase', () => {
      const system = new CurrencySystem({ coins: 500 });
      
      const result = system.buyCar(1);
      
      expect(result.success).toBe(true);
      expect(system.getCoins()).toBe(0);
    });

    it('should handle multiple sequential purchases', () => {
      const system = new CurrencySystem({ coins: 5000 });
      
      system.buyCar(1); // 500
      expect(system.getCoins()).toBe(4500);
      
      system.buyCar(2); // 1500
      expect(system.getCoins()).toBe(3000);
      
      system.buyCar(3); // 3500 - should fail
      expect(system.getCoins()).toBe(3000);
      
      system.buyCar(4); // 5000 - should fail
      expect(system.getCoins()).toBe(3000);
    });

    it('should update only the purchased car', () => {
      const system = new CurrencySystem({ coins: 1000 });
      
      system.buyCar(1);
      
      const cars = system.getCars();
      expect(cars[1].unlocked).toBe(true);
      expect(cars[0].unlocked).toBe(true); // Starter car
      expect(cars[2].unlocked).toBe(false);
      expect(cars[3].unlocked).toBe(false);
    });
  });

  describe('Game Over Rewards', () => {
    it('should calculate coins correctly from score', () => {
      const system = new CurrencySystem({ coins: 100 });
      
      const result = system.handleGameOver(3500);
      
      // earnedCoins = floor(3500/10) + floor(3500/10) = 350 + 350 = 700
      expect(result.earnedCoins).toBe(700);
      expect(system.getCoins()).toBe(800);
    });

    it('should update high score only when beaten', () => {
      const system = new CurrencySystem({ coins: 100, highScore: 5000 });
      
      // Score lower than high score
      let result = system.handleGameOver(3500);
      expect(result.newHighScore).toBe(false);
      expect(system.getHighScore()).toBe(5000);
      
      // Score beats high score
      result = system.handleGameOver(6000);
      expect(result.newHighScore).toBe(true);
      expect(system.getHighScore()).toBe(6000);
      
      // Score equals high score (no update)
      result = system.handleGameOver(6000);
      expect(result.newHighScore).toBe(false);
      expect(system.getHighScore()).toBe(6000);
    });

    it('should increment total races on each game over', () => {
      const system = new CurrencySystem({ totalRaces: 0 });
      
      system.handleGameOver(1000);
      expect(system.getTotalRaces()).toBe(1);
      
      system.handleGameOver(2000);
      expect(system.getTotalRaces()).toBe(2);
      
      system.handleGameOver(0);
      expect(system.getTotalRaces()).toBe(3);
    });

    it('should handle zero score game over', () => {
      const system = new CurrencySystem({ coins: 100, highScore: 5000 });
      
      const result = system.handleGameOver(0);
      
      expect(result.earnedCoins).toBe(0);
      expect(system.getCoins()).toBe(100);
      expect(result.newHighScore).toBe(false);
    });

    it('should handle very high scores', () => {
      const system = new CurrencySystem({ coins: 0, highScore: 0 });
      
      const result = system.handleGameOver(999999);
      
      // earnedCoins = floor(999999/10) + floor(999999/10) = 99999 + 99999 = 199998
      expect(result.earnedCoins).toBe(199998);
      expect(system.getCoins()).toBe(199998);
      expect(result.newHighScore).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty coins (0)', () => {
      const system = new CurrencySystem({ coins: 0 });
      
      const result = system.buyCar(1);
      
      expect(result.success).toBe(false);
      expect(result.reason).toBe('Insufficient coins');
    });

    it('should handle large coin amounts', () => {
      const system = new CurrencySystem({ coins: 1000000 });
      
      const result = system.buyCar(7); // No-Hesi King costs 20000
      
      expect(result.success).toBe(true);
      expect(system.getCoins()).toBe(980000);
    });

    it('should handle fractional score division', () => {
      const system = new CurrencySystem({ coins: 0 });
      
      // Score that doesn't divide evenly
      system.handleGameOver(3507);
      
      // floor(3507/10) = 350, so total = 350 + 350 = 700
      expect(system.getCoins()).toBe(700);
    });

    it('should maintain car array integrity after purchase', () => {
      const system = new CurrencySystem({ coins: 1000 });
      
      const initialLength = system.getCars().length;
      system.buyCar(1);
      
      expect(system.getCars().length).toBe(initialLength);
      expect(system.getCars()).toHaveLength(8);
    });

    it('should not modify input cars array', () => {
      const cars = JSON.parse(JSON.stringify(INITIAL_CARS));
      const originalCars = JSON.parse(JSON.stringify(cars));
      const system = new CurrencySystem({ coins: 1000, cars });
      
      system.buyCar(1);
      
      // Original array should be unchanged
      expect(cars[1].unlocked).toBe(originalCars[1].unlocked);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle buy then game over flow', () => {
      const system = new CurrencySystem({ coins: 1000, highScore: 0 });
      
      // Buy a car
      system.buyCar(1); // 500 coins
      expect(system.getCoins()).toBe(500);
      
      // Play and crash
      system.handleGameOver(2000);
      expect(system.getCoins()).toBe(900); // 500 + 400
      
      // Buy another car
      system.buyCar(2); // 1500 coins - should fail
      expect(system.getCoins()).toBe(900);
      
      // Play more
      system.handleGameOver(5000);
      expect(system.getCoins()).toBe(1900); // 900 + 1000
      
      // Now can afford
      system.buyCar(2);
      expect(system.getCoins()).toBe(400);
    });

    it('should handle game over then buy flow', () => {
      const system = new CurrencySystem({ coins: 100, highScore: 0 });
      
      // Play first
      system.handleGameOver(4000);
      expect(system.getCoins()).toBe(900); // 100 + 800
      
      // Buy car
      system.buyCar(1);
      expect(system.getCoins()).toBe(400);
      
      // Play again
      system.handleGameOver(1000);
      expect(system.getCoins()).toBe(600);
    });

    it('should track progression across multiple sessions', () => {
      const system = new CurrencySystem({ coins: 0, highScore: 0, totalRaces: 0 });
      
      // Session 1
      system.handleGameOver(1500);
      expect(system.getCoins()).toBe(300);
      expect(system.getTotalRaces()).toBe(1);
      
      // Session 2
      system.handleGameOver(2500);
      expect(system.getCoins()).toBe(800);
      expect(system.getTotalRaces()).toBe(2);
      
      // Buy car
      system.buyCar(1);
      expect(system.getCoins()).toBe(300);
      
      // Session 3
      system.handleGameOver(5000);
      expect(system.getCoins()).toBe(1300);
      expect(system.getTotalRaces()).toBe(3);
      expect(system.getHighScore()).toBe(5000);
    });
  });
});
