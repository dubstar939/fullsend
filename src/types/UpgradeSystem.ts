/**
 * Performance Upgrade System
 * Core structure for JDM-style car upgrades
 */

import { UpgradePart, CarStats } from "./car.types";

// Shared slot definitions to avoid repetition
export const fullSlots = {
  engine: true,
  transmission: true,
  suspension: true,
  tires: true,
  weightReduction: true,
  cooling: true
};

export const fullVisuals = {
  bodyColor: true,
  vinyl: true,
  frontBumper: true,
  rearBumper: true,
  sideSkirts: true,
  spoiler: true,
  hood: true,
  wheels: true,
  exhaust: true
};

// 🏁 Engine Upgrades - High-revving NA builds, forged internals, cams
export const ENGINE_UPGRADES: UpgradePart[] = [
  {
    id: "engine_stage1",
    name: "Stage 1 Engine Tune",
    category: "engine",
    level: 1,
    cost: 1500,
    rarity: "common",
    statModifiers: { acceleration: 5, topSpeed: 2 }
  },
  {
    id: "engine_stage2",
    name: "Stage 2 Engine Build",
    category: "engine",
    level: 2,
    cost: 3500,
    rarity: "rare",
    statModifiers: { acceleration: 10, topSpeed: 4, spResistance: 3 }
  },
  {
    id: "engine_stage3",
    name: "Forged Internals + High-Lift Cams",
    category: "engine",
    level: 3,
    cost: 8000,
    rarity: "legendary",
    statModifiers: { acceleration: 18, topSpeed: 8, spResistance: 5 }
  }
];

// 🌀 Turbo / Forced Induction - Wangan monsters live here
export const TURBO_UPGRADES: UpgradePart[] = [
  {
    id: "turbo_stage1",
    name: "Mild Boost Turbo Kit",
    category: "turbo",
    level: 1,
    cost: 3000,
    rarity: "common",
    statModifiers: { topSpeed: 6, acceleration: 8 }
  },
  {
    id: "turbo_stage2",
    name: "High-Flow Turbo Kit",
    category: "turbo",
    level: 2,
    cost: 7000,
    rarity: "rare",
    statModifiers: { topSpeed: 12, acceleration: 14, stability: -2 }
  },
  {
    id: "turbo_stage3",
    name: "Twin Turbo Conversion",
    category: "turbo",
    level: 3,
    cost: 15000,
    rarity: "legendary",
    statModifiers: { topSpeed: 20, acceleration: 18, stability: -4 }
  }
];

// 🎐 Intake / Exhaust - Breathing mods, cheap and effective
export const INTAKE_EXHAUST_UPGRADES: UpgradePart[] = [
  {
    id: "intake_stage1",
    name: "Cold Air Intake",
    category: "intake",
    level: 1,
    cost: 600,
    rarity: "common",
    statModifiers: { acceleration: 2 }
  },
  {
    id: "exhaust_stage1",
    name: "Cat-Back Exhaust",
    category: "exhaust",
    level: 1,
    cost: 900,
    rarity: "common",
    statModifiers: { acceleration: 3, topSpeed: 1 }
  },
  {
    id: "exhaust_stage2",
    name: "Straight-Pipe Titanium Exhaust",
    category: "exhaust",
    level: 2,
    cost: 2500,
    rarity: "rare",
    statModifiers: { acceleration: 6, topSpeed: 3 }
  }
];

// 🛞 Tires - Grip = SP survival
export const TIRE_UPGRADES: UpgradePart[] = [
  {
    id: "tires_sport",
    name: "Sport Tires",
    category: "tires",
    level: 1,
    cost: 1200,
    rarity: "common",
    statModifiers: { grip: 8, handling: 4 }
  },
  {
    id: "tires_semislick",
    name: "Semi-Slick Tires",
    category: "tires",
    level: 2,
    cost: 3000,
    rarity: "rare",
    statModifiers: { grip: 14, handling: 8 }
  }
];

// 🌀 Suspension - Coilovers, sway bars, camber kits
export const SUSPENSION_UPGRADES: UpgradePart[] = [
  {
    id: "coilovers_basic",
    name: "Adjustable Coilovers",
    category: "suspension",
    level: 1,
    cost: 1800,
    rarity: "common",
    statModifiers: { handling: 10, stability: 4 }
  },
  {
    id: "coilovers_pro",
    name: "Pro Track Coilovers",
    category: "suspension",
    level: 2,
    cost: 4500,
    rarity: "rare",
    statModifiers: { handling: 16, stability: 8 }
  }
];

