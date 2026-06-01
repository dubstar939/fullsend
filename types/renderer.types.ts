/**
 * Shared type definitions for the renderer system.
 * These types are backend-agnostic to allow WebGL/WebGPU swapping.
 */

import { mat4, vec3, vec4 } from 'gl-matrix';

// ============================================================================
// TRANSFORM
// ============================================================================

export interface TransformData {
  position: vec3;
  rotation: vec3; // Euler angles in radians
  scale: vec3;
}

// ============================================================================
// BOUNDING VOLUMES
// ============================================================================

export interface BoundingSphere {
  center: vec3;
  radius: number;
}

export interface BoundingBox {
  min: vec3;
  max: vec3;
}

export type BoundingVolume = BoundingSphere | BoundingBox;

// ============================================================================
// FRUSTUM
// ============================================================================

export interface FrustumPlane {
  normal: vec3;
  distance: number;
}

export interface ViewFrustum {
  planes: FrustumPlane[]; // Near, Far, Left, Right, Top, Bottom
}

// ============================================================================
// CAMERA
// ============================================================================

export type ProjectionType = 'perspective' | 'orthographic';

export interface CameraData {
  position: vec3;
  target: vec3;
  up: vec3;
  fov: number;          // Field of view in radians (perspective)
  near: number;
  far: number;
  aspect: number;
  orthoHeight?: number; // For orthographic projection
  projectionType: ProjectionType;
}

// ============================================================================
// MATERIAL
// ============================================================================

export interface MaterialData {
  color: vec4;          // RGBA [0-1]
  emissive: vec3;       // Self-illumination color
  roughness: number;    // 0 = smooth, 1 = rough
  metalness: number;    // 0 = non-metal, 1 = metal
  flatShading: boolean; // Enable flat shading for low-poly look
  wireframe: boolean;   // Wireframe mode (debug)
}

export const DEFAULT_MATERIAL: MaterialData = {
  color: [1, 1, 1, 1],
  emissive: [0, 0, 0],
  roughness: 0.8,
  metalness: 0.2,
  flatShading: true,      // Low-poly default
  wireframe: false,
};

// ============================================================================
// LIGHTING
// ============================================================================

export interface DirectionalLight {
  direction: vec3;
  color: vec3;
  intensity: number;
}

export interface AmbientLight {
  color: vec3;
  intensity: number;
}

export interface LightingData {
  directional: DirectionalLight;
  ambient: AmbientLight;
}

export const DEFAULT_LIGHTING: LightingData = {
  directional: {
    direction: [0.5, -1, -0.3],
    color: [1, 0.95, 0.9],
    intensity: 1.0,
  },
  ambient: {
    color: [0.2, 0.25, 0.3],
    intensity: 0.4,
  },
};

// ============================================================================
// VERTEX & GEOMETRY
// ============================================================================

export interface Vertex {
  position: vec3;
  normal: vec3;
  uv: vec2;
  color?: vec4;         // Optional vertex color for low-poly style
}

export interface GeometryData {
  vertices: Float32Array;
  indices: Uint16Array | Uint32Array;
  vertexLayout: VertexAttribute[];
}

export interface VertexAttribute {
  name: string;
  format: GPUVertexFormat;
  offset: number;
  shaderLocation: number;
}

// Standard low-poly vertex layout: position(3) + normal(3) + uv(2) + color(4)
export const LOWPOLY_VERTEX_LAYOUT: VertexAttribute[] = [
  { name: 'position', format: 'float32x3', offset: 0, shaderLocation: 0 },
  { name: 'normal', format: 'float32x3', offset: 12, shaderLocation: 1 },
  { name: 'uv', format: 'float32x2', offset: 24, shaderLocation: 2 },
  { name: 'color', format: 'float32x4', offset: 32, shaderLocation: 3 },
];

export const LOWPOLY_VERTEX_STRIDE = 48; // bytes per vertex

// ============================================================================
// RENDERABLE
// ============================================================================

/**
 * LOD (Level of Detail) configuration per renderable.
 */
export interface LODConfig {
  /** Distance thresholds for each LOD level (sorted ascending) */
  distances: number[];
  /** Optional custom meshes for each LOD level */
  lodMeshes?: GPUMesh[];
}

export const DEFAULT_LOD_CONFIG: LODConfig = {
  distances: [30, 60, 100], // High (<30), Medium (30-60), Low (60-100), Cull (>100)
};

/**
 * Global LOD settings that can be overridden per-object.
 */
export interface GlobalLODSettings {
  /** Enable/disable LOD system globally */
  enabled: boolean;
  /** Default distance thresholds */
  defaultDistances: number[];
  /** Hysteresis factor to prevent LOD popping (0-1) */
  hysteresis: number;
}

export const DEFAULT_GLOBAL_LOD_SETTINGS: GlobalLODSettings = {
  enabled: true,
  defaultDistances: [30, 60, 100],
  hysteresis: 0.1, // 10% hysteresis
};

export interface Renderable {
  id: string;
  mesh: GPUMesh;
  material: MaterialData;
  transform: TransformData;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  boundingVolume?: BoundingVolume;
  lodConfig?: LODConfig;
}

// ============================================================================
// UNIFORM BUFFERS
// ============================================================================

/**
 * Uniform buffer layout for per-object data.
 * Must match WGSL struct exactly (16-byte alignment).
 */
export interface ObjectUniforms {
  modelMatrix: Float32Array;    // 4x4 matrix = 16 floats
  normalMatrix: Float32Array;   // 3x4 matrix = 12 floats (padded)
  color: Float32Array;          // vec4 = 4 floats
  emissive: Float32Array;       // vec3 + padding = 4 floats
  roughness: number;            // float
  metalness: number;            // float
  flatShading: number;          // float (0 or 1)
  wireframe: number;            // float (0 or 1)
  // Total: 16 + 12 + 4 + 4 + 1 + 1 + 1 + 1 = 40 floats = 160 bytes
  // Padded to 16-byte alignment: 176 bytes (11 vec4s)
}

export const OBJECT_UNIFORM_SIZE = 176; // bytes

/**
 * Uniform buffer layout for camera/view data.
 */
export interface CameraUniforms {
  viewMatrix: Float32Array;     // 4x4 matrix
  projectionMatrix: Float32Array; // 4x4 matrix
  cameraPosition: Float32Array; // vec4 (w unused)
}

export const CAMERA_UNIFORM_SIZE = 144; // 12 floats * 3 matrices/vecs = 144 bytes

/**
 * Uniform buffer layout for lighting data.
 */
export interface LightingUniforms {
  lightDirection: Float32Array; // vec4 (xyz = direction, w unused)
  lightColor: Float32Array;     // vec4 (rgb = color, w = intensity)
  ambientColor: Float32Array;   // vec4 (rgb = color, w = intensity)
}

export const LIGHTING_UNIFORM_SIZE = 48; // 3 vec4s

// ============================================================================
// RENDERER CONFIG
// ============================================================================

export interface RendererConfig {
  antialias: boolean;
  pixelRatio: number;
  clearAlpha: number;
  clearColor: vec4;
  toneMapping: 'none' | 'linear' | 'reinhard' | 'aces';
}

export const DEFAULT_RENDERER_CONFIG: RendererConfig = {
  antialias: true,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  clearAlpha: 1,
  clearColor: [0.1, 0.12, 0.15, 1], // Dark blue-gray
  toneMapping: 'linear',
};
