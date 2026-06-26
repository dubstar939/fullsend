/**
 * Unit Tests: GarageManager
 * Tests for save/load system, build management, and persistence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GarageManager } from '../../src/garage/GarageManager';
import { CarBuildSave } from '../../src/types/car.types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('GarageManager', () => {
  let garageManager: GarageManager;
  const testStorageKey = 'test_garage';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    garageManager = new GarageManager(testStorageKey);
  });

  afterEach(() => {
    garageManager.clearGarage();
  });

  describe('Core API', () => {
    it('should initialize with empty builds', () => {
      expect(garageManager.getBuildCount()).toBe(0);
      expect(garageManager.getActiveBuild()).toBeNull();
      expect(garageManager.getAllBuilds()).toEqual([]);
    });

    it('should add a build to the garage', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);

      expect(garageManager.getBuildCount()).toBe(1);
      expect(garageManager.getBuild('build-1')).toEqual(testBuild);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        testStorageKey,
        expect.any(String)
      );
    });

    it('should remove a build from the garage', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);
      garageManager.setActiveBuild('build-1');
      
      expect(garageManager.getActiveBuild()).toEqual(testBuild);

      garageManager.removeBuild('build-1');

      expect(garageManager.getBuildCount()).toBe(0);
      expect(garageManager.getBuild('build-1')).toBeUndefined();
      expect(garageManager.getActiveBuild()).toBeNull();
    });

    it('should set active build successfully', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);
      const result = garageManager.setActiveBuild('build-1');

      expect(result).toBe(true);
      expect(garageManager.getActiveBuild()).toEqual(testBuild);
    });

    it('should fail to set non-existent active build', () => {
      const result = garageManager.setActiveBuild('non-existent');
      expect(result).toBe(false);
      expect(garageManager.getActiveBuild()).toBeNull();
    });

    it('should update an existing build', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);

      const updatedBuild: CarBuildSave = {
        ...testBuild,
        name: 'Updated Sedan',
        bodyColor: '#00FF00',
        mileage: 100,
      };

      garageManager.updateBuild(updatedBuild);

      expect(garageManager.getBuild('build-1')).toEqual(updatedBuild);
      expect(garageManager.getBuild('build-1')?.name).toBe('Updated Sedan');
    });

    it('should check if build exists', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      expect(garageManager.hasBuild('build-1')).toBe(false);
      garageManager.addBuild(testBuild);
      expect(garageManager.hasBuild('build-1')).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('should save to localStorage on add', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.builds).toHaveLength(1);
      expect(savedData.activeBuildId).toBeNull();
    });

    it('should load from localStorage on init', () => {
      const testData = {
        builds: [
          {
            id: 'build-1',
            carId: 'car-sedan',
            name: 'Loaded Sedan',
            installedUpgrades: {},
            installedVisuals: {},
            bodyColor: '#FF0000',
            vinylLayers: [],
            mileage: 500,
            lastUsed: Date.now(),
          },
        ],
        activeBuildId: 'build-1',
      };

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(testData));

      const newGarageManager = new GarageManager(testStorageKey);

      expect(newGarageManager.getBuildCount()).toBe(1);
      expect(newGarageManager.getActiveBuild()?.id).toBe('build-1');
      expect(newGarageManager.getActiveBuild()?.mileage).toBe(500);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('{ invalid json');

      const newGarageManager = new GarageManager(testStorageKey);

      expect(newGarageManager.getBuildCount()).toBe(0);
      expect(newGarageManager.getActiveBuild()).toBeNull();
    });

    it('should handle missing localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);

      const newGarageManager = new GarageManager(testStorageKey);

      expect(newGarageManager.getBuildCount()).toBe(0);
      expect(newGarageManager.getActiveBuild()).toBeNull();
    });

    it('should export garage as JSON string', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);
      garageManager.setActiveBuild('build-1');

      const exported = garageManager.exportGarage();
      const parsed = JSON.parse(exported);

      expect(parsed.builds).toHaveLength(1);
      expect(parsed.activeBuildId).toBe('build-1');
      expect(typeof exported).toBe('string');
    });

    it('should import garage from JSON string', () => {
      const importData = {
        builds: [
          {
            id: 'imported-build',
            carId: 'car-coupe',
            name: 'Imported Coupe',
            installedUpgrades: {},
            installedVisuals: {},
            bodyColor: '#0000FF',
            vinylLayers: [],
            mileage: 1000,
            lastUsed: Date.now(),
          },
        ],
        activeBuildId: 'imported-build',
      };

      const jsonString = JSON.stringify(importData);
      const result = garageManager.importGarage(jsonString);

      expect(result).toBe(true);
      expect(garageManager.getBuildCount()).toBe(1);
      expect(garageManager.getBuild('imported-build')?.name).toBe('Imported Coupe');
    });

    it('should reject malformed JSON on import', () => {
      const result = garageManager.importGarage('{ invalid json');
      expect(result).toBe(false);
      expect(garageManager.getBuildCount()).toBe(0);
    });

    it('should clear all garage data', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 0,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);
      garageManager.setActiveBuild('build-1');

      garageManager.clearGarage();

      expect(garageManager.getBuildCount()).toBe(0);
      expect(garageManager.getActiveBuild()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(testStorageKey);
    });
  });

  describe('Mileage Tracking', () => {
    it('should add mileage to active build', () => {
      const testBuild: CarBuildSave = {
        id: 'build-1',
        carId: 'car-sedan',
        name: 'My Sedan',
        installedUpgrades: {},
        installedVisuals: {},
        bodyColor: '#FF0000',
        vinylLayers: [],
        mileage: 100,
        lastUsed: Date.now(),
      };

      garageManager.addBuild(testBuild);
      garageManager.setActiveBuild('build-1');

      const beforeTime = Date.now();
      garageManager.addMileage(50);

      const updatedBuild = garageManager.getActiveBuild();
      expect(updatedBuild?.mileage).toBe(150);
      expect(updatedBuild!.lastUsed).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should not add mileage when no active build', () => {
      expect(garageManager.getActiveBuild()).toBeNull();
      
      // Should not throw
      expect(() => garageManager.addMileage(50)).not.toThrow();
      expect(garageManager.getBuildCount()).toBe(0);
    });
  });

  describe('Static Conversion Methods', () => {
    it('should convert CarBuild to save format', () => {
      // Note: This test would require mocking CarBuild type
      // For now, we verify the method exists and is callable
      expect(typeof GarageManager.toSaveFormat).toBe('function');
    });

    it('should convert CarBuildSave to runtime format', () => {
      // Note: This test would require mock catalogs
      // For now, we verify the method exists and is callable
      expect(typeof GarageManager.fromSaveFormat).toBe('function');
    });
  });
});
