// CarDefinitions.ts
import { CarDefinition } from "./car.types";
import { fullSlots, fullVisuals } from "./UpgradeSystem";

export const CAR_DEFINITIONS: CarDefinition[] = [
  // Original cars
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
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
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
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
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
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
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
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
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
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
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
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  // 🏁 1. Drift Icons - Lightweight, RWD, high-revving machines
  {
    id: "kaminari_sxr",
    name: "Kaminari SX‑R",
    manufacturer: "Kaminari",
    year: 1996,
    drivetrain: "RWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 152,
      acceleration: 78,
      handling: 88,
      grip: 82,
      stability: 74,
      spResistance: 70
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  {
    id: "raiden_frs",
    name: "Raiden FR‑S",
    manufacturer: "Raiden",
    year: 2013,
    drivetrain: "RWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 140,
      acceleration: 72,
      handling: 94,
      grip: 88,
      stability: 80,
      spResistance: 65
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  // 🏎️ 2. Highway Monsters - Wangan killers with huge power and speed
  {
    id: "raikou_gtr_vspec",
    name: "Raikou GT‑R V‑Spec",
    manufacturer: "Raikou",
    year: 1997,
    drivetrain: "AWD",
    weightClass: "heavy",
    baseStats: {
      topSpeed: 170,
      acceleration: 92,
      handling: 86,
      grip: 94,
      stability: 95,
      spResistance: 92
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  {
    id: "okami_zr",
    name: "Okami Z‑R",
    manufacturer: "Okami",
    year: 1998,
    drivetrain: "RWD",
    weightClass: "medium",
    baseStats: {
      topSpeed: 168,
      acceleration: 85,
      handling: 82,
      grip: 80,
      stability: 88,
      spResistance: 78
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  // 🏔️ 3. Touge Legends - Lightweight, agile, perfect for mountain passes
  {
    id: "hachiroku_rs",
    name: "Hachiroku RS",
    manufacturer: "Takumi Motors",
    year: 1985,
    drivetrain: "RWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 128,
      acceleration: 68,
      handling: 98,
      grip: 90,
      stability: 70,
      spResistance: 60
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  {
    id: "shinra_type_s",
    name: "Shinra Type‑S",
    manufacturer: "Shinra",
    year: 1999,
    drivetrain: "FWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 138,
      acceleration: 76,
      handling: 90,
      grip: 86,
      stability: 72,
      spResistance: 68
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  // 👑 4. VIP / Sleeper Cars - Big, heavy, luxurious but secretly fast
  {
    id: "imperial_crown_30t",
    name: "Imperial Crown 3.0T",
    manufacturer: "Imperial",
    year: 2003,
    drivetrain: "RWD",
    weightClass: "heavy",
    baseStats: {
      topSpeed: 155,
      acceleration: 80,
      handling: 70,
      grip: 75,
      stability: 90,
      spResistance: 85
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  {
    id: "shogun_vipx",
    name: "Shogun VIP‑X",
    manufacturer: "Shogun",
    year: 1999,
    drivetrain: "RWD",
    weightClass: "heavy",
    baseStats: {
      topSpeed: 150,
      acceleration: 78,
      handling: 72,
      grip: 74,
      stability: 88,
      spResistance: 82
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  // 👻 5. Wanderer-Tier Cars - Rare, mysterious, powerful
  {
    id: "midnight_specter",
    name: "Midnight Specter",
    manufacturer: "Okami",
    year: 1978,
    drivetrain: "RWD",
    weightClass: "light",
    baseStats: {
      topSpeed: 185,
      acceleration: 95,
      handling: 88,
      grip: 82,
      stability: 78,
      spResistance: 95
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  },

  {
    id: "raikou_phantom",
    name: "Raikou Phantom GT‑R",
    manufacturer: "Raikou",
    year: 1994,
    drivetrain: "AWD",
    weightClass: "medium",
    baseStats: {
      topSpeed: 178,
      acceleration: 92,
      handling: 90,
      grip: 96,
      stability: 92,
      spResistance: 94
    },
    upgradeSlots: fullSlots,
    visualSlots: fullVisuals
  }
];
