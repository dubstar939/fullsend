// CarDefinitions.ts
import { CarDefinition } from "./car.types";

export const CAR_DEFINITIONS: CarDefinition[] = [
  {
    id: "shinra_type_r",
    name: "Shinra Type‑R",
    manufacturer: "Shinra",
    year: 1998,
    drivetrain: "FWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 145,
      acceleration: 78,
      handling: 92,
      grip: 88,
      stability: 70,
      spResistance: 65
    },
    upgradeSlots: {
      engine: true,
      transmission: true,
      suspension: true,
      tires: true,
      weightReduction: true,
      cooling: true
    },
    visualSlots: {
      bodyColor: true,
      vinyl: true,
      frontBumper: true,
      rearBumper: true,
      sideSkirts: true,
      spoiler: true,
      hood: true,
      wheels: true,
      exhaust: true
    }
  },

  {
    id: "kaminari_sx",
    name: "Kaminari SX",
    manufacturer: "Kaminari",
    year: 1992,
    drivetrain: "RWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 150,
      acceleration: 75,
      handling: 85,
      grip: 80,
      stability: 72,
      spResistance: 68
    },
    upgradeSlots: {
      engine: true,
      transmission: true,
      suspension: true,
      tires: true,
      weightReduction: true,
      cooling: true
    },
    visualSlots: {
      bodyColor: true,
      vinyl: true,
      frontBumper: true,
      rearBumper: true,
      sideSkirts: true,
      spoiler: true,
      hood: true,
      wheels: true,
      exhaust: true
    }
  },

  {
    id: "raikou_gtr",
    name: "Raikou GT‑R",
    manufacturer: "Raikou",
    year: 1999,
    drivetrain: "AWD",
    weightClass: "heavy",
    baseStats: {
      topSpeed: 165,
      acceleration: 90,
      handling: 88,
      grip: 95,
      stability: 92,
      spResistance: 90
    },
    upgradeSlots: {
      engine: true,
      transmission: true,
      suspension: true,
      tires: true,
      weightReduction: true,
      cooling: true
    },
    visualSlots: {
      bodyColor: true,
      vinyl: true,
      frontBumper: true,
      rearBumper: true,
      sideSkirts: true,
      spoiler: true,
      hood: true,
      wheels: true,
      exhaust: true
    }
  },

  {
    id: "hachiroku_spirit",
    name: "Hachiroku Spirit",
    manufacturer: "Takumi Motors",
    year: 1986,
    drivetrain: "RWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 130,
      acceleration: 70,
      handling: 95,
      grip: 82,
      stability: 68,
      spResistance: 60
    },
    upgradeSlots: {
      engine: true,
      transmission: true,
      suspension: true,
      tires: true,
      weightReduction: true,
      cooling: true
    },
    visualSlots: {
      bodyColor: true,
      vinyl: true,
      frontBumper: true,
      rearBumper: true,
      sideSkirts: true,
      spoiler: true,
      hood: true,
      wheels: true,
      exhaust: true
    }
  },

  {
    id: "okami_z_turbo",
    name: "Okami Z‑Turbo",
    manufacturer: "Okami",
    year: 1995,
    drivetrain: "RWD",
    weightClass: "medium",
    baseStats: {
      topSpeed: 160,
      acceleration: 82,
      handling: 80,
      grip: 78,
      stability: 85,
      spResistance: 75
    },
    upgradeSlots: {
      engine: true,
      transmission: true,
      suspension: true,
      tires: true,
      weightReduction: true,
      cooling: true
    },
    visualSlots: {
      bodyColor: true,
      vinyl: true,
      frontBumper: true,
      rearBumper: true,
      sideSkirts: true,
      spoiler: true,
      hood: true,
      wheels: true,
      exhaust: true
    }
  },

  {
    id: "shogun_evox",
    name: "Shogun Evo‑X",
    manufacturer: "Shogun",
    year: 2008,
    drivetrain: "AWD",
    weightClass: "medium",
    baseStats: {
      topSpeed: 158,
      acceleration: 88,
      handling: 90,
      grip: 92,
      stability: 88,
      spResistance: 85
    },
    upgradeSlots: {
      engine: true,
      transmission: true,
      suspension: true,
      tires: true,
      weightReduction: true,
      cooling: true
    },
    visualSlots: {
      bodyColor: true,
      vinyl: true,
      frontBumper: true,
      rearBumper: true,
      sideSkirts: true,
      spoiler: true,
      hood: true,
      wheels: true,
      exhaust: true
    }
  }
];
