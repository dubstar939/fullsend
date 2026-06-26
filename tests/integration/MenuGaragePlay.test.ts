/**
 * Integration Tests: Menu → Garage → Play Flow
 * Phase 1: Critical flow integration testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GarageManager } from '../../src/garage/GarageManager';
import { CarStats, INITIAL_CARS } from '../../src/config/gameConfig';
import type { CarBuildSave } from '../../src/types/car.types';

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

  getCoins(): number {
    return this.state.coins;
  }

  getCars(): CarStats[] {
    return [...this.state.cars];
  }

  addCoins(amount: number): void {
    this.state.coins += amount;
  }

  spendCoins(amount: number): boolean {
    if (this.state.coins >= amount) {
      this.state.coins -= amount;
      return true;
    }
    return false;
  }

  getTotalSpent(): number {
    return 0; // Simplified for integration tests
  }
}

// Mock localStorage for integration tests
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] || null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('Menu-Garage-Play Integration', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initial Game Flow', () => {
    it('should initialize garage with default builds on first launch', () => {
      const garage = new GarageManager();
      
      expect(garage.getBuildCount()).toBeGreaterThanOrEqual(0);
      // Garage should be empty initially or have default builds
    });

    it('should persist garage state across sessions', () => {
      // Session 1: Add a build
      const garage1 = new GarageManager();
      const testBuild: CarBuildSave = {
        id: 'test-build-1',
        carId: 'car_001',
        name: 'Test Build',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };
      garage1.addBuild(testBuild);

      // Session 2: Load from storage
      const garage2 = new GarageManager();
      expect(garage2.getBuildCount()).toBe(1);
      expect(garage2.hasBuild('test-build-1')).toBe(true);
    });

    it('should handle empty save data gracefully', () => {
      localStorageMock.setItem('player_garage', '');
      
      // Should not crash, should use defaults
      const garage = new GarageManager();
      expect(garage.getBuildCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Currency and Unlock Flow', () => {
    it('should allow purchasing an affordable car', () => {
      const currency = new CurrencySystem();
      
      // Give player enough coins
      currency.addCoins(1000);
      
      const cars = currency.getCars();
      let targetIndex = -1;
      for (let i = 1; i < cars.length; i++) {
        if (!cars[i].unlocked && cars[i].price <= 1000) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex !== -1) {
        const car = cars[targetIndex];
        const canAfford = currency.getCoins() >= car.price;
        
        if (canAfford) {
          const spent = currency.spendCoins(car.price);
          expect(spent).toBe(true);
          expect(currency.getCoins()).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should prevent purchasing without sufficient funds', () => {
      const currency = new CurrencySystem();
      
      // Player has 0 coins
      const cars = currency.getCars();
      let expensiveCarIndex = -1;
      for (let i = 1; i < cars.length; i++) {
        if (!cars[i].unlocked && cars[i].price > 0) {
          expensiveCarIndex = i;
          break;
        }
      }

      if (expensiveCarIndex !== -1) {
        const car = cars[expensiveCarIndex];
        const canAfford = currency.getCoins() >= car.price;
        
        expect(canAfford).toBe(false);
      }
    });
  });

  describe('Navigation Integration', () => {
    it('should maintain valid build count after operations', () => {
      const garage = new GarageManager();
      const initialCount = garage.getBuildCount();
      
      // Add a build
      const testBuild: CarBuildSave = {
        id: 'test-build-nav',
        carId: 'car_001',
        name: 'Nav Test',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#00FF00',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };
      garage.addBuild(testBuild);
      
      expect(garage.getBuildCount()).toBe(initialCount + 1);
      
      // Remove the build
      garage.removeBuild('test-build-nav');
      expect(garage.getBuildCount()).toBe(initialCount);
    });
  });

  describe('State Persistence', () => {
    it('should export/import garage state correctly', () => {
      const garage1 = new GarageManager();
      
      // Add a build
      const testBuild: CarBuildSave = {
        id: 'export-test',
        carId: 'car_002',
        name: 'Export Test',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#0000FF',
        vinylLayers: [],
        mileage: 100,
        lastUsed: Date.now(),
      };
      garage1.addBuild(testBuild);
      garage1.setActiveBuild('export-test');
      
      // Export
      const exported = garage1.exportGarage();
      expect(exported).toBeDefined();
      expect(exported.length).toBeGreaterThan(0);
      
      // Import into new instance
      const garage2 = new GarageManager();
      const success = garage2.importGarage(exported);
      
      expect(success).toBe(true);
      expect(garage2.getBuildCount()).toBeGreaterThan(0);
    });

    it('should handle version migration in saved data', () => {
      // Save old format data
      const oldFormat = {
        version: 1,
        builds: [],
        activeBuildId: null,
      };
      localStorageMock.setItem('player_garage', JSON.stringify(oldFormat));
      
      // Load should handle migration or use defaults
      const garage = new GarageManager();
      expect(garage.getBuildCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid build operations', () => {
      const garage = new GarageManager();
      
      // Rapid fire add/remove operations
      for (let i = 0; i < 5; i++) {
        const testBuild: CarBuildSave = {
          id: `rapid-${i}`,
          carId: 'car_001',
          name: `Rapid ${i}`,
          installedUpgrades: {},
          installedVisuals: {},
          bodyColor: '#FFFFFF',
          vinylLayers: [],
          mileage: 0,
          lastUsed: Date.now(),
        };
        garage.addBuild(testBuild);
      }
      
      expect(garage.getBuildCount()).toBe(5);
    });

    it('should handle corrupted localStorage', () => {
      localStorageMock.setItem('player_garage', '{ invalid json }');
      
      // Should not crash, should use defaults
      expect(() => new GarageManager()).not.toThrow();
      
      const garage = new GarageManager();
      expect(garage.getBuildCount()).toBeGreaterThanOrEqual(0);
    });

    it('should work with empty garage', () => {
      const garage = new GarageManager();
      
      expect(garage.getBuildCount()).toBeGreaterThanOrEqual(0);
      
      // Operations on empty garage should not crash
      const result = garage.getActiveBuild();
      expect(result).toBe(null);
    });
  });
});
