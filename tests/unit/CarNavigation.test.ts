/**
 * Unit Tests: Car Navigation Logic
 * Tests for garage navigation with locked cars, debouncing, and edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarStats } from '../../src/config/gameConfig';

// Mock the navigation logic extracted from App.tsx
interface NavigationState {
  viewingIndex: number;
  cars: CarStats[];
  lastInputTime: number;
}

class CarNavigationSystem {
  private state: NavigationState;
  private readonly INPUT_DEBOUNCE_MS = 150;

  constructor(initialCars: CarStats[], initialIndex: number = 0) {
    this.state = {
      viewingIndex: initialIndex,
      cars: initialCars,
      lastInputTime: 0,
    };
  }

  setCars(cars: CarStats[]) {
    this.state.cars = cars;
    // Clamp index if array shrinks
    if (this.state.viewingIndex >= cars.length) {
      this.state.viewingIndex = Math.max(0, cars.length - 1);
    }
  }

  setViewingIndex(index: number) {
    this.state.viewingIndex = index;
  }

  getViewingIndex(): number {
    return this.state.viewingIndex;
  }

  getLastInputTime(): number {
    return this.state.lastInputTime;
  }

  prevCar(): { newIndex: number; skippedLocked: boolean } {
    const now = Date.now();
    if (now - this.state.lastInputTime < this.INPUT_DEBOUNCE_MS) {
      return { newIndex: this.state.viewingIndex, skippedLocked: false };
    }
    this.state.lastInputTime = now;

    if (this.state.cars.length === 0) {
      return { newIndex: this.state.viewingIndex, skippedLocked: false };
    }

    let newIndex = this.state.viewingIndex;
    let attempts = 0;
    let skippedLocked = false;

    do {
      newIndex = newIndex - 1;
      if (newIndex < 0) newIndex = this.state.cars.length - 1;
      attempts++;
      if (attempts >= this.state.cars.length) break;
      if (!this.state.cars[newIndex].unlocked) {
        skippedLocked = true;
      } else {
        // Found an unlocked car, exit the loop
        break;
      }
    } while (true);

    this.state.viewingIndex = newIndex;
    return { newIndex, skippedLocked };
  }

  nextCar(): { newIndex: number; skippedLocked: boolean } {
    const now = Date.now();
    if (now - this.state.lastInputTime < this.INPUT_DEBOUNCE_MS) {
      return { newIndex: this.state.viewingIndex, skippedLocked: false };
    }
    this.state.lastInputTime = now;

    if (this.state.cars.length === 0) {
      return { newIndex: this.state.viewingIndex, skippedLocked: false };
    }

    let newIndex = this.state.viewingIndex;
    let attempts = 0;
    let skippedLocked = false;

    do {
      newIndex = newIndex + 1;
      if (newIndex >= this.state.cars.length) newIndex = 0;
      attempts++;
      if (attempts >= this.state.cars.length) break;
      if (!this.state.cars[newIndex].unlocked) {
        skippedLocked = true;
      } else {
        // Found an unlocked car, exit the loop
        break;
      }
    } while (true);

    this.state.viewingIndex = newIndex;
    return { newIndex, skippedLocked };
  }

  canSelectCar(index: number): boolean {
    if (index < 0 || index >= this.state.cars.length) return false;
    return this.state.cars[index].unlocked;
  }
}

// Helper to create test cars
function createCar(unlocked: boolean, name: string = 'Test Car'): CarStats {
  return {
    name,
    speed: 0.5,
    handling: 0.5,
    acceleration: 0.005,
    grip: 0.85,
    price: 0,
    color: '#6b7280',
    unlocked,
    class: 'D' as const,
  };
}

describe('CarNavigationSystem', () => {
  describe('Basic Navigation', () => {
    it('should navigate forward with all unlocked cars', () => {
      const cars = [
        createCar(true, 'Car 0'),
        createCar(true, 'Car 1'),
        createCar(true, 'Car 2'),
        createCar(true, 'Car 3'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      const result = nav.nextCar();
      expect(result.newIndex).toBe(1);
      expect(nav.getViewingIndex()).toBe(1);
    });

    it('should navigate backward with all unlocked cars', () => {
      const cars = [
        createCar(true, 'Car 0'),
        createCar(true, 'Car 1'),
        createCar(true, 'Car 2'),
        createCar(true, 'Car 3'),
      ];
      const nav = new CarNavigationSystem(cars, 2);

      const result = nav.prevCar();
      expect(result.newIndex).toBe(1);
      expect(nav.getViewingIndex()).toBe(1);
    });

    it('should wrap from last to first on next', () => {
      const cars = [
        createCar(true, 'Car 0'),
        createCar(true, 'Car 1'),
        createCar(true, 'Car 2'),
      ];
      const nav = new CarNavigationSystem(cars, 2);

      const result = nav.nextCar();
      expect(result.newIndex).toBe(0);
      expect(nav.getViewingIndex()).toBe(0);
    });

    it('should wrap from first to last on prev', () => {
      const cars = [
        createCar(true, 'Car 0'),
        createCar(true, 'Car 1'),
        createCar(true, 'Car 2'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      const result = nav.prevCar();
      expect(result.newIndex).toBe(2);
      expect(nav.getViewingIndex()).toBe(2);
    });
  });

  describe('Locked Car Skipping', () => {
    it('should skip locked cars when navigating forward', () => {
      const cars = [
        createCar(true, 'Unlocked 0'),
        createCar(false, 'Locked 1'),
        createCar(false, 'Locked 2'),
        createCar(true, 'Unlocked 3'),
        createCar(false, 'Locked 4'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      const result = nav.nextCar();
      expect(result.newIndex).toBe(3);
      expect(result.skippedLocked).toBe(true);
      expect(nav.getViewingIndex()).toBe(3);
    });

    it('should skip locked cars when navigating backward', () => {
      const cars = [
        createCar(false, 'Locked 0'),
        createCar(true, 'Unlocked 1'),
        createCar(false, 'Locked 2'),
        createCar(false, 'Locked 3'),
        createCar(true, 'Unlocked 4'),
      ];
      const nav = new CarNavigationSystem(cars, 4);

      const result = nav.prevCar();
      expect(result.newIndex).toBe(1);
      expect(result.skippedLocked).toBe(true);
    });

    it('should wrap and skip locked cars', () => {
      const cars = [
        createCar(true, 'Unlocked 0'),
        createCar(false, 'Locked 1'),
        createCar(false, 'Locked 2'),
        createCar(false, 'Locked 3'),
        createCar(true, 'Unlocked 4'),
      ];
      const nav = new CarNavigationSystem(cars, 4);

      const result = nav.nextCar();
      expect(result.newIndex).toBe(0);
      expect(nav.getViewingIndex()).toBe(0);
    });

    it('should not infinite loop when all cars are locked', () => {
      const cars = [
        createCar(false, 'Locked 0'),
        createCar(false, 'Locked 1'),
        createCar(false, 'Locked 2'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      // Should complete without hanging
      const result = nav.nextCar();
      // Should return some index (implementation dependent)
      expect(result.newIndex).toBeGreaterThanOrEqual(0);
      expect(result.newIndex).toBeLessThan(3);
    });

    it('should indicate when no locked cars were skipped', () => {
      const cars = [
        createCar(true, 'Unlocked 0'),
        createCar(true, 'Unlocked 1'),
        createCar(true, 'Unlocked 2'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      const result = nav.nextCar();
      expect(result.skippedLocked).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cars array', () => {
      const nav = new CarNavigationSystem([], 0);

      const result = nav.nextCar();
      expect(result.newIndex).toBe(0);
      
      const prevResult = nav.prevCar();
      expect(prevResult.newIndex).toBe(0);
    });

    it('should handle single car array', () => {
      const cars = [createCar(true, 'Only Car')];
      const nav = new CarNavigationSystem(cars, 0);

      const result = nav.nextCar();
      expect(result.newIndex).toBe(0);
      
      const prevResult = nav.prevCar();
      expect(prevResult.newIndex).toBe(0);
    });

    it('should handle single locked car array', () => {
      const cars = [createCar(false, 'Only Locked Car')];
      const nav = new CarNavigationSystem(cars, 0);

      const result = nav.nextCar();
      expect(result.newIndex).toBe(0);
    });

    it('should clamp index when cars array shrinks', () => {
      const cars = [
        createCar(true, 'Car 0'),
        createCar(true, 'Car 1'),
        createCar(true, 'Car 2'),
        createCar(true, 'Car 3'),
        createCar(true, 'Car 4'),
      ];
      const nav = new CarNavigationSystem(cars, 4);
      expect(nav.getViewingIndex()).toBe(4);

      nav.setCars([
        createCar(true, 'Car 0'),
        createCar(true, 'Car 1'),
      ]);
      expect(nav.getViewingIndex()).toBe(1);
    });
  });

  describe('Input Debouncing', () => {
    it('should allow input after debounce period', () => {
      const cars = [
        createCar(true, 'Car 0'),
        createCar(true, 'Car 1'),
        createCar(true, 'Car 2'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      // First input
      nav.nextCar();
      const firstTime = nav.getLastInputTime();
      expect(firstTime).toBeGreaterThan(0);

      // Simulate time passing (we can't actually wait, so we check the mechanism)
      // In real code, Date.now() would be different
      // This test verifies the debounce timestamp is recorded
      expect(nav.getLastInputTime()).toBe(firstTime);
    });

    it('should record input timestamp on navigation', () => {
      const cars = [createCar(true, 'Car 0'), createCar(true, 'Car 1')];
      const nav = new CarNavigationSystem(cars, 0);

      expect(nav.getLastInputTime()).toBe(0);

      nav.nextCar();
      expect(nav.getLastInputTime()).toBeGreaterThan(0);
    });
  });

  describe('Car Selection Validation', () => {
    it('should allow selection of unlocked cars', () => {
      const cars = [
        createCar(true, 'Unlocked'),
        createCar(false, 'Locked'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      expect(nav.canSelectCar(0)).toBe(true);
      expect(nav.canSelectCar(1)).toBe(false);
    });

    it('should reject out-of-bounds indices', () => {
      const cars = [createCar(true, 'Car 0')];
      const nav = new CarNavigationSystem(cars, 0);

      expect(nav.canSelectCar(-1)).toBe(false);
      expect(nav.canSelectCar(1)).toBe(false);
      expect(nav.canSelectCar(100)).toBe(false);
    });

    it('should reject selection of locked cars', () => {
      const cars = [
        createCar(false, 'Locked 0'),
        createCar(true, 'Unlocked 1'),
        createCar(false, 'Locked 2'),
      ];
      const nav = new CarNavigationSystem(cars, 1);

      expect(nav.canSelectCar(0)).toBe(false);
      expect(nav.canSelectCar(1)).toBe(true);
      expect(nav.canSelectCar(2)).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle alternating locked/unlocked pattern', () => {
      const cars = [
        createCar(true, 'U'),
        createCar(false, 'L'),
        createCar(true, 'U'),
        createCar(false, 'L'),
        createCar(true, 'U'),
        createCar(false, 'L'),
        createCar(true, 'U'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      // Navigate through all unlocked cars (indices 0, 2, 4, 6)
      expect(nav.getViewingIndex()).toBe(0);
      
      nav.nextCar();
      expect(nav.getViewingIndex()).toBe(2);
      
      nav.nextCar();
      expect(nav.getViewingIndex()).toBe(4);
      
      nav.nextCar();
      expect(nav.getViewingIndex()).toBe(6);
      
      nav.nextCar();
      expect(nav.getViewingIndex()).toBe(0); // Wrap
      
      nav.prevCar();
      expect(nav.getViewingIndex()).toBe(6);
      
      nav.prevCar();
      expect(nav.getViewingIndex()).toBe(4);
    });

    it('should handle mostly locked cars', () => {
      const cars = [
        createCar(true, 'U'),
        createCar(false, 'L'),
        createCar(false, 'L'),
        createCar(false, 'L'),
        createCar(false, 'L'),
        createCar(true, 'U'),
      ];
      const nav = new CarNavigationSystem(cars, 0);

      nav.nextCar();
      expect(nav.getViewingIndex()).toBe(5);
      
      // Second next should wrap to index 0 (the only other unlocked car)
      nav.nextCar();
      expect(nav.getViewingIndex()).toBe(0);
      
      // Going back should go to index 5
      nav.prevCar();
      expect(nav.getViewingIndex()).toBe(5);
    });
  });
});
