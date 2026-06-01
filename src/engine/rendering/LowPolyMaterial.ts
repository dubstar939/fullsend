/**
 * Low-Poly Material - Optimized flat-shaded materials for stylized rendering
 */

import * as THREE from 'three';

export interface LowPolyMaterialConfig {
  /** Base color */
  color: number | string;
  /** Enable flat shading (essential for low-poly look) */
  flatShading?: boolean;
  /** Emissive color for glowing effects */
  emissive?: number | string;
  /** Emissive intensity */
  emissiveIntensity?: number;
  /** Shininess (keep low for low-poly style) */
  shininess?: number;
  /** Transparency */
  transparent?: boolean;
  /** Opacity */
  opacity?: number;
  /** Wireframe mode for debug */
  wireframe?: boolean;
}

/**
 * Factory for creating optimized low-poly materials
 */
export class LowPolyMaterial {
  /**
   * Create a standard low-poly material
   */
  static createStandard(config: LowPolyMaterialConfig): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: config.color,
      flatShading: config.flatShading ?? true, // Flat shading is key for low-poly
      emissive: config.emissive ?? 0x000000,
      emissiveIntensity: config.emissiveIntensity ?? 0,
      shininess: config.shininess ?? 30, // Keep low for matte look
      transparent: config.transparent ?? false,
      opacity: config.opacity ?? 1,
      wireframe: config.wireframe ?? false,
    });
  }
  
  /**
   * Create a material with vertex colors for gradients
   */
  static createVertexColor(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      flatShading: true,
      vertexColors: true,
      shininess: 20,
    });
  }
  
  /**
   * Create an emissive material for lights/neon
   */
  static createEmissive(color: number | string, intensity: number = 0.5): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0x000000,
      emissive: typeof color === 'string' ? new THREE.Color(color) : color,
      emissiveIntensity: intensity,
      flatShading: true,
    });
  }
  
  /**
   * Create a road/asphalt material
   */
  static createRoad(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0x333333,
      flatShading: true,
      shininess: 10,
    });
  }
  
  /**
   * Create a lane marking material
   */
  static createLaneMarking(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: 0xffffff,
      flatShading: true,
    });
  }
  
  /**
   * Create a glass/window material
   */
  static createGlass(color?: number): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: color ?? 0x333344,
      flatShading: true,
      transparent: true,
      opacity: 0.6,
      shininess: 80,
    });
  }
  
  /**
   * Create a wheel/tire material
   */
  static createTire(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0x222222,
      flatShading: true,
      shininess: 15,
    });
  }
  
  /**
   * Create a metal/material for barriers
   */
  static createMetal(color?: number): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: color ?? 0x888888,
      flatShading: true,
      shininess: 60,
    });
  }
  
  /**
   * Create foliage material for trees
   */
  static createFoliage(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0x226622,
      flatShading: true,
      shininess: 10,
    });
  }
  
  /**
   * Create wood/trunk material
   */
  static createWood(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0x443322,
      flatShading: true,
      shininess: 15,
    });
  }
  
  /**
   * Batch create materials for instanced rendering
   */
  static createMaterialArray(colors: (number | string)[]): THREE.Material[] {
    return colors.map((color) => this.createStandard({ color, flatShading: true }));
  }
}

/**
 * Material preset definitions for consistent art direction
 */
export const MATERIAL_PRESETS = {
  // Vehicle colors
  VEHICLE_RED: { color: 0xcc3333, flatShading: true, shininess: 40 },
  VEHICLE_BLUE: { color: 0x3366cc, flatShading: true, shininess: 40 },
  VEHICLE_GREEN: { color: 0x339933, flatShading: true, shininess: 40 },
  VEHICLE_YELLOW: { color: 0xccaa00, flatShading: true, shininess: 40 },
  VEHICLE_WHITE: { color: 0xeeeeee, flatShading: true, shininess: 35 },
  VEHICLE_BLACK: { color: 0x222222, flatShading: true, shininess: 50 },
  VEHICLE_SILVER: { color: 0xaaaaaa, flatShading: true, shininess: 55 },
  
  // Environment
  ROAD: { color: 0x333333, flatShading: true, shininess: 10 },
  GRASS: { color: 0x3d5c3d, flatShading: true, shininess: 5 },
  SKY: { color: 0x87ceeb, flatShading: false },
  BUILDING_GRAY: { color: 0x666677, flatShading: true, shininess: 20 },
  BUILDING_BROWN: { color: 0x554433, flatShading: true, shininess: 15 },
  
  // Props
  TREE_FOLIAGE: { color: 0x226622, flatShading: true, shininess: 10 },
  TREE_TRUNK: { color: 0x443322, flatShading: true, shininess: 15 },
  STREETLIGHT: { color: 0x444444, flatShading: true, shininess: 30 },
  LIGHT_GLOW: { color: 0xffffcc, emissive: 0xffffcc, emissiveIntensity: 0.5 },
  
  // UI/Effects
  COIN: { color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.3, flatShading: true },
  NITRO: { color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.4, flatShading: true },
};

export type MaterialPreset = keyof typeof MATERIAL_PRESETS;
