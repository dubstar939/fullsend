/**
 * WebGPU Renderer Module Exports
 * 
 * Import from this file to access all WebGPU renderer components.
 */

// Main renderer
export { WebGPURenderer } from './WebGPURenderer';
export type { WebGPURendererConfig } from './WebGPURenderer';

// Managers
export { WebGPUDeviceManager } from './WebGPUDeviceManager';
export type { WebGPUDeviceConfig, WebGPUCanvasConfig } from './WebGPUDeviceManager';

export { WebGPUPipelineManager } from './WebGPUPipelineManager';
export type { PipelineConfig, PipelineKey } from './WebGPUPipelineManager';

export { WebGPUFrameGraph } from './WebGPUFrameGraph';
export type { RenderPassDescriptor, FrameGraphPass } from './WebGPUFrameGraph';

export { WebGPUBindGroupManager } from './WebGPUBindGroupManager';

// Scene objects
export { WebGPUMesh, createCubeMesh, createPlaneMesh } from './WebGPUMesh';
export type { MeshConfig } from './WebGPUMesh';

export { WebGPUMaterial, createColoredMaterial, createVertexColorMaterial, createEmissiveMaterial, createGroundMaterial } from './WebGPUMaterial';
export type { MaterialConfig } from './WebGPUMaterial';

export { WebGPURenderable, createCubeRenderable, createPlaneRenderable } from './WebGPURenderable';
export type { RenderableConfig } from './WebGPURenderable';

// Shaders
export { ShaderModules, getShaderModule, createShaderModule, createShaderModuleFromName, LowPolyEntryPoints } from './shaders/shaderModules';
export type { ShaderModule } from './shaders/shaderModules';
