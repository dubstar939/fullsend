/**
 * Shared type definitions for the engine
 * These types are used across WebGL and WebGPU renderers
 */

import { mat4, vec3 } from 'gl-matrix';

// ============================================================================
// Vector & Matrix Types (using gl-matrix for performance)
// ============================================================================

export type Vec3 = vec3;
export type Mat4 = mat4;

// ============================================================================
// Transform Component
// ============================================================================

export interface ITransform {
  position: Vec3;
  rotation: Vec3; // Euler angles in radians
  scale: Vec3;
  
  getMatrix(): Mat4;
  updateWorldMatrix(parent?: ITransform): void;
  getWorldMatrix(): Mat4;
}

// ============================================================================
// Camera
// ============================================================================

export interface ICamera {
  fov: number;
  near: number;
  far: number;
  aspect: number;
  
  position: Vec3;
  target: Vec3;
  up: Vec3;
  
  getViewMatrix(): Mat4;
  getProjectionMatrix(): Mat4;
  updateAspect(aspect: number): void;
}

// ============================================================================
// Mesh Data
// ============================================================================

export interface VertexAttribute {
  name: string;
  format: GPUVertexFormat;
  offset: number;
  location: number;
}

export interface VertexData {
  position: number[];      // [x, y, z, ...]
  normal?: number[];       // [nx, ny, nz, ...]
  uv?: number[];           // [u, v, ...]
  color?: number[];        // [r, g, b, a, ...]
}

export interface IMesh {
  vertexCount: number;
  indexCount?: number;
  
  getVertexBuffer(): GPUBuffer;
  getIndexBuffer(): GPUBuffer | null;
  getVertexLayout(): GPUVertexBufferLayout;
  dispose(): void;
}

// ============================================================================
// Material
// ============================================================================

export interface IMaterial {
  name: string;
  color: [number, number, number, number]; // RGBA 0-1
  roughness: number;
  metalness: number;
  emissive: [number, number, number];
  
  useFlatShading: boolean;
  useVertexColors: boolean;
  
  texture?: GPUTexture | null;
  
  getPipelineKey(): string;
}

// ============================================================================
// Renderable Object
// ============================================================================

export interface IRenderable {
  id: string;
  mesh: IMesh;
  material: IMaterial;
  transform: ITransform;
  visible: boolean;
  
  getBounds(): BoundingBox;
}

// ============================================================================
// Bounding Volume
// ============================================================================

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
  
  containsPoint(point: Vec3): boolean;
  intersects(other: BoundingBox): boolean;
}

export interface BoundingSphere {
  center: Vec3;
  radius: number;
}

// ============================================================================
// Light Types
// ============================================================================

export enum LightType {
  DIRECTIONAL = 'directional',
  POINT = 'point',
  SPOT = 'spot'
}

export interface ILight {
  type: LightType;
  color: [number, number, number];
  intensity: number;
  
  // For directional light
  direction?: Vec3;
  
  // For point/spot lights
  position?: Vec3;
  range?: number;
  
  // For spot lights
  innerAngle?: number;
  outerAngle?: number;
}

// ============================================================================
// Renderer Interface (for backend swapping)
// ============================================================================

export interface IRenderer {
  init(canvas: HTMLCanvasElement): Promise<void>;
  setCamera(camera: ICamera): void;
  addRenderable(renderable: IRenderable): void;
  removeRenderable(renderable: IRenderable): void;
  addLight(light: ILight): void;
  removeLight(light: ILight): void;
  setAmbientLight(color: [number, number, number], intensity: number): void;
  renderFrame(deltaTime: number): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

// ============================================================================
// Shader Uniforms
// ============================================================================

export interface FrameUniforms {
  viewMatrix: Float32Array;
  projectionMatrix: Float32Array;
  viewProjectionMatrix: Float32Array;
  cameraPosition: Float32Array;
  time: number;
  deltaTime: number;
  
  // Lighting
  ambientLightColor: Float32Array;
  ambientLightIntensity: number;
  directionalLights: DirectionalLightData[];
  directionalLightCount: number;
}

export interface DirectionalLightData {
  direction: Float32Array;
  color: Float32Array;
  intensity: number;
  padding: number; // Alignment padding
}

export interface ObjectUniforms {
  modelMatrix: Float32Array;
  normalMatrix: Float32Array;
  color: Float32Array;
  roughness: number;
  metalness: number;
  emissive: Float32Array;
  flags: number; // Bit flags for material properties
  padding: number[]; // Alignment padding
}

// Flag bits for ObjectUniforms.flags
export const MaterialFlags = {
  USE_FLAT_SHADING: 1 << 0,
  USE_VERTEX_COLORS: 1 << 1,
  HAS_TEXTURE: 1 << 2,
  CASTS_SHADOW: 1 << 3,
  RECEIVES_SHADOW: 1 << 4
};
