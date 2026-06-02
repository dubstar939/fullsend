/**
 * Condition Checker - Evaluates wanderer/rival spawn conditions
 */

import { WandererConditions } from './WandererDatabase';

export interface ConditionContext {
  speed: number;              // Current player speed (km/h)
  mileage: number;            // Total distance traveled (km)
  weather: string;            // Current weather
  timeRange: [number, number]; // Current time (hour 0-24)
  carModel?: string;          // Player's current car
  dayOfWeek?: number;         // 0-6 (Sunday-Saturday)
}

export type ConditionResult = {
  met: boolean;
  failedConditions: string[];
};

export class ConditionChecker {
  /**
   * Check if all conditions are met
   */
  check(conditions: WandererConditions, context: ConditionContext): boolean {
    const result = this.checkDetailed(conditions, context);
    return result.met;
  }

  /**
   * Check conditions with detailed feedback
   */
  checkDetailed(conditions: WandererConditions, context: ConditionContext): ConditionResult {
    const failedConditions: string[] = [];

    // Check car model requirement
    if (conditions.carModel && context.carModel !== conditions.carModel) {
      failedConditions.push(`car_model:${conditions.carModel}`);
    }

    // Check time range (handles overnight ranges like 22-5)
    if (conditions.timeRange) {
      const [startHour, endHour] = conditions.timeRange;
      const currentHour = context.timeRange[0];
      
      if (!this.isTimeInRange(currentHour, startHour, endHour)) {
        failedConditions.push(`time_range:${startHour}-${endHour}`);
      }
    }

    // Check mileage requirement
    if (conditions.mileage !== undefined && context.mileage < conditions.mileage) {
      failedConditions.push(`mileage:${conditions.mileage}`);
    }

    // Check weather condition
    if (conditions.weather && context.weather !== conditions.weather) {
      failedConditions.push(`weather:${conditions.weather}`);
    }

    // Check speed requirement
    if (conditions.speed !== undefined && context.speed < conditions.speed) {
      failedConditions.push(`speed:${conditions.speed}`);
    }

    // Check day of week
    if (conditions.dayOfWeek && context.dayOfWeek !== undefined) {
      if (!conditions.dayOfWeek.includes(context.dayOfWeek)) {
        failedConditions.push(`day_of_week:${conditions.dayOfWeek.join(',')}`);
      }
    }

    return {
      met: failedConditions.length === 0,
      failedConditions,
    };
  }

  /**
   * Check if current hour is within a time range (handles overnight ranges)
   */
  private isTimeInRange(hour: number, start: number, end: number): boolean {
    if (start <= end) {
      // Normal range (e.g., 9-17)
      return hour >= start && hour <= end;
    } else {
      // Overnight range (e.g., 22-5)
      return hour >= start || hour <= end;
    }
  }

  /**
   * Get human-readable description of failed conditions
   */
  getFailureDescription(failedConditions: string[]): string {
    if (failedConditions.length === 0) {
      return 'All conditions met!';
    }

    const descriptions: string[] = [];

    for (const condition of failedConditions) {
      const [type, value] = condition.split(':');
      
      switch (type) {
        case 'car_model':
          descriptions.push(`Drive a ${this.formatCarModel(value)}`);
          break;
        case 'time_range':
          descriptions.push(`Race between ${this.formatTimeRange(value)}`);
          break;
        case 'mileage':
          descriptions.push(`Accumulate ${Number(value)} km total mileage`);
          break;
        case 'weather':
          descriptions.push(`Wait for ${value} weather`);
          break;
        case 'speed':
          descriptions.push(`Reach ${Number(value)} km/h`);
          break;
        case 'day_of_week':
          descriptions.push(`Race on ${this.formatDays(value)}`);
          break;
      }
    }

    return descriptions.join(', ');
  }

  private formatCarModel(model: string): string {
    return model.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private formatTimeRange(range: string): string {
    const [start, end] = range.split('-').map(Number);
    return `${this.formatHour(start)} to ${this.formatHour(end)}`;
  }

  private formatHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:00 ${period}`;
  }

  private formatDays(daysStr: string): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = daysStr.split(',').map(Number);
    return days.map(d => dayNames[d]).join(' or ');
  }

  /**
   * Calculate match percentage (how close player is to meeting conditions)
   */
  calculateMatchPercentage(conditions: WandererConditions, context: ConditionContext): number {
    let totalConditions = 0;
    let metConditions = 0;

    if (conditions.carModel) {
      totalConditions++;
      if (context.carModel === conditions.carModel) metConditions++;
    }

    if (conditions.timeRange) {
      totalConditions++;
      const [startHour, endHour] = conditions.timeRange;
      const currentHour = context.timeRange[0];
      if (this.isTimeInRange(currentHour, startHour, endHour)) metConditions++;
    }

    if (conditions.mileage !== undefined) {
      totalConditions++;
      if (context.mileage >= conditions.mileage) metConditions++;
    }

    if (conditions.weather) {
      totalConditions++;
      if (context.weather === conditions.weather) metConditions++;
    }

    if (conditions.speed !== undefined) {
      totalConditions++;
      if (context.speed >= conditions.speed) metConditions++;
    }

    if (conditions.dayOfWeek && context.dayOfWeek !== undefined) {
      totalConditions++;
      if (conditions.dayOfWeek.includes(context.dayOfWeek)) metConditions++;
    }

    return totalConditions > 0 ? (metConditions / totalConditions) * 100 : 100;
  }
}
