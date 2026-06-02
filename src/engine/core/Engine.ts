/**
 * Engine Core - Main Game Engine Controller
 * Manages all subsystems, game loop, and lifecycle
 */

import * as THREE from 'three';
import { Renderer } from '../rendering/Renderer';
import { SceneGraph } from './SceneGraph';
import { AssetLoader, AssetManifest, LoadedAssets } from '../assets/AssetLoader';
import { InputSystem } from '../systems/InputSystem';
import { CameraSystem } from '../systems/CameraSystem';
import { CullingSystem } from '../systems/CullingSystem';
import { LODSystem } from '../systems/LODSystem';
import { Profiler } from './Profiler';
import { DebugHUD, DebugHUDConfig } from './ui/DebugHUD';
import { LowPolyArtDirector } from '../../art/LowPolyArtDirector';

export interface EngineConfig {
  /** Target FPS for the game loop */
  targetFPS: number;
  /** Enable WebGL2/WebGPU features */
  useWebGL2: boolean;
  /** Enable antialiasing */
  antialias: boolean;
  /** Shadow quality: 'off' | 'low' | 'medium' | 'high' */
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  /** Maximum texture size */
  maxTextureSize: number;
  /** Enable frustum culling */
  enableCulling: boolean;
  /** Enable LOD system */
  enableLOD: boolean;
  /** Debug mode */
  debug: boolean;
  /** Enable profiler (default: false for zero overhead) */
  enableProfiler: boolean;
  /** Debug HUD configuration */
  debugHUD?: Partial<DebugHUDConfig>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unusedConfigCheck = (_cfg: EngineConfig) => {};

export interface EngineStats {
  fps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameTime: number;
  drawCalls: number;
  triangleCount: number;
  textureMemoryMB: number;
  activeObjects: number;
  culledObjects: number;
  instancesRendered: number;
  staticObjects: number;
  dynamicObjects: number;
}

export class Engine {
  public readonly scene: THREE.Scene;
  public readonly renderer: Renderer;
  public readonly sceneGraph: SceneGraph;
  public readonly assetLoader: AssetLoader;
  public readonly inputSystem: InputSystem;
  public readonly cameraSystem: CameraSystem;
  public readonly cullingSystem: CullingSystem;
  public readonly lodSystem: LODSystem;
  public readonly artDirector: LowPolyArtDirector;
  
  private readonly profiler: Profiler;
  private debugHUD?: DebugHUD;
  private config: EngineConfig;
  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private accumulator: number = 0;
  private onFrameCallback?: (deltaTime: number) => void;
  
  constructor(
    canvas: HTMLCanvasElement,
    config: Partial<EngineConfig> = {}
  ) {
    this.config = {
      targetFPS: 60,
      useWebGL2: true,
      antialias: true,
      shadowQuality: 'medium',
      maxTextureSize: 2048,
      enableCulling: true,
      enableLOD: true,
      debug: false,
      enableProfiler: false,
      ...config,
    };

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    
    // Initialize renderer
    this.renderer = new Renderer(canvas, this.config);
    
    // Initialize scene graph
    this.sceneGraph = new SceneGraph();
    
    // Initialize asset loader
    this.assetLoader = new AssetLoader();
    
    // Initialize input system
    this.inputSystem = new InputSystem();
    
    // Initialize camera system
    this.cameraSystem = new CameraSystem(this.renderer.camera);
    
    // Initialize culling system
    this.cullingSystem = new CullingSystem(this.renderer.camera);
    
    // Initialize LOD system
    this.lodSystem = new LODSystem();
    
    // Initialize art director
    this.artDirector = new LowPolyArtDirector();
    
    // Initialize profiler (only if enabled)
    this.profiler = new Profiler({
      enabled: this.config.enableProfiler,
    });
    
    // Initialize debug HUD if configured
    if (this.config.debug || this.config.debugHUD?.visible) {
      this.setupDebugHUD();
    }
    
    // Setup default lighting
    this.setupDefaultLighting();
  }
  
  /**
   * Setup default low-poly optimized lighting
   */
  private setupDefaultLighting(): void {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Main directional light (sun)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    
    if (this.config.shadowQuality !== 'off') {
      dirLight.castShadow = true;
      
      const shadowMapSize = this.getShadowMapSize();
      dirLight.shadow.mapSize.width = shadowMapSize;
      dirLight.shadow.mapSize.height = shadowMapSize;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 500;
      dirLight.shadow.camera.left = -100;
      dirLight.shadow.camera.right = 100;
      dirLight.shadow.camera.top = 100;
      dirLight.shadow.camera.bottom = -100;
    }
    
    this.scene.add(dirLight);
    
    // Hemisphere light for sky/ground color variation
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.4);
    this.scene.add(hemiLight);
  }
  
  /**
   * Get shadow map size based on quality setting
   */
  private getShadowMapSize(): number {
    switch (this.config.shadowQuality) {
      case 'high': return 2048;
      case 'medium': return 1024;
      case 'low': return 512;
      default: return 512;
    }
  }
  
  /**
   * Load assets from manifest
   */
  async loadAssets(manifest: AssetManifest): Promise<LoadedAssets> {
    return this.assetLoader.load(manifest);
  }
  
  /**
   * Start the engine game loop
   */
  start(onFrame?: (deltaTime: number) => void): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.onFrameCallback = onFrame;
    
