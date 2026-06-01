/**
 * Main entry point for the render module.
 * Re-exports all renderer backends and common components.
 */

// WebGPU backend (primary)
export * from './webgpu/index';

// Common components (direct access)
export { Camera } from './common/Camera';
export { Transform } from './common/Transform';
