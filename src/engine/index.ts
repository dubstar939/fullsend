/**
 * Low-Poly 3D Engine - Core Module Exports
 * Production-grade modular architecture for WebGL/WebGPU
 */

// Core Engine
export { Engine } from './core/Engine';
export type { EngineConfig, EngineStats } from './core/Engine';

// Rendering Pipeline
export { Renderer } from './rendering/Renderer';
export { LowPolyMaterial } from './rendering/LowPolyMaterial';
export { InstancedMeshManager } from './rendering/InstancedMeshManager';

// WebGPU Adapter (Optional Backend)
export { 
  WebGpuGameRenderer, 
  createWebGPUCar, 
  createWebGPURoadSegment, 
  parseHexColor 
} from './rendering/WebGpuGameAdapter';

// Scene Graph
export { SceneGraph } from './core/SceneGraph';
export type { SceneNode, SceneNodeType } from './core/SceneGraph';

// Asset Management
export { AssetLoader } from './assets/AssetLoader';
export { AssetBundle } from './assets/AssetBundle';
export type { AssetManifest, LoadedAssets } from './assets/AssetLoader';

// Systems
export { InputSystem } from './systems/InputSystem';
export { CameraSystem } from './systems/CameraSystem';
export { CullingSystem } from './systems/CullingSystem';
export { LODSystem } from './systems/LODSystem';

// Utilities
export { ObjectPool } from './core/ObjectPool';
export { PerformanceMonitor } from './core/PerformanceMonitor';

// Art Direction
export { LowPolyArtDirector } from '../art/LowPolyArtDirector';
export type { ColorPalette, MaterialPreset } from '../art/LowPolyArtDirector';
