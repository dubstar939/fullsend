/**
 * Condition Checker - Tokyo Xtreme Racer Style
 * Utility for checking wanderer and rival spawn conditions
 */

import { WandererCondition } from '../types/ClubSystem';

export interface PlayerStateForConditions {
  currentCarModel: string;
  currentCarColor: string;
  totalMileage: number;
  currentSpeed: number;
  currentTimeOfDay: number;
  isAlone: boolean;
  weatherCondition: string;
  trafficCount: number;
  beatenClubs: string[];
  defeatedRivals: string[];
  winStreak: number;
  totalWins: number;
}

export interface ConditionCheckResult {
  passed: boolean;
  failedConditions: FailedCondition[];
  percentageMet: number;
}

export interface FailedCondition {
  condition: WandererCondition;
  reason: string;
  expected: string | number | boolean;
  actual: string | number | boolean;
}

export class ConditionChecker {
  /**
   * Check all conditions against player state
   */
  static checkConditions(
    conditions: WandererCondition[],
    playerState: PlayerStateForConditions
  ): ConditionCheckResult {
    if (conditions.length === 0) {
      return {
        passed: true,
        failedConditions: [],
        percentageMet: 100,
      };
    }
    
    const failedConditions: FailedCondition[] = [];
    
    for (const condition of conditions) {
      const result = this.checkSingleCondition(condition, playerState);
      
      if (!result.passed) {
        failedConditions.push({
          condition,
          reason: result.reason,
          expected: result.expected,
          actual: result.actual,
        });
      }
    }
    
    const passedCount = conditions.length - failedConditions.length;
    const percentageMet = (passedCount / conditions.length) * 100;
    
    return {
      passed: failedConditions.length === 0,
      failedConditions,
      percentageMet,
    };
  }
  
  /**
   * Check a single condition
   */
  static checkSingleCondition(
    condition: WandererCondition,
    playerState: PlayerStateForConditions
  ): { passed: boolean; reason: string; expected: unknown; actual: unknown } {
    switch (condition.type) {
      case 'carModel': {
        const passed = playerState.currentCarModel === condition.value;
        return {
          passed,
          reason: passed ? '' : 'Car model does not match',
          expected: condition.value,
          actual: playerState.currentCarModel,
        };
      }
      
      case 'carColor': {
        const passed = playerState.currentCarColor === condition.value;
        return {
          passed,
          reason: passed ? '' : 'Car color does not match',
          expected: condition.value,
          actual: playerState.currentCarColor,
        };
      }
      
      case 'minMileage': {
        const passed = playerState.totalMileage >= (condition.value as number);
        return {
          passed,
          reason: passed ? '' : 'Insufficient mileage',
          expected: `>= ${condition.value}`,
          actual: playerState.totalMileage,
        };
      }
      
      case 'maxTraffic': {
        const maxTraffic = condition.value as number;
        const passed = playerState.trafficCount <= maxTraffic;
        return {
          passed,
          reason: passed ? '' : 'Too much traffic',
          expected: `<= ${maxTraffic}`,
          actual: playerState.trafficCount,
        };
      }
      
      case 'minSpeed': {
        const passed = playerState.currentSpeed >= (condition.value as number);
        return {
          passed,
          reason: passed ? '' : 'Speed too low',
          expected: `>= ${condition.value}`,
          actual: playerState.currentSpeed,
        };
      }
      
      case 'maxSpeed': {
        const passed = playerState.currentSpeed <= (condition.value as number);
        return {
          passed,
          reason: passed ? '' : 'Speed too high',
          expected: `<= ${condition.value}`,
          actual: playerState.currentSpeed,
        };
      }
      
      case 'timeRange': {
        const [startHour, endHour] = condition.value as [number, number];
        const hour = playerState.currentTimeOfDay;
        
        let passed: boolean;
        if (startHour <= endHour) {
          passed = hour >= startHour && hour <= endHour;
        } else {
          // Overnight range (e.g., 22-5)
          passed = hour >= startHour || hour <= endHour;
        }
        
        return {
          passed,
          reason: passed ? '' : 'Outside time range',
          expected: `${startHour}:00 - ${endHour}:00`,
          actual: `${hour}:00`,
        };
      }
      
      case 'beatClub': {
        const clubId = condition.value as string;
        const passed = playerState.beatenClubs.includes(clubId);
        return {
          passed,
          reason: passed ? '' : 'Club not yet defeated',
          expected: clubId,
          actual: playerState.beatenClubs.join(', ') || 'none',
        };
      }
      
      case 'specificCarType': {
        // This would need a car type classification system
        // For now, we'll do a simple check based on known models
        const requiredType = condition.value as string;
        const carType = this.getCarType(playerState.currentCarModel);
        const passed = carType === requiredType;
        
        return {
          passed,
          reason: passed ? '' : 'Wrong car type',
          expected: requiredType,
          actual: carType,
        };
      }
      
      case 'aloneOnHighway': {
        const passed = playerState.isAlone === condition.value;
        return {
          passed,
          reason: passed ? '' : 'Not alone on highway',
          expected: condition.value,
          actual: playerState.isAlone,
        };
      }
      
      case 'weatherCondition': {
        const passed = playerState.weatherCondition === condition.value;
        return {
          passed,
          reason: passed ? '' : 'Weather condition not met',
          expected: condition.value,
          actual: playerState.weatherCondition,
        };
      }
      
      default:
        return {
          passed: true,
          reason: '',
          expected: 'unknown condition',
          actual: 'skipped',
        };
    }
  }
  
