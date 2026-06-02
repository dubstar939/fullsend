/**
 * Example Usage - WebGPU Low-Poly Renderer
 * 
 * This file demonstrates how to use the WebGPU renderer in your game.
 * It shows basic setup, creating objects, and the render loop.
 */

import {
  WebGPURenderer,
  Camera,
  Transform,
  createCubeRenderable,
  createPlaneRenderable,
  createColoredMaterial,
  createCubeMesh,
  createPlaneMesh,
  WebGPUMesh,
  WebGPUMaterial,
  WebGPURenderable
} from './render/webgpu';

import type { ILight, LightType } from './types/engine.types';
import { LightType as LT } from './types/engine.types';

// ============================================================================
// Basic Setup Example
// ============================================================================

async function setupRenderer(): Promise<void> {
  // Get canvas element
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }
  
  // Create renderer with configuration
  const renderer = new WebGPURenderer({
    powerPreference: 'high-performance',
    clearColor: [0.1, 0.1, 0.15, 1.0], // Dark blue-gray background
    maxDirectionalLights: 4
  });
  
  // Initialize WebGPU
  await renderer.init(canvas);
  
  // Set up camera
  const camera = new Camera(
    [0, 5, 10],  // Position
    [0, 0, 0]    // Look at target
  );
  camera.fov = Math.PI / 4;  // 45 degrees
  camera.near = 0.1;
  camera.far = 100;
  
  renderer.setCamera(camera);
  
  // Set up lighting
  renderer.setAmbientLight([0.3, 0.3, 0.35], 0.6);
  
  // Add a directional light (sun)
  const sunLight: ILight = {
    type: LT.DIRECTIONAL,
    color: [1.0, 0.95, 0.8],  // Warm sunlight
    intensity: 1.2,
    direction: [-0.5, -1, -0.3]  // Coming from top-right-front
  };
  renderer.addLight(sunLight);
  
  // Create ground plane
  const ground = createPlaneRenderable(
    renderer.getDevice()!,
    [0.3, 0.5, 0.2, 1],  // Green color
    [0, 0, 0],           // Position
    20,                  // Width
    20                   // Height
  );
  renderer.addRenderable(ground);
  
  // Create some cubes
  for (let i = 0; i < 5; i++) {
    const cube = createCubeRenderable(
      renderer.getDevice()!,
      [Math.random(), Math.random(), Math.random(), 1],  // Random color
      [i * 2 - 4, 0.5, 0],  // Positions spread out
      1                     // Size
    );
    renderer.addRenderable(cube);
  }
  
  // Handle window resize
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    canvas.width = width;
    canvas.height = height;
    
    renderer.resize(width, height);
  });
  
  // Start render loop
  let lastTime = performance.now();
  
  function renderLoop(currentTime: number) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    lastTime = currentTime;
    
    // Update scene (rotation, animation, etc.)
    // ... your update logic here ...
    
    // Render frame
    renderer.renderFrame(deltaTime);
    
    requestAnimationFrame(renderLoop);
  }
  
  requestAnimationFrame(renderLoop);
  
  console.log('Renderer started!');
}

// ============================================================================
// Advanced: Custom Mesh Creation
// ============================================================================

