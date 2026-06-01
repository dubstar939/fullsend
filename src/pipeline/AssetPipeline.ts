/**
 * Asset Pipeline - Standardized import, optimization, and management
 * 
 * This module defines the complete asset pipeline for the low-poly 3D engine.
 */

// ============================================================================
// ASSET PIPELINE GUIDELINES
// ============================================================================

/**
 * FOLDER STRUCTURE
 * ================
 * /assets/
 * ├── models/
 * │   ├── vehicles/
 * │   │   ├── sedan.glb          # Player car (LOD0)
 * │   │   ├── sedan_lod1.glb     # LOD1 (50% polycount)
 * │   │   ├── sedan_lod2.glb     # LOD2 (25% polycount)
 * │   │   ├── suv.glb
 * │   │   ├── truck.glb
 * │   │   └── police.glb
 * │   ├── props/
 * │   │   ├── tree_low.glb       # <100 tris
 * │   │   ├── building_01.glb
 * │   │   ├── streetlight.glb
 * │   │   └── barrier.glb
 * │   └── environment/
 * │       ├── road_segment.glb
 * │       └── bridge.glb
 * ├── textures/
 * │   ├── vehicles/
 * │   │   └── vehicle_atlas.webp # 512x512, power-of-two
 * │   ├── environment/
 * │   │   ├── road_surface.webp  # 512x512, tileable
 * │   │   └── grass.webp         # 256x256, tileable
 * │   └── ui/
 * │       └── icons.webp
 * ├── audio/
 * │   ├── sfx/
 * │   │   ├── engine_idle.mp3
 * │   │   ├── engine_loop.mp3
 * │   │   ├── collision.mp3
 * │   │   └── coin_pickup.mp3
 * │   └── music/
 * │       └── soundtrack.mp3
 * └── manifests/
 *     ├── base_game.json
 *     └── premium_cars.json
 */

// ============================================================================
// MODEL IMPORT SETTINGS
// ============================================================================

export const MODEL_IMPORT_SETTINGS = {
  // GLTF/GLB export settings (Blender)
  gltf: {
    format: 'glb', // Binary for smaller file size
    compression: 'draco', // Enable Draco mesh compression
    textureFormat: 'webp', // WebP for web optimization
    textureSize: 512, // Max texture dimension
    applyModifiers: true, // Apply subdivision, etc.
    triangulate: true, // Ensure all faces are triangles
  },
  
  // Polygon budgets by category
  polyBudgets: {
    playerVehicle: 500,
    trafficVehicle: 300,
    propTree: 100,
    propBuilding: 200,
    propSmall: 50,
    environmentSegment: 1000,
  },
  
  // LOD generation settings
  lodSettings: {
    lod0Distance: 0,
    lod1Distance: 30,
    lod2Distance: 60,
    lod3Distance: 100,
    reductionRatio: 0.5, // Each LOD is 50% of previous
  },
};

// ============================================================================
// TEXTURE OPTIMIZATION
// ============================================================================

export const TEXTURE_OPTIMIZATION = {
  // Required formats and sizes
  formats: {
    diffuse: 'webp', // Primary format
    normal: 'png', // When needed
    roughness: 'webp', // Grayscale
    emissive: 'webp', // Grayscale
  },
  
  // Size constraints
  sizes: {
    maxDimension: 512, // Keep textures small
    powerOfTwo: true, // Required for mipmaps
    minDimension: 64,
  },
  
  // Compression settings
  compression: {
    quality: 80, // WebP quality
    alphaQuality: 90,
    method: 6, // Slowest but best compression
  },
  
  // Atlas guidelines
  atlas: {
    enabled: true,
    maxAtlasSize: 1024,
    padding: 2, // Pixels between textures
  },
};

// ============================================================================
// NAMING CONVENTIONS
// ============================================================================

export const NAMING_CONVENTIONS = {
  // File naming
  files: {
    model: '{category}_{name}_lod{level}.glb',
    texture: '{type}_{name}_{size}.{ext}',
    example: 'vehicle_sedan_lod0.glb',
  },
  
  // Mesh naming inside files
  meshes: {
    playerCar: 'player_car_body',
    wheel: 'wheel_{position}', // wheel_fl, wheel_fr, wheel_rl, wheel_rr
    window: 'window_{position}',
    light: 'light_{type}_{position}', // light_head_l, light_tail_r
  },
  
  // Material naming
  materials: {
    body: 'mat_body_{color}',
    glass: 'mat_glass',
    wheel: 'mat_wheel',
    light: 'mat_light_{type}',
  },
};

// ============================================================================
// ASSET VALIDATION
// ============================================================================

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export class AssetValidator {
  /**
   * Validate a model meets requirements
   */
  static validateModel(
    geometry: THREE.BufferGeometry,
    category: string
  ): ValidationResult {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
    };

    const triCount = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes.position.count / 3;

    const budget = MODEL_IMPORT_SETTINGS.polyBudgets[category as keyof typeof MODEL_IMPORT_SETTINGS.polyBudgets];

    if (triCount > budget) {
      result.passed = false;
      result.errors.push(
        `Triangle count (${triCount}) exceeds budget (${budget}) for ${category}`
      );
    } else if (triCount > budget * 0.8) {
      result.warnings.push(
        `Triangle count (${triCount}) approaching budget (${budget})`
      );
    }

    // Check for UVs
    if (!geometry.attributes.uv) {
      result.warnings.push('Missing UV coordinates');
    }

    // Check for normals
    if (!geometry.attributes.normal) {
      result.warnings.push('Missing normals (will be auto-generated)');
    }

    return result;
  }

  /**
   * Validate texture meets requirements
   */
  static validateTexture(
    image: HTMLImageElement,
    _type: string
  ): ValidationResult {
    const result: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
    };

    // Check power of two
    if (!this.isPowerOfTwo(image.width) || !this.isPowerOfTwo(image.height)) {
      result.passed = false;
      result.errors.push(
        `Texture dimensions (${image.width}x${image.height}) must be power of two`
      );
    }

    // Check max size
    if (
      image.width > TEXTURE_OPTIMIZATION.sizes.maxDimension ||
      image.height > TEXTURE_OPTIMIZATION.sizes.maxDimension
    ) {
      result.passed = false;
      result.errors.push(
        `Texture exceeds max dimension (${TEXTURE_OPTIMIZATION.sizes.maxDimension}px)`
      );
    }

    return result;
  }

  private static isPowerOfTwo(value: number): boolean {
    return (value & (value - 1)) === 0 && value !== 0;
  }
}

