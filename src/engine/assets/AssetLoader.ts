/**
 * Asset Loader - Efficient asset loading with progress tracking
 */

import * as THREE from 'three';

export interface AssetManifest {
  /** Models to load */
  models?: ModelAsset[];
  /** Textures to load */
  textures?: TextureAsset[];
  /** Audio files to load */
  audio?: AudioAsset[];
  /** Environments/cubemaps */
  environments?: EnvironmentAsset[];
}

export interface ModelAsset {
  id: string;
  url: string;
  type: 'gltf' | 'glb' | 'obj' | 'fbx';
  generateLODs?: boolean;
  lodCount?: number;
}

export interface TextureAsset {
  id: string;
  url: string;
  type: 'diffuse' | 'normal' | 'roughness' | 'emissive';
  format?: 'jpeg' | 'png' | 'webp' | 'ktx2';
  powerOfTwo?: boolean;
}

export interface AudioAsset {
  id: string;
  url: string;
  type: 'sfx' | 'music' | 'ambient';
}

export interface EnvironmentAsset {
  id: string;
  url: string;
  type: 'cubemap' | 'hdr';
}

export interface LoadedAssets {
  models: Map<string, THREE.Group>;
  textures: Map<string, THREE.Texture>;
  audio: Map<string, HTMLAudioElement>;
  environments: Map<string, THREE.CubeTexture | THREE.DataTexture>;
}

export class AssetLoader {
  private loadedAssets: LoadedAssets = {
    models: new Map(),
    textures: new Map(),
    audio: new Map(),
    environments: new Map(),
  };

  private loadingPromises: Promise<void>[] = [];
  private onLoadProgress?: (_progress: number) => void;

  /**
   * Load all assets from manifest
   */
  async load(manifest: AssetManifest): Promise<LoadedAssets> {
    this.loadingPromises = [];

    // Load models
    if (manifest.models) {
      for (const model of manifest.models) {
        this.loadingPromises.push(this.loadModel(model));
      }
    }

    // Load textures
    if (manifest.textures) {
      for (const texture of manifest.textures) {
        this.loadingPromises.push(this.loadTexture(texture));
      }
    }

    // Load audio
    if (manifest.audio) {
      for (const audio of manifest.audio) {
        this.loadingPromises.push(this.loadAudio(audio));
      }
    }

    // Load environments
    if (manifest.environments) {
      for (const env of manifest.environments) {
        this.loadingPromises.push(this.loadEnvironment(env));
      }
    }

    // Wait for all assets to load
    await Promise.all(this.loadingPromises);

    return this.loadedAssets;
  }

  /**
   * Load a single model
   */
  private async loadModel(asset: ModelAsset): Promise<void> {
    try {
      let group: THREE.Group;

      switch (asset.type) {
        case 'gltf':
        case 'glb':
          group = await this.loadGLTF(asset.url);
          break;
        case 'obj':
          group = await this.loadOBJ(asset.url);
          break;
        case 'fbx':
          group = await this.loadFBX(asset.url);
          break;
        default:
          throw new Error(`Unsupported model type: ${asset.type}`);
      }

      // Optimize the loaded model
      this.optimizeModel(group);

      this.loadedAssets.models.set(asset.id, group);
    } catch (error) {
      console.error(`Failed to load model ${asset.id}:`, error);
      throw error;
    }
  }

