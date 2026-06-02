import { VisualPart } from "./car.types";

// 🏎️ 3. Aero Kits (Front/Rear/Side)

export const FRONT_BUMPERS: VisualPart[] = [
  {
    id: "fb_street",
    name: "Street Front Bumper",
    slot: "frontBumper",
    meshOverride: "fb_street.mesh"
  },
  {
    id: "fb_gt",
    name: "GT Aero Front",
    slot: "frontBumper",
    meshOverride: "fb_gt.mesh",
    rarity: "rare"
  },
  {
    id: "fb_wangan",
    name: "Wangan High‑Speed Nose",
    slot: "frontBumper",
    meshOverride: "fb_wangan.mesh",
    rarity: "legendary"
  }
];

export const SIDE_SKIRTS: VisualPart[] = [
  {
    id: "ss_street",
    name: "Street Skirts",
    slot: "sideSkirts",
    meshOverride: "ss_street.mesh"
  },
  {
    id: "ss_gt",
    name: "GT Skirts",
    slot: "sideSkirts",
    meshOverride: "ss_gt.mesh"
  }
];

export const REAR_BUMPERS: VisualPart[] = [
  {
    id: "rb_street",
    name: "Street Rear Bumper",
    slot: "rearBumper",
    meshOverride: "rb_street.mesh"
  },
  {
    id: "rb_diffuser",
    name: "Diffuser Rear",
    slot: "rearBumper",
    meshOverride: "rb_diffuser.mesh"
  }
];

// 🪶 4. Spoilers

export const SPOILERS: VisualPart[] = [
  {
    id: "sp_ducktail",
    name: "Ducktail Spoiler",
    slot: "spoiler",
    meshOverride: "sp_ducktail.mesh"
  },
  {
    id: "sp_gtwing",
    name: "GT Wing",
    slot: "spoiler",
    meshOverride: "sp_gtwing.mesh",
    rarity: "rare"
  },
  {
    id: "sp_wangan",
    name: "Wangan Low‑Drag Wing",
    slot: "spoiler",
    meshOverride: "sp_wangan.mesh",
    rarity: "legendary"
  }
];

// 🔥 5. Hoods

export const HOODS: VisualPart[] = [
  {
    id: "hood_stock",
    name: "Stock Hood",
    slot: "hood"
  },
  {
    id: "hood_carbon",
    name: "Carbon Hood",
    slot: "hood",
    meshOverride: "hood_carbon.mesh"
  },
  {
    id: "hood_vented",
    name: "Vented Hood",
    slot: "hood",
    meshOverride: "hood_vented.mesh"
  }
];

// 🛞 6. Wheels

export const WHEELS: VisualPart[] = [
  {
    id: "wh_te37",
    name: "TE‑37 Style",
    slot: "wheels",
    meshOverride: "wh_te37.mesh"
  },
  {
    id: "wh_meister",
    name: "Meister S1 Style",
    slot: "wheels",
    meshOverride: "wh_meister.mesh"
  },
  {
    id: "wh_deepdish",
    name: "Deep Dish",
    slot: "wheels",
    meshOverride: "wh_deepdish.mesh"
  }
];

// 🔊 7. Exhausts

export const EXHAUSTS: VisualPart[] = [
  {
    id: "ex_single",
    name: "Single Exit",
    slot: "exhaust",
    meshOverride: "ex_single.mesh"
  },
  {
    id: "ex_dual",
    name: "Dual Exit",
    slot: "exhaust",
    meshOverride: "ex_dual.mesh"
  },
  {
    id: "ex_blastpipes",
    name: "Blast Pipes",
    slot: "exhaust",
    meshOverride: "ex_blastpipes.mesh"
  }
];

// 🎨 8. Body Colors + Special Finishes

export const BODY_COLORS: VisualPart[] = [
  {
    id: "color_white",
    name: "Pure White",
    slot: "bodyColor",
    color: "#FFFFFF"
  },
  {
    id: "color_black",
    name: "Midnight Black",
    slot: "bodyColor",
    color: "#000000"
  },
  {
    id: "color_red",
    name: "Racing Red",
    slot: "bodyColor",
    color: "#D40000"
  },
  {
    id: "color_midnight_purple",
    name: "Midnight Purple",
    slot: "bodyColor",
    color: "#3A0A6A",
    rarity: "rare"
  },
  {
    id: "color_pearlescent",
    name: "Pearlescent White",
    slot: "bodyColor",
    color: "#F8F8FF",
    rarity: "legendary"
  }
];

// 🎨 9. Vinyl Layers (Decals)

export const VINYLS: VisualPart[] = [
  {
    id: "vinyl_stripes",
    name: "Racing Stripes",
    slot: "vinyl",
    textureOverride: "vinyl_stripes.png"
  },
  {
    id: "vinyl_kanjo",
    name: "Kanjo Style",
    slot: "vinyl",
    textureOverride: "vinyl_kanjo.png"
  },
  {
    id: "vinyl_bosozoku",
    name: "Bosozoku Flames",
    slot: "vinyl",
    textureOverride: "vinyl_bosozoku.png",
    rarity: "rare"
  }
];
