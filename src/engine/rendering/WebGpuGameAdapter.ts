/**
 * WebGPU Renderer Adapter for Game
 * Bridges the gap between game logic and WebGPU rendering backend
 */

import { WebGPURenderer, WebGPUMesh, WebGPUMaterial, WebGPURenderable, Transform } from '../../render/webgpu';
import { Camera } from '../../render/common/Camera';
import type { ILight, LightType } from '../../types/engine.types';
import { LightType as LT } from '../../types/engine.types';

// ============================================================================
// Vehicle Factory for WebGPU
// ============================================================================

export interface VehicleConfig {
  color: [number, number, number, number];
  position: [number, number, number];
  scale?: [number, number, number];
}

/**
 * Create a low-poly car renderable for WebGPU
 */
export function createWebGPUCar(device: GPUDevice, config: VehicleConfig): WebGPURenderable {
  const [width, height, length] = [1.6, 0.5, 4.2];
  
  // Build vertex data for a simple low-poly car
  const vertexData = buildCarVertexData(width, height, length);
  
  const mesh = new WebGPUMesh(device, { name: 'Car' });
  mesh.init(vertexData);
  
  const material = new WebGPUMaterial({
    name: 'CarMaterial',
    color: config.color,
    roughness: 0.3,
    metalness: 0.7,
    useFlatShading: true
  });
  
  const transform = new Transform(config.position, [0, 0, 0], config.scale || [1, 1, 1]);
  
  return new WebGPURenderable({
    mesh,
    material,
    transform
  });
}

/**
 * Build vertex data for a low-poly car
 */
function buildCarVertexData(width: number, height: number, length: number) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  
  // Body box (simplified)
  const bodyVerts = createBoxVertices(width, height, length);
  positions.push(...bodyVerts.positions);
  normals.push(...bodyVerts.normals);
  uvs.push(...bodyVerts.uvs);
  colors.push(...bodyVerts.colors);
  
  // Cabin box
  const cabinWidth = width * 0.8;
  const cabinHeight = height * 0.5;
  const cabinLength = length * 0.45;
  const cabinVerts = createBoxVertices(cabinWidth, cabinHeight, cabinLength, [0, height * 0.5, -length * 0.1]);
  positions.push(...cabinVerts.positions);
  normals.push(...cabinVerts.normals);
  uvs.push(...cabinVerts.uvs);
  colors.push(...cabinVerts.colors);
  
  return {
    position: positions,
    normal: normals,
    uv: uvs,
    color: colors
  };
}

/**
 * Create box geometry vertices
 */