  /**
   * Load GLTF/GLB model
   */
  private async loadGLTF(url: string): Promise<THREE.Group> {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        reject
      );
    });
  }

  /**
   * Load OBJ model
   */
  private async loadOBJ(url: string): Promise<THREE.Group> {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
    const loader = new OBJLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (obj) => resolve(obj),
        undefined,
        reject
      );
    });
  }

  /**
   * Load FBX model
   */
  private async loadFBX(url: string): Promise<THREE.Group> {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const loader = new FBXLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (fbx) => resolve(fbx as THREE.Group),
        undefined,
        reject
      );
    });
  }

  /**
   * Load a texture with optimization
   */
  private async loadTexture(asset: TextureAsset): Promise<void> {
    try {
      const texture = new THREE.TextureLoader().load(asset.url);
      
      // Apply optimizations
      if (asset.powerOfTwo) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = this.nextPowerOfTwo((texture.image as HTMLImageElement).width);
        canvas.height = this.nextPowerOfTwo((texture.image as HTMLImageElement).height);
        ctx.drawImage(texture.image as HTMLImageElement, 0, 0, canvas.width, canvas.height);
        texture.image = canvas;
      }
      
      // Set appropriate encoding
      if (asset.type === 'diffuse') {
        texture.colorSpace = THREE.SRGBColorSpace;
      }
      
      // Generate mipmaps
      texture.generateMipmaps = true;
      
      this.loadedAssets.textures.set(asset.id, texture);
    } catch (error) {
      console.error(`Failed to load texture ${asset.id}:`, error);
      throw error;
    }
  }

  /**
   * Load audio file
   */
  private async loadAudio(asset: AudioAsset): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = asset.url;
      
      audio.addEventListener('canplaythrough', () => {
        this.loadedAssets.audio.set(asset.id, audio);
        resolve();
      });
      
      audio.addEventListener('error', reject);
      audio.load();
    });
  }

  /**
   * Load environment map
   */
  private async loadEnvironment(asset: EnvironmentAsset): Promise<void> {
    try {
      if (asset.type === 'cubemap') {
        const texture = new THREE.CubeTextureLoader().load([
          `${asset.url}/px.jpg`,
          `${asset.url}/nx.jpg`,
          `${asset.url}/py.jpg`,
          `${asset.url}/ny.jpg`,
          `${asset.url}/pz.jpg`,
          `${asset.url}/nz.jpg`,
        ]);
        texture.colorSpace = THREE.SRGBColorSpace;
        this.loadedAssets.environments.set(asset.id, texture);
      }
    } catch (error) {
      console.error(`Failed to load environment ${asset.id}:`, error);
      throw error;
    }
  }

  /**
   * Optimize a loaded model for low-poly rendering
   */
  private optimizeModel(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Enable flat shading for low-poly look
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => {
            if ('flatShading' in mat) {
              mat.flatShading = true;
              mat.needsUpdate = true;
            }
          });
        } else if ('flatShading' in child.material) {
          child.material.flatShading = true;
          child.material.needsUpdate = true;
        }

        // Cast shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Resize image to power of two dimensions
   */
  private resizeToPowerOfTwo(image: HTMLImageElement | ImageBitmap): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = this.nextPowerOfTwo(image.width);
    canvas.height = this.nextPowerOfTwo(image.height);
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /**
   * Get next power of two
   */
  private nextPowerOfTwo(value: number): number {
    return Math.pow(2, Math.ceil(Math.log2(value)));
  }

  /**
   * Get a loaded model by ID
   */
  getModel(id: string): THREE.Group | undefined {
    return this.loadedAssets.models.get(id);
  }

  /**
   * Get a loaded texture by ID
   */
  getTexture(id: string): THREE.Texture | undefined {
    return this.loadedAssets.textures.get(id);
  }

  /**
   * Get loaded audio by ID
   */
  getAudio(id: string): HTMLAudioElement | undefined {
    return this.loadedAssets.audio.get(id);
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (progress: number) => void): void {
    this.onLoadProgress = callback;
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    // Dispose textures
    for (const texture of this.loadedAssets.textures.values()) {
      texture.dispose();
    }

    // Dispose models
    for (const model of this.loadedAssets.models.values()) {
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    this.loadedAssets.models.clear();
    this.loadedAssets.textures.clear();
    this.loadedAssets.audio.clear();
    this.loadedAssets.environments.clear();
  }
}

/**
 * Asset Bundle - Pre-configured asset collections
 */
export class AssetBundle {
  static createVehicleBundle(): AssetManifest {
    return {
      models: [
        { id: 'sedan', url: '/assets/vehicles/sedan.glb', type: 'glb' },
        { id: 'suv', url: '/assets/vehicles/suv.glb', type: 'glb' },
        { id: 'truck', url: '/assets/vehicles/truck.glb', type: 'glb' },
        { id: 'police', url: '/assets/vehicles/police.glb', type: 'glb' },
      ],
      textures: [
        { id: 'vehicle_diffuse', url: '/assets/textures/vehicle_diffuse.webp', type: 'diffuse', format: 'webp' },
      ],
    };
  }

  static createEnvironmentBundle(): AssetManifest {
    return {
      models: [
        { id: 'tree', url: '/assets/props/tree.glb', type: 'glb' },
        { id: 'building', url: '/assets/props/building.glb', type: 'glb' },
        { id: 'streetlight', url: '/assets/props/streetlight.glb', type: 'glb' },
      ],
      textures: [
        { id: 'road_surface', url: '/assets/textures/road.webp', type: 'diffuse', format: 'webp' },
        { id: 'grass', url: '/assets/textures/grass.webp', type: 'diffuse', format: 'webp' },
      ],
    };
  }
}
