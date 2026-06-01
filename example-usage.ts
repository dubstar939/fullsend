/**
 * Example usage of the WebGPU renderer.
 * This file demonstrates how to integrate the renderer into your game engine.
 */

import {
  WebGPURenderer,
  Camera,
  createTestCube,
  createTestPlane,
} from './render/webgpu';

// ============================================================================
// EXAMPLE: Basic Setup
// ============================================================================

export async function setupRenderer(
  canvas: HTMLCanvasElement
): Promise<{
  renderer: WebGPURenderer;
  camera: Camera;
}> {
  // Create renderer
  const renderer = new WebGPURenderer();

  // Initialize with canvas
  const success = await renderer.init(canvas, {
    clearColor: [0.1, 0.12, 0.15, 1],
    antialias: true,
  });

  if (!success) {
    throw new Error('Failed to initialize WebGPU renderer');
  }

  // Create camera
  const camera = new Camera({
    position: [5, 5, 10],
    target: [0, 0, 0],
    fov: Math.PI / 4,
    near: 0.1,
    far: 100,
  });

  renderer.setCamera(camera);

  return { renderer, camera };
}

// ============================================================================
// EXAMPLE: Scene Setup
// ============================================================================

export function setupScene(renderer: WebGPURenderer): void {
  // Add a ground plane
  const plane = createTestPlane(renderer, 'ground', [0, -1, 0], 20, 20);
  renderer.addRenderable(plane);

  // Add some cubes
  const cube1 = createTestCube(renderer, 'cube1', [0, 0, 0]);
  renderer.addRenderable(cube1);

  const cube2 = createTestCube(renderer, 'cube2', [2, 0, 0]);
  cube2.material.color = [0.2, 0.6, 0.9, 1];
  renderer.addRenderable(cube2);

  const cube3 = createTestCube(renderer, 'cube3', [-2, 0, 0]);
  cube3.material.color = [0.9, 0.3, 0.3, 1];
  renderer.addRenderable(cube3);

  // Configure lighting
  renderer.setLighting({
    directional: {
      direction: [0.5, -1, -0.3],
      color: [1, 0.98, 0.9],
      intensity: 1.0,
    },
    ambient: {
      color: [0.2, 0.25, 0.3],
      intensity: 0.5,
    },
  });
}

// ============================================================================
// EXAMPLE: Animation Loop
// ============================================================================

export function createAnimationLoop(
  renderer: WebGPURenderer,
  camera: Camera
): () => void {
  let lastTime = performance.now();
  let rotation = 0;

  const animate = (): void => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Rotate cubes
    rotation += deltaTime * 0.5;
    const cube1 = renderer.getRenderable('cube1');
    const cube2 = renderer.getRenderable('cube2');
    const cube3 = renderer.getRenderable('cube3');

    if (cube1) {
      cube1.transform.rotation = [0, rotation, 0];
      cube1.transform.markDirty();
    }
    if (cube2) {
      cube2.transform.rotation = [0, -rotation * 0.7, 0];
      cube2.transform.markDirty();
    }
    if (cube3) {
      cube3.transform.rotation = [rotation * 0.5, 0, rotation * 0.3];
      cube3.transform.markDirty();
    }

    // Render
    renderer.renderFrame(deltaTime);

    // Continue loop
    requestAnimationFrame(animate);
  };

  return animate;
}

// ============================================================================
// EXAMPLE: Full Integration
// ============================================================================

export async function runExample(canvas: HTMLCanvasElement): Promise<void> {
  try {
    // Setup
    const { renderer, camera } = await setupRenderer(canvas);
    setupScene(renderer);

    // Handle resize
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      renderer.resize(rect.width, rect.height);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    // Start animation
    const animate = createAnimationLoop(renderer, camera);
    requestAnimationFrame(animate);

    console.log('[Example] Renderer started successfully!');
  } catch (error) {
    console.error('[Example] Failed to start:', error);
  }
}

// ============================================================================
// EXAMPLE: Backend Swapping (WebGL vs WebGPU)
// ============================================================================

/**
 * Abstract renderer interface that both backends implement.
 * This allows easy swapping between WebGL and WebGPU.
 */
export interface IRenderer {
  init(canvas: HTMLCanvasElement): Promise<boolean>;
  setCamera(camera: Camera): void;
  addRenderable(obj: any): void;
  removeRenderable(id: string): void;
  renderFrame(deltaTime: number): void;
  dispose(): void;
}

/**
 * Factory function to create appropriate renderer based on support.
 */
export async function createRenderer(
  canvas: HTMLCanvasElement,
  preferWebGPU: boolean = true
): Promise<IRenderer> {
  if (preferWebGPU && navigator.gpu) {
    const renderer = new WebGPURenderer();
    await renderer.init(canvas);
    return renderer as unknown as IRenderer;
  } else {
    // Fallback to WebGL renderer (not implemented in this example)
    // const renderer = new WebGLRenderer();
    // await renderer.init(canvas);
    // return renderer;
    throw new Error('WebGL renderer not implemented in this example');
  }
}