// ============================================================================
// BUILD PIPELINE
// ============================================================================

export class AssetPipeline {
  /**
   * Process all assets for production build
   */
  static async processAll(sourceDir: string, outputDir: string): Promise<void> {
    console.log('Starting asset pipeline...');
    
    // Step 1: Copy and compress models
    await this.processModels(sourceDir + '/models', outputDir + '/models');
    
    // Step 2: Optimize and atlas textures
    await this.processTextures(sourceDir + '/textures', outputDir + '/textures');
    
    // Step 3: Compress audio
    await this.processAudio(sourceDir + '/audio', outputDir + '/audio');
    
    // Step 4: Generate manifest
    await this.generateManifest(outputDir);
    
    console.log('Asset pipeline complete!');
  }

  private static async processModels(input: string, output: string): Promise<void> {
    // In production, this would:
    // 1. Load each model file
    // 2. Validate polygon counts
    // 3. Generate LODs
    // 4. Apply Draco compression
    // 5. Save optimized versions
    console.log(`Processing models from ${input} to ${output}`);
  }

  private static async processTextures(input: string, output: string): Promise<void> {
    // In production, this would:
    // 1. Load each texture
    // 2. Validate dimensions
    // 3. Create texture atlases
    // 4. Convert to WebP
    // 5. Generate mipmaps
    console.log(`Processing textures from ${input} to ${output}`);
  }

  private static async processAudio(input: string, output: string): Promise<void> {
    // In production, this would:
    // 1. Convert to MP3/OGG
    // 2. Normalize levels
    // 3. Apply compression
    console.log(`Processing audio from ${input} to ${output}`);
  }

  private static async generateManifest(outputDir: string): Promise<void> {
    // Generate asset manifest JSON
    const manifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      assets: {
        models: [],
        textures: [],
        audio: [],
      },
    };
    
    console.log(`Generating manifest in ${outputDir}`);
    // Would write manifest.json
  }
}

// ============================================================================
// RUNTIME ASSET BUNDLES
// ============================================================================

import * as THREE from 'three';

export interface AssetBundle {
  id: string;
  name: string;
  description: string;
  assets: {
    models: string[];
    textures: string[];
    audio: string[];
  };
  loadPriority: 'high' | 'medium' | 'low';
}

export const PREDEFINED_BUNDLES: AssetBundle[] = [
  {
    id: 'core',
    name: 'Core Game Assets',
    description: 'Essential assets required for gameplay',
    assets: {
      models: ['sedan', 'road_segment', 'barrier'],
      textures: ['road_surface', 'vehicle_atlas'],
      audio: ['engine_loop', 'collision'],
    },
    loadPriority: 'high',
  },
  {
    id: 'environment_city',
    name: 'City Environment',
    description: 'Urban environment props and textures',
    assets: {
      models: ['building_01', 'streetlight', 'sign'],
      textures: ['building_atlas', 'asphalt'],
      audio: ['city_ambient'],
    },
    loadPriority: 'medium',
  },
  {
    id: 'traffic',
    name: 'Traffic Vehicles',
    description: 'AI traffic vehicle models',
    assets: {
      models: ['suv', 'truck', 'police'],
      textures: ['vehicle_diffuse'],
      audio: [],
    },
    loadPriority: 'medium',
  },
];

/**
 * Lazy-load asset bundles on demand
 */
export class BundleLoader {
  private loadedBundles: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<void>> = new Map();

  async loadBundle(bundleId: string): Promise<void> {
    if (this.loadedBundles.has(bundleId)) {
      return; // Already loaded
    }

    if (this.loadingPromises.has(bundleId)) {
      return this.loadingPromises.get(bundleId); // Wait for existing load
    }

    const bundle = PREDEFINED_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) {
      throw new Error(`Bundle not found: ${bundleId}`);
    }

    const loadPromise = this.loadBundleAssets(bundle);
    this.loadingPromises.set(bundleId, loadPromise);

    await loadPromise;
    this.loadedBundles.add(bundleId);
    this.loadingPromises.delete(bundleId);
  }

  private async loadBundleAssets(bundle: AssetBundle): Promise<void> {
    // In production, this would load actual assets
    console.log(`Loading bundle: ${bundle.name}`);
    
    // Load models
    for (const modelId of bundle.assets.models) {
      await this.loadAsset('model', modelId);
    }
    
    // Load textures
    for (const textureId of bundle.assets.textures) {
      await this.loadAsset('texture', textureId);
    }
    
    // Load audio
    for (const audioId of bundle.assets.audio) {
      await this.loadAsset('audio', audioId);
    }
  }

  private async loadAsset(type: string, id: string): Promise<void> {
    // Placeholder for actual asset loading
    return new Promise((resolve) => {
      setTimeout(resolve, 100); // Simulate load time
    });
  }

  unloadBundle(bundleId: string): void {
    // Dispose assets from bundle
    this.loadedBundles.delete(bundleId);
  }
}