    this.gameLoop();
  }
  
  /**
   * Stop the engine game loop
   */
  stop(): void {
    this.isRunning = false;
    this.onFrameCallback = undefined;
  }
  
  /**
   * Main game loop with fixed timestep
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;
    
    // Cap delta time to prevent spiral of death
    deltaTime = Math.min(deltaTime, 0.1);
    
    // Fixed timestep accumulation
    const fixedDeltaTime = 1 / this.config.targetFPS;
    this.accumulator += deltaTime;
    
    while (this.accumulator >= fixedDeltaTime) {
      this.update(fixedDeltaTime);
      this.accumulator -= fixedDeltaTime;
    }
    
    this.render();
    this.profiler.endFrame();
    
    requestAnimationFrame(this.gameLoop);
  };
  
  /**
   * Update all systems
   */
  private update(deltaTime: number): void {
    // Start profiling frame
    this.profiler.beginFrame();
    this.profiler.resetFrameCounters();
    
    // Update input
    this.inputSystem.update(deltaTime);
    
    // Update camera
    this.cameraSystem.update(deltaTime);
    
    // Update scene graph
    this.sceneGraph.update(deltaTime);
    
    // Perform culling if enabled
    if (this.config.enableCulling) {
      this.cullingSystem.update(this.sceneGraph);
      // Report culled count to profiler
      this.profiler.setObjectsCulled(this.cullingSystem.getCulledCount());
    }
    
    // Update LODs if enabled
    if (this.config.enableLOD) {
      this.lodSystem.update(this.sceneGraph, this.cameraSystem.camera);
    }
    
    // Call user frame callback
    if (this.onFrameCallback) {
      this.onFrameCallback(deltaTime);
    }
    
    // Update renderer stats in profiler
    this.profiler.setDrawCalls(this.renderer.getDrawCalls());
    this.profiler.setTriangles(this.renderer.getTriangleCount());
  }
  
  /**
   * Render the scene
   */
  private render(): void {
    this.renderer.render(this.scene, this.cameraSystem.camera);
  }
  
  /**
   * Add an object to the scene
   */
  addObject(object: THREE.Object3D, name?: string): void {
    this.sceneGraph.addNode(object, name);
    this.scene.add(object);
  }
  
  /**
   * Remove an object from the scene
   */
  removeObject(object: THREE.Object3D): void {
    this.sceneGraph.removeNode(object);
    this.scene.remove(object);
  }
  
  /**
   * Set the active camera target
   */
  setCameraTarget(target: THREE.Object3D): void {
    this.cameraSystem.setTarget(target);
  }
  
  /**
   * Get current engine statistics
   */
  getStats(): EngineStats {
    const profilerStats = this.profiler.getStats();
    return {
      fps: profilerStats.fps,
      avgFps: profilerStats.avgFps,
      minFps: profilerStats.minFps,
      maxFps: profilerStats.maxFps,
      frameTime: profilerStats.frameTimeMs,
      drawCalls: profilerStats.drawCalls,
      triangleCount: profilerStats.triangles,
      textureMemoryMB: this.renderer.getTextureMemoryMB(),
      activeObjects: this.sceneGraph.getActiveCount(),
      culledObjects: profilerStats.objectsCulled,
      instancesRendered: profilerStats.instancesRendered,
      staticObjects: profilerStats.staticObjects,
      dynamicObjects: profilerStats.dynamicObjects,
    };
  }
  
  /**
   * Resize the rendering canvas
   */
  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
    this.cameraSystem.setAspect(width / height);
  }
  
  /**
   * Toggle debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.config.debug = enabled;
    this.renderer.setDebugMode(enabled);
    
    // Setup or teardown debug HUD based on mode
    if (enabled && !this.debugHUD) {
      this.setupDebugHUD();
    } else if (!enabled && this.debugHUD) {
      this.debugHUD.dispose();
      this.debugHUD = undefined;
    }
  }
  
  /**
   * Setup debug HUD
   */
  private setupDebugHUD(): void {
    if (this.debugHUD) return;
    
    // Enable profiler for HUD
    this.profiler.setEnabled(true);
    
    this.debugHUD = new DebugHUD(this.profiler, {
      visible: true,
      ...this.config.debugHUD,
    });
    this.debugHUD.mount();
  }
  
  /**
   * Toggle debug HUD visibility
   */
  toggleDebugHUD(): void {
    if (this.debugHUD) {
      this.debugHUD.toggle();
    } else {
      this.setupDebugHUD();
    }
  }
  
  /**
   * Get the profiler instance
   */
  getProfiler(): Profiler {
    return this.profiler;
  }
  
  /**
   * Get the debug HUD instance
   */
  getDebugHUD(): DebugHUD | undefined {
    return this.debugHUD;
  }
  
  /**
   * Set object counts for profiling (call when adding/removing objects)
   */
  setObjectCounts(staticCount: number, dynamicCount: number): void {
    this.profiler.setStaticObjects(staticCount);
    this.profiler.setDynamicObjects(dynamicCount);
  }
  
  /**
   * Add to instances rendered count (call from instanced mesh managers)
   */
  addInstancesRendered(count: number): void {
    this.profiler.addInstancesRendered(count);
  }
  
  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    this.stop();
    this.renderer.dispose();
    this.assetLoader.dispose();
    this.sceneGraph.dispose();
    this.inputSystem.dispose();
    this.profiler.dispose();
    if (this.debugHUD) {
      this.debugHUD.dispose();
      this.debugHUD = undefined;
    }
  }
}