function createCustomMeshExample(device: GPUDevice): WebGPURenderable {
  // Create a pyramid mesh manually
  const height = 1.5;
  const baseSize = 1;
  
  const vertexData = {
    position: [
      // Base (two triangles)
      -baseSize/2, 0, -baseSize/2,
       baseSize/2, 0, -baseSize/2,
       baseSize/2, 0,  baseSize/2,
      
      -baseSize/2, 0, -baseSize/2,
       baseSize/2, 0,  baseSize/2,
      -baseSize/2, 0,  baseSize/2,
      
      // Front face
      -baseSize/2, 0, -baseSize/2,
       baseSize/2, 0, -baseSize/2,
       0, height, 0,
      
      // Right face
       baseSize/2, 0, -baseSize/2,
       baseSize/2, 0,  baseSize/2,
       0, height, 0,
      
      // Back face
       baseSize/2, 0,  baseSize/2,
      -baseSize/2, 0,  baseSize/2,
       0, height, 0,
      
      // Left face
      -baseSize/2, 0,  baseSize/2,
      -baseSize/2, 0, -baseSize/2,
       0, height, 0
    ],
    normal: [
      // Base normals (pointing down)
      0, -1, 0,  0, -1, 0,  0, -1, 0,
      0, -1, 0,  0, -1, 0,  0, -1, 0,
      
      // Front face normal
      0, 0.5, -1,  0, 0.5, -1,  0, 0.5, -1,
      
      // Right face normal
      1, 0.5, 0,  1, 0.5, 0,  1, 0.5, 0,
      
      // Back face normal
      0, 0.5, 1,  0, 0.5, 1,  0, 0.5, 1,
      
      // Left face normal
      -1, 0.5, 0,  -1, 0.5, 0,  -1, 0.5, 0
    ]
  };
  
  const mesh = new WebGPUMesh(device, { name: 'Pyramid' });
  mesh.init(vertexData);
  
  const material = new WebGPUMaterial({
    name: 'PyramidMaterial',
    color: [1, 0.8, 0.2, 1],  // Gold color
    roughness: 0.3,
    metalness: 0.8,
    useFlatShading: true
  });
  
  const transform = new Transform([0, 0, 0]);
  
  return new WebGPURenderable({
    mesh,
    material,
    transform
  });
}

// ============================================================================
// Animation Example
// ============================================================================

class AnimatedScene {
  private renderer: WebGPURenderer;
  private cubes: WebGPURenderable[] = [];
  private time: number = 0;
  
  constructor(renderer: WebGPURenderer) {
    this.renderer = renderer;
  }
  
  addAnimatedCube(color: [number, number, number, number], position: [number, number, number]): void {
    const cube = createCubeRenderable(
      this.renderer.getDevice()!,
      color,
      position
    );
    this.cubes.push(cube);
    this.renderer.addRenderable(cube);
  }
  
  update(deltaTime: number): void {
    this.time += deltaTime;
    
    // Rotate cubes around their Y axis
    for (let i = 0; i < this.cubes.length; i++) {
      const cube = this.cubes[i];
      cube.transform.setRotation(0, this.time * (i + 1) * 0.5, 0);
      cube.transform.markDirty();
    }
  }
}

// ============================================================================
// Backend Swapping Example
// ============================================================================

/**
 * Engine class that can swap between WebGL and WebGPU backends
 */
class GameEngine {
  private renderer: any; // IRenderer interface
  private backend: 'webgl' | 'webgpu' = 'webgpu';
  
  async init(canvas: HTMLCanvasElement, backend: 'webgl' | 'webgpu' = 'webgpu'): Promise<void> {
    this.backend = backend;
    
    if (backend === 'webgpu') {
      const { WebGPURenderer } = await import('./render/webgpu');
      this.renderer = new WebGPURenderer();
      await this.renderer.init(canvas);
    } else {
      // WebGL renderer would go here
      // const { WebGLRenderer } = await import('./render/webgl');
      // this.renderer = new WebGLRenderer();
      // await this.renderer.init(canvas);
      console.log('WebGL backend not yet implemented');
    }
  }
  
  setCamera(camera: any): void {
    this.renderer.setCamera(camera);
  }
  
  addRenderable(renderable: any): void {
    this.renderer.addRenderable(renderable);
  }
  
  renderFrame(deltaTime: number): void {
    this.renderer.renderFrame(deltaTime);
  }
}

// ============================================================================
// Run the example
// ============================================================================

// Uncomment to run:
// setupRenderer().catch(console.error);

export { setupRenderer, createCustomMeshExample, AnimatedScene, GameEngine };