  /**
   * Check if player meets minimum requirements for a challenge
   */
  static checkMinimumRequirements(
    requirements: {
      minMileage?: number;
      minWins?: number;
      minWinStreak?: number;
      requiredCarModel?: string;
      requiredClubReputation?: { clubId: string; minReputation: number };
    },
    playerState: PlayerStateForConditions,
    clubReputations: Record<string, number> = {}
  ): { passed: boolean; missingRequirements: string[] } {
    const missingRequirements: string[] = [];
    
    if (requirements.minMileage !== undefined) {
      if (playerState.totalMileage < requirements.minMileage) {
        missingRequirements.push(`Requires ${requirements.minMileage}km mileage`);
      }
    }
    
    if (requirements.minWins !== undefined) {
      if (playerState.totalWins < requirements.minWins) {
        missingRequirements.push(`Requires ${requirements.minWins} wins`);
      }
    }
    
    if (requirements.minWinStreak !== undefined) {
      if (playerState.winStreak < requirements.minWinStreak) {
        missingRequirements.push(`Requires ${requirements.minWinStreak} win streak`);
      }
    }
    
    if (requirements.requiredCarModel !== undefined) {
      if (playerState.currentCarModel !== requirements.requiredCarModel) {
        missingRequirements.push(`Requires ${requirements.requiredCarModel}`);
      }
    }
    
    if (requirements.requiredClubReputation !== undefined) {
      const { clubId, minReputation } = requirements.requiredClubReputation;
      const currentRep = clubReputations[clubId] ?? 0;
      
      if (currentRep < minReputation) {
        missingRequirements.push(`Requires ${minReputation} reputation with ${clubId}`);
      }
    }
    
    return {
      passed: missingRequirements.length === 0,
      missingRequirements,
    };
  }
  
  /**
   * Get car type from model name
   */
  static getCarType(carModel: string): string {
    const modelLower = carModel.toLowerCase();
    
    // Sports cars
    if (['supra', 'skyline', 'gtr', 'nsx', 'rx7', 's2000'].some(s => modelLower.includes(s))) {
      return 'sports';
    }
    
    // Sedans
    if (['sedan', 'camry', 'accord', 'markii', 'chaser', 'crest'].some(s => modelLower.includes(s))) {
      return 'sedan';
    }
    
    // Coupes
    if (['silvia', '180sx', '240sx', 'celica', 'integra'].some(s => modelLower.includes(s))) {
      return 'coupe';
    }
    
    // Hatchbacks
    if (['civic', 'fit', 'yaris', 'starlet'].some(s => modelLower.includes(s))) {
      return 'hatchback';
    }
    
    // Classic/AE86
    if (['ae86', 'trueno', 'levin', 'hachiroku'].some(s => modelLower.includes(s))) {
      return 'classic';
    }
    
    // SUVs
    if (['suv', 'cx5', 'rav4', 'forester'].some(s => modelLower.includes(s))) {
      return 'suv';
    }
    
    return 'unknown';
  }
  
  /**
   * Format condition as human-readable string
   */
  static formatCondition(condition: WandererCondition): string {
    switch (condition.type) {
      case 'carModel':
        return `Drive a ${condition.value}`;
      
      case 'carColor':
        return `Paint your car ${condition.value}`;
      
      case 'minMileage':
        return `Accumulate ${(condition.value as number)}km`;
      
      case 'maxTraffic':
        return `Drive with ${(condition.value as number)} or fewer cars`;
      
      case 'minSpeed':
        return `Maintain speed above ${(condition.value as number)}km/h`;
      
      case 'maxSpeed':
        return `Keep speed below ${(condition.value as number)}km/h`;
      
      case 'timeRange': {
        const [start, end] = condition.value as [number, number];
        return `Appear between ${start}:00 and ${end}:00`;
      }
      
      case 'beatClub':
        return `Defeat the ${condition.value} club`;
      
      case 'specificCarType':
        return `Drive a ${condition.value} type car`;
      
      case 'aloneOnHighway':
        return condition.value ? 'Be alone on the highway' : 'Have other cars nearby';
      
      case 'weatherCondition':
        return `Drive in ${condition.value} weather`;
      
      default:
        return 'Unknown condition';
    }
  }
  
  /**
   * Get conditions that are close to being met
   */
  static getCloseConditions(
    conditions: WandererCondition[],
    playerState: PlayerStateForConditions,
    threshold: number = 0.8
  ): WandererCondition[] {
    const closeConditions: WandererCondition[] = [];
    
    for (const condition of conditions) {
      const result = this.checkSingleCondition(condition, playerState);
      
      if (!result.passed) {
        const closeness = this.calculateCloseness(condition, result.actual, threshold);
        if (closeness >= threshold) {
          closeConditions.push(condition);
        }
      }
    }
    
    return closeConditions;
  }
  
  /**
   * Calculate how close a condition is to being met
   */
  private static calculateCloseness(
    condition: WandererCondition,
    actual: unknown,
    threshold: number
  ): number {
    switch (condition.type) {
      case 'minMileage': {
        const required = condition.value as number;
        const actualNum = actual as number;
        return actualNum / required;
      }
      
      case 'minSpeed': {
        const required = condition.value as number;
        const actualNum = actual as number;
        return actualNum / required;
      }
      
      case 'maxSpeed': {
        const required = condition.value as number;
        const actualNum = actual as number;
        return required > 0 ? actualNum / required : 1;
      }
      
      case 'timeRange': {
        // Time proximity calculation would go here
        return 0;
      }
      
      default:
        return 0;
    }
  }
}

export default ConditionChecker;