function createBoxVertices(
  width: number, 
  height: number, 
  depth: number,
  offset: [number, number, number] = [0, 0, 0]
): { positions: number[]; normals: number[]; uvs: number[]; colors: number[] } {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;
  
  // Define 6 faces of the box
  const faces = [
    // Front face (z+)
    { normal: [0, 0, 1], corners: [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    // Back face (z-)
    { normal: [0, 0, -1], corners: [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    // Top face (y+)
    { normal: [0, 1, 0], corners: [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    // Bottom face (y-)
    { normal: [0, -1, 0], corners: [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    // Right face (x+)
    { normal: [1, 0, 0], corners: [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] },
    // Left face (x-)
    { normal: [-1, 0, 0], corners: [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], uv: [[0, 0], [1, 0], [1, 1], [0, 1]] }
  ];
  
  for (const face of faces) {
    const [n0, n1, n2, n3] = face.corners;
    const [uv0, uv1, uv2, uv3] = face.uv;
    
    // Two triangles per face
    const indices = [0, 1, 2, 0, 2, 3];
    const verts = [n0, n1, n2, n3];
    const uvVerts = [uv0, uv1, uv2, uv3];
    
    for (const idx of indices) {
      const v = verts[idx];
      const uv = uvVerts[idx];
      
      positions.push(v[0] + offset[0], v[1] + offset[1], v[2] + offset[2], 1);
      normals.push(face.normal[0], face.normal[1], face.normal[2], 0);
      uvs.push(uv[0], uv[1]);
      colors.push(1, 1, 1, 1); // White vertex color
    }
  }
  
  return { positions, normals, uvs, colors };
}

/**
 * Create a road segment for WebGPU
 */
export function createWebGPURoadSegment(
  device: GPUDevice,
  position: [number, number, number],
  length: number = 100,
  width: number = 16
): WebGPURenderable {
  // Road plane
  const roadMesh = new WebGPUMesh(device, { name: 'Road' });
  const roadVertexData = createPlaneVertexData(width, length);
  roadMesh.init(roadVertexData);
  
  const roadMaterial = new WebGPUMaterial({
    name: 'RoadMaterial',
    color: [0.16, 0.16, 0.16, 1], // Dark asphalt
    roughness: 0.9,
    metalness: 0.1,
    useFlatShading: true
  });
  
  const roadTransform = new Transform(position, [-Math.PI / 2, 0, 0], [1, 1, 1]);
  const road = new WebGPURenderable({
    mesh: roadMesh,
    material: roadMaterial,
    transform: roadTransform
  });
  
  return road;
}

/**
 * Create plane vertex data
 */
function createPlaneVertexData(width: number, height: number) {
  const hw = width / 2;
  const hh = height / 2;
  
  return {
    position: [
      -hw, 0, -hh, 1,
       hw, 0, -hh, 1,
       hw, 0,  hh, 1,
      -hw, 0,  hh, 1
    ],
    normal: [
      0, 1, 0, 0,
      0, 1, 0, 0,
      0, 1, 0, 0,
      0, 1, 0, 0
    ],
    uv: [
      0, 0,
      1, 0,
      1, 1,
      0, 1
    ],
    color: [
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 1, 1
    ]
  };
}

/**
 * Parse hex color to RGBA array
 */
export function parseHexColor(hex: string): [number, number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [1, 1, 1, 1];
  }
  
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
    1
  ];
}

// ============================================================================
// WebGPU Game Renderer Class
// ============================================================================

export class WebGpuGameRenderer {
  private renderer: WebGPURenderer;
  private camera: Camera;
  private renderables: Map<string, WebGPURenderable> = new Map();
  private canvas: HTMLCanvasElement;
  private initialized: boolean = false;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    this.renderer = new WebGPURenderer({
      powerPreference: 'high-performance',
      clearColor: [0.53, 0.81, 0.92, 1], // Sky blue background
      maxDirectionalLights: 4
    });
    
    this.camera = new Camera(
      [0, 5, 12],
      [0, 0, 0]
    );
    this.camera.fov = Math.PI / 3; // 60 degrees
    this.camera.near = 0.1;
    this.camera.far = 1000;
  }
  
  async initialize(): Promise<boolean> {
    try {
      await this.renderer.init(this.canvas);
      this.renderer.setCamera(this.camera);
      
      // Set up lighting
      this.renderer.setAmbientLight([0.3, 0.3, 0.35], 0.6);
      
      const sunLight: ILight = {
        type: LT.DIRECTIONAL,
        color: [1.0, 0.95, 0.8],
        intensity: 1.2,
        direction: [-0.5, -1, -0.3]
      };
      this.renderer.addLight(sunLight);
      
      this.initialized = true;
      console.log('WebGPU Game Renderer initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU renderer:', error);
      return false;
    }
  }
  
  createPlayerCar(color: string): WebGPURenderable {
    const device = this.renderer.getDevice();
    if (!device) {
      throw new Error('WebGPU device not available');
    }
    
    const rgbaColor = parseHexColor(color);
    const car = createWebGPUCar(device, {
      color: rgbaColor,
      position: [0, 0, 0]
    });
    
    this.renderables.set('playerCar', car);
    this.renderer.addRenderable(car);
    
    return car;
  }
  
  updatePlayerPosition(x: number, z: number): void {
    const playerCar = this.renderables.get('playerCar');
    if (playerCar) {
      playerCar.transform.setPosition(x, 0, z);
      playerCar.transform.markDirty();
    }
  }
  
  updateCamera(playerX: number, playerZ: number): void {
    this.camera.setPosition(playerX, 5, playerZ + 12);
    this.camera.setTarget(playerX, 2, playerZ - 10);
    this.camera.markDirty();
  }
  
  handleResize(width: number, height: number): void {
    this.renderer.resize(width, height);
    this.camera.updateAspect(width / height);
  }
  
  renderFrame(deltaTime: number): void {
    if (!this.initialized) return;
    this.renderer.renderFrame(deltaTime);
  }
  
  dispose(): void {
    for (const renderable of this.renderables.values()) {
      renderable.dispose();
    }
    this.renderables.clear();
    this.renderer.dispose();
    this.initialized = false;
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
  
  getDevice(): GPUDevice | null {
    return this.renderer.getDevice();
  }
}
