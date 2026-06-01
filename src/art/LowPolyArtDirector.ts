/**
 * Low-Poly Art Director - Visual style guidelines and color palettes
 */

import * as THREE from 'three';

export interface ColorPalette {
  name: string;
  primary: number;
  secondary: number;
  accent: number;
  background: number;
  foreground: number;
  vehicles: number[];
  environment: number[];
}

export interface MaterialPreset {
  color: number;
  flatShading: boolean;
  shininess: number;
  emissive?: number;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}

/**
 * Art direction controller for consistent low-poly visual style
 */
export class LowPolyArtDirector {
  private currentPalette: ColorPalette;
  private readonly palettes: Map<string, ColorPalette> = new Map();

  constructor() {
    this.currentPalette = this.createDefaultPalette();
    this.setupPalettes();
  }

  /**
   * Create the default sunset highway palette
   */
  private createDefaultPalette(): ColorPalette {
    return {
      name: 'Sunset Highway',
      primary: 0xfacc15, // Yellow/gold
      secondary: 0x3b82f6, // Blue
      accent: 0xef4444, // Red
      background: 0x87ceeb, // Sky blue
      foreground: 0x1e293b, // Dark slate
      vehicles: [
        0xcc3333, // Red
        0x3366cc, // Blue
        0x339933, // Green
        0xccaa00, // Yellow
        0xeeeeee, // White
        0x222222, // Black
        0xaaaaaa, // Silver
        0xff6600, // Orange
      ],
      environment: [
        0x333333, // Road asphalt
        0x3d5c3d, // Grass
        0x666677, // Buildings gray
        0x554433, // Buildings brown
        0x226622, // Trees
        0x443322, // Trunks
      ],
    };
  }

  /**
   * Setup all available color palettes
   */
  private setupPalettes(): void {
    // Sunset Highway (default)
    this.palettes.set('sunset', this.createDefaultPalette());

    // Night City
    this.palettes.set('night', {
      name: 'Night City',
      primary: 0x00ffff, // Cyan neon
      secondary: 0xff00ff, // Magenta neon
      accent: 0xffff00, // Yellow neon
      background: 0x0a0a1a, // Dark blue-black
      foreground: 0x1a1a2e, // Dark purple-blue
      vehicles: [
        0xff3366, // Hot pink-red
        0x33ffff, // Cyan
        0xffaa00, // Amber
        0x9933ff, // Purple
        0x00ff66, // Green
        0xffffff, // White
        0x1a1a2e, // Dark
      ],
      environment: [
        0x1a1a2e, // Dark road
        0x0f0f1a, // Dark grass
        0x2a2a3e, // Dark buildings
        0x1a3a1a, // Dark trees
        0x0a2a0a, // Dark foliage
      ],
    });

    // Desert Run
    this.palettes.set('desert', {
      name: 'Desert Run',
      primary: 0xff8c00, // Dark orange
      secondary: 0x4169e1, // Royal blue
      accent: 0xdc143c, // Crimson
      background: 0xffd700, // Golden sky
      foreground: 0x8b4513, // Saddle brown
      vehicles: [
        0xdd4444, // Rust red
        0x4488cc, // Desert blue
        0xccaa44, // Sand yellow
        0x88cc88, // Sage green
        0xf5f5dc, // Beige
        0x666666, // Gray
      ],
      environment: [
        0x4a4a4a, // Asphalt
        0xc2b280, // Sand
        0xd2b48c, // Tan
        0x8b7355, // Brown rock
        0x556b2f, // Dark olive
      ],
    });

    // Forest Drive
    this.palettes.set('forest', {
      name: 'Forest Drive',
      primary: 0x228b22, // Forest green
      secondary: 0x8b4513, // Saddle brown
      accent: 0xff6347, // Tomato
      background: 0x87ceeb, // Sky blue
      foreground: 0x2d5016, // Dark green
      vehicles: [
        0x8b0000, // Dark red
        0x006400, // Dark green
        0xb8860b, // Dark goldenrod
        0x4682b4, // Steel blue
        0xf0e68c, // Khaki
        0x696969, // Dim gray
      ],
      environment: [
        0x333333, // Road
        0x228b22, // Forest green
        0x006400, // Dark green
        0x8b4513, // Brown
        0xa0522d, // Sienna
      ],
    });
  }

  /**
   * Set the active color palette
   */
  setPalette(name: string): void {
    const palette = this.palettes.get(name);
    if (palette) {
      this.currentPalette = palette;
    }
  }

  /**
   * Get the current palette
   */
  getPalette(): ColorPalette {
    return this.currentPalette;
  }

