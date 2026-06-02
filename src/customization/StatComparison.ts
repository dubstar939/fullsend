/**
 * Stat Comparison Panel
 * Shows before/after stats with gains/losses and SP battle impact
 */

import { CarStats, StatComparison } from "../types/car.types";

/**
 * Compare two stat sets and return detailed comparison
 */
export function compareStats(before: CarStats, after: CarStats): StatComparison[] {
  const keys = Object.keys(before) as (keyof CarStats)[];
  
  return keys.map(key => ({
    stat: key,
    before: before[key],
    after: after[key],
    delta: after[key] - before[key]
  }));
}

/**
 * Format delta value for display
 */
export function formatDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  } else if (delta < 0) {
    return `${delta}`;
  } else {
    return "—";
  }
}

/**
 * Get delta color class for UI styling
 */
export function getDeltaClass(delta: number): string {
  if (delta > 0) {
    return "positive"; // Green for improvements
  } else if (delta < 0) {
    return "negative"; // Red for decreases
  } else {
    return "neutral"; // Gray for no change
  }
}

/**
 * Calculate overall performance score from stats
 */
export function calculatePerformanceScore(stats: CarStats): number {
  const weights = {
    topSpeed: 0.25,
    acceleration: 0.25,
    handling: 0.2,
    grip: 0.15,
    stability: 0.1,
    spResistance: 0.05
  };
  
  return Math.round(
    stats.topSpeed * weights.topSpeed +
    stats.acceleration * weights.acceleration +
    stats.handling * weights.handling +
    stats.grip * weights.grip +
    stats.stability * weights.stability +
    stats.spResistance * weights.spResistance
  );
}

/**
 * Get performance rating letter based on score
 */
export function getPerformanceRating(score: number): string {
  if (score >= 90) return "S+";
  if (score >= 85) return "S";
  if (score >= 80) return "A";
  if (score >= 75) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
}

/**
 * Predict SP battle impact based on stat changes
 */
export interface BattleImpact {
  topSpeedAdvantage: boolean;
  accelerationAdvantage: boolean;
  handlingAdvantage: boolean;
  spResistanceAdvantage: boolean;
  overallImprovement: number;
  recommendation: string;
}

export function predictBattleImpact(comparisons: StatComparison[]): BattleImpact {
  const impact: BattleImpact = {
    topSpeedAdvantage: false,
    accelerationAdvantage: false,
    handlingAdvantage: false,
    spResistanceAdvantage: false,
    overallImprovement: 0,
    recommendation: ""
  };
  
  let totalPositive = 0;
  let totalNegative = 0;
  
  comparisons.forEach(comp => {
    if (comp.delta > 0) {
      totalPositive += comp.delta;
    } else if (comp.delta < 0) {
      totalNegative += Math.abs(comp.delta);
    }
    
    switch (comp.stat) {
      case "topSpeed":
        impact.topSpeedAdvantage = comp.delta > 0;
        break;
      case "acceleration":
        impact.accelerationAdvantage = comp.delta > 0;
        break;
      case "handling":
        impact.handlingAdvantage = comp.delta > 0;
        break;
      case "spResistance":
        impact.spResistanceAdvantage = comp.delta > 0;
        break;
    }
  });
  
  impact.overallImprovement = totalPositive - totalNegative;
  
  // Generate recommendation
  if (impact.overallImprovement > 10) {
    impact.recommendation = "Excellent upgrade! Significant performance gain.";
  } else if (impact.overallImprovement > 0) {
    impact.recommendation = "Good upgrade. Moderate performance improvement.";
  } else if (impact.overallImprovement === 0) {
    impact.recommendation = "No net change in performance.";
  } else if (impact.overallImprovement > -10) {
    impact.recommendation = "Minor performance loss. Consider trade-offs.";
  } else {
    impact.recommendation = "Significant performance loss. Review upgrade choices.";
  }
  
  return impact;
}

/**
 * Create a stat comparison table data structure
 */
export interface StatTableData {
  headers: string[];
  rows: Array<{
    statName: string;
    before: number;
    after: number;
    deltaFormatted: string;
    deltaClass: string;
  }>;
  footer: {
    beforeScore: number;
    afterScore: number;
    scoreDelta: number;
    beforeRating: string;
    afterRating: string;
  };
}

export function createStatTableData(
  before: CarStats, 
  after: CarStats,
  statLabels: Record<keyof CarStats, string> = {
    topSpeed: "Top Speed",
    acceleration: "Acceleration",
    handling: "Handling",
    grip: "Grip",
    stability: "Stability",
    spResistance: "SP Resistance"
  }
): StatTableData {
  const comparisons = compareStats(before, after);
  const beforeScore = calculatePerformanceScore(before);
  const afterScore = calculatePerformanceScore(after);
  
  return {
    headers: ["Stat", "Before", "After", "Change"],
    rows: comparisons.map(comp => ({
      statName: statLabels[comp.stat],
      before: comp.before,
      after: comp.after,
      deltaFormatted: formatDelta(comp.delta),
      deltaClass: getDeltaClass(comp.delta)
    })),
    footer: {
      beforeScore,
      afterScore,
      scoreDelta: afterScore - beforeScore,
      beforeRating: getPerformanceRating(beforeScore),
      afterRating: getPerformanceRating(afterScore)
    }
  };
}
