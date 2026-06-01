/**
 * WebGPU Renderer Module - Barrel Exports
 * 
 * This module provides a complete WebGPU rendering backend for low-poly 3D games.
 * 
 * Quick Start:
 * ```typescript
 * import { WebGPURenderer, Camera, createTestCube, createTestPlane } from './render/webgpu';
 * 
 * const renderer = new WebGPURenderer();
 * await renderer.init(canvas);
 * 
 * const camera = new Camera({ position: [0, 5, 10], target: [0, 0, 0] });
 * renderer.setCamera(camera);
 * 
 * const cube = createTestCube(renderer, 'cube', [0, 0, 0]);
 * renderer.addRenderable(cube);
 * 
 * function animate(deltaTime: number) {
 *   renderer.renderFrame(deltaTime);
 *   requestAnimationFrame(animate);
 * }
 * requestAnimationFrame(animate);
 * ```
 */

// Core renderer
export { WebGPURenderer, createTestCube, createTestPlane } from './WebGPURenderer';
export type { WebGPURendererAPI } from './WebGPURenderer';

// Subsystems (for advanced use)
export { WebGPUDeviceManager } from './WebGPUDeviceManager';
export type { WebGPUContext } from './WebGPUDeviceManager';

export { WebGPUPipelineManager } from './WebGPUPipelineManager';
export type { PipelineConfig } from './WebGPUPipelineManager';

export { WebGPUBufferManager } from './WebGPUBufferManager';
export type { BufferHandle } from './WebGPUBufferManager';

export { WebGPUFrameGraph } from './WebGPUFrameGraph';
export type { RenderPassDescriptor } from './WebGPUFrameGraph';

// Scene objects
export { WebGPUMesh, createCubeMesh, createPlaneMesh } from './WebGPUMesh';
export type { MeshData } from './WebGPUMesh';

export { WebGPURenderable } from './WebGPURenderable';

// Shaders
export { LOWPOLY_SHADER_WGSL, SHARED_WGSL, createLowPolyShaderModule } from './shaders/lowpoly.wgsl';

// Common components (shared with other renderers)
export { Camera } from '../common/Camera';
export { Transform } from '../common/Transform';

// Types (re-export from types module)
export type {
  TransformData,
  CameraData,
  ProjectionType,
  MaterialData,
  DirectionalLight,
  AmbientLight,
  LightingData,
  Vertex,
  GeometryData,
  VertexAttribute,
  Renderable,
  ObjectUniforms,
  CameraUniforms,
  LightingUniforms,
  RendererConfig,
} from '../../types/renderer.types';

export {
  DEFAULT_MATERIAL,
  DEFAULT_LIGHTING,
  DEFAULT_RENDERER_CONFIG,
  LOWPOLY_VERTEX_LAYOUT,
  LOWPOLY_VERTEX_STRIDE,
  OBJECT_UNIFORM_SIZE,
  CAMERA_UNIFORM_SIZE,
  LIGHTING_UNIFORM_SIZE,
} from '../../types/renderer.types';