// ⚖️ Weight Reduction - The most underrated upgrade
export const WEIGHT_REDUCTION: UpgradePart[] = [
  {
    id: "weight_stage1",
    name: "Interior Strip",
    category: "weightReduction",
    level: 1,
    cost: 1000,
    rarity: "common",
    statModifiers: { acceleration: 4, handling: 3 }
  },
  {
    id: "weight_stage2",
    name: "Carbon Body Panels",
    category: "weightReduction",
    level: 2,
    cost: 5000,
    rarity: "rare",
    statModifiers: { acceleration: 8, handling: 6 }
  }
];

// ❄️ Cooling - Essential for high-boost builds
export const COOLING_UPGRADES: UpgradePart[] = [
  {
    id: "cooling_stage1",
    name: "Upgraded Radiator",
    category: "cooling",
    level: 1,
    cost: 800,
    rarity: "common",
    statModifiers: { spResistance: 5 }
  },
  {
    id: "cooling_stage2",
    name: "Intercooler Upgrade",
    category: "cooling",
    level: 2,
    cost: 2200,
    rarity: "rare",
    statModifiers: { spResistance: 10, acceleration: 3 }
  }
];

// 🧠 ECU / Tuning - Fine-tune your build
export const ECU_UPGRADES: UpgradePart[] = [
  {
    id: "ecu_stage1",
    name: "ECU Remap",
    category: "ecu",
    level: 1,
    cost: 1200,
    rarity: "common",
    statModifiers: { acceleration: 4, topSpeed: 2 }
  },
  {
    id: "ecu_stage2",
    name: "Standalone ECU",
    category: "ecu",
    level: 2,
    cost: 3500,
    rarity: "rare",
    statModifiers: { acceleration: 8, topSpeed: 5, spResistance: 4 }
  }
];

// 📦 Transmission Upgrades
export const TRANSMISSION_UPGRADES: UpgradePart[] = [
  {
    id: "transmission_stage1",
    name: "Short Shifter",
    category: "transmission",
    level: 1,
    cost: 700,
    rarity: "common",
    statModifiers: { acceleration: 3 }
  },
  {
    id: "transmission_stage2",
    name: "Close-Ratio Gearbox",
    category: "transmission",
    level: 2,
    cost: 4000,
    rarity: "rare",
    statModifiers: { acceleration: 10, topSpeed: 3 }
  }
];

// 🧮 Stat Merging System
// Combines base car stats with all installed upgrades
export function calculateFinalStats(
  base: CarStats,
  upgrades: UpgradePart[]
): CarStats {
  const result = { ...base };

  for (const upgrade of upgrades) {
    for (const key in upgrade.statModifiers) {
      const statKey = key as keyof CarStats;
      result[statKey] = (result[statKey] || 0) + upgrade.statModifiers[statKey]!;
    }
  }

  return result;
}

// Helper function to get all upgrades by category
export function getUpgradesByCategory(category: string): UpgradePart[] {
  const allUpgrades = [
    ...ENGINE_UPGRADES,
    ...TURBO_UPGRADES,
    ...INTAKE_EXHAUST_UPGRADES,
    ...TIRE_UPGRADES,
    ...SUSPENSION_UPGRADES,
    ...WEIGHT_REDUCTION,
    ...COOLING_UPGRADES,
    ...ECU_UPGRADES,
    ...TRANSMISSION_UPGRADES
  ];

  return allUpgrades.filter(upgrade => upgrade.category === category);
}

// Helper function to get all available upgrades
export function getAllUpgrades(): UpgradePart[] {
  return [
    ...ENGINE_UPGRADES,
    ...TURBO_UPGRADES,
    ...INTAKE_EXHAUST_UPGRADES,
    ...TIRE_UPGRADES,
    ...SUSPENSION_UPGRADES,
    ...WEIGHT_REDUCTION,
    ...COOLING_UPGRADES,
    ...ECU_UPGRADES,
    ...TRANSMISSION_UPGRADES
  ];
}