  /**
   * Get a random vehicle color from the palette
   */
  getRandomVehicleColor(): number {
    const colors = this.currentPalette.vehicles;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Apply palette to scene background
   */
  applyToScene(scene: THREE.Scene): void {
    scene.background = new THREE.Color(this.currentPalette.background);
    scene.fog = new THREE.Fog(
      this.currentPalette.background,
      50,
      200
    );
  }

  /**
   * Create a material using the current palette
   */
  createMaterial(preset: MaterialPreset): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: preset.color,
      flatShading: preset.flatShading ?? true,
      shininess: preset.shininess ?? 30,
      emissive: preset.emissive,
      emissiveIntensity: preset.emissiveIntensity,
      transparent: preset.transparent,
      opacity: preset.opacity,
    });
  }

  /**
   * Get standardized low-poly vehicle material
   */
  createVehicleMaterial(color?: number): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: color ?? this.getRandomVehicleColor(),
      flatShading: true,
      shininess: 40,
    });
  }

  /**
   * Get standardized road material
   */
  createRoadMaterial(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: this.currentPalette.environment[0],
      flatShading: true,
      shininess: 10,
    });
  }

  /**
   * Get standardized foliage material
   */
  createFoliageMaterial(): THREE.MeshPhongMaterial {
    const greenIndex = Math.min(2, this.currentPalette.environment.length - 1);
    return new THREE.MeshPhongMaterial({
      color: this.currentPalette.environment[greenIndex],
      flatShading: true,
      shininess: 10,
    });
  }

  /**
   * Get standardized building material
   */
  createBuildingMaterial(): THREE.MeshPhongMaterial {
    const buildingIndex = Math.min(2, this.currentPalette.environment.length - 1);
    return new THREE.MeshPhongMaterial({
      color: this.currentPalette.environment[buildingIndex],
      flatShading: true,
      shininess: 20,
    });
  }

  /**
   * Create emissive material for lights/neon
   */
  createEmissiveMaterial(color?: number, intensity: number = 0.5): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0x000000,
      emissive: color ?? this.currentPalette.accent,
      emissiveIntensity: intensity,
      flatShading: true,
    });
  }

  /**
   * Generate a low-poly sky gradient
   */
  createSkyGradient(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(500, 16, 16);
    
    // Create vertex colors for gradient
    const positions = geometry.attributes.position.array;
    const colors: number[] = [];
    
    const topColor = new THREE.Color(this.currentPalette.background);
    const bottomColor = new THREE.Color(this.currentPalette.foreground);
    
    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      const t = (y + 500) / 1000; // Normalize to 0-1
      
      const color = bottomColor.clone().lerp(topColor, t);
      colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
    });
    
    return new THREE.Mesh(geometry, material);
  }

  /**
   * Get art style guidelines as text
   */
  getStyleGuidelines(): string {
    return `
LOW-POLY ART DIRECTION GUIDELINES
==================================

1. GEOMETRY
   - Keep polygon counts minimal (50-500 tris per vehicle)
   - Use flat shading exclusively
   - Avoid smooth normals
   - Emphasize strong silhouettes
   - Simple primitive shapes (boxes, cylinders, cones)

2. COLORS
   - Current palette: ${this.currentPalette.name}
   - Primary: #${this.currentPalette.primary.toString(16)}
   - Secondary: #${this.currentPalette.secondary.toString(16)}
   - Accent: #${this.currentPalette.accent.toString(16)}
   - Use saturated but not neon colors (except night mode)
   - Limit palette to 8-12 colors per scene

3. MATERIALS
   - Shininess: 10-40 (matte to slight gloss)
   - No complex PBR workflows
   - Minimal or no texture maps
   - Vertex colors for gradients when needed

4. LIGHTING
   - Simple three-point lighting
   - Hemisphere light for ambient
   - Single directional light for sun/moon
   - Emissive materials for lights

5. PERFORMANCE
   - Max 2048px textures
   - Power-of-two texture dimensions
   - Shared materials where possible
   - Instancing for repeated objects
    `.trim();
  }
}

// Export preset configurations
export const LOW_POLY_PRESETS = {
  VEHICLE_SHININESS: 40,
  ENVIRONMENT_SHININESS: 15,
  ROAD_SHININESS: 10,
  GLASS_OPACITY: 0.6,
  GLASS_SHININESS: 80,
  EMISSIVE_INTENSITY: 0.5,
  MAX_POLYGONS_PER_VEHICLE: 500,
  MAX_POLYGONS_PER_PROP: 100,
};
