/**
 * WebGPU Mesh Implementation
 * 
 * Responsibilities:
 * - Create and manage vertex/index buffers
 * - Define vertex layout
 * - Support for position, normal, UV, and color attributes
 * 
 * Optimized for low-poly geometry with minimal overhead.
 */

import type { IMesh, VertexData } from '../../types/engine.types';

export interface MeshConfig {
  name?: string;
  usage?: GPUBufferUsageFlags;
}

export class WebGPUMesh implements IMesh {
  private device: GPUDevice;
  
  private vertexBuffer: GPUBuffer | null = null;
  private indexBuffer: GPUBuffer | null = null;
  
  private vertexCountValue: number = 0;
  private indexCountValue: number = 0;
  
  private vertexLayout: GPUVertexBufferLayout | null = null;
  
  // Vertex attribute configuration
  // Standard layout: position(vec4), normal(vec4), uv(vec2), color(vec4)
  private static readonly VERTEX_STRIDE = 14 * 4; // 56 bytes per vertex
  private static readonly POSITION_OFFSET = 0;
  private static readonly NORMAL_OFFSET = 4 * 4;
  private static readonly UV_OFFSET = 8 * 4;
  private static readonly COLOR_OFFSET = 10 * 4;
  
  constructor(device: GPUDevice, config: MeshConfig = {}) {
    this.device = device;
  }
  
  /**
   * Initialize mesh from vertex data
   */
  init(
    vertexData: VertexData,
    indices?: number[],
    config: MeshConfig = {}
  ): void {
    const usage = config.usage || (GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
    
    // Interleave vertex attributes into a single array
    const interleaved = this.interleaveVertices(vertexData);
    
    // Create vertex buffer
    this.vertexBuffer = this.device.createBuffer({
      label: config.name ? `${config.name}_VertexBuffer` : 'VertexBuffer',
      size: interleaved.byteLength,
      usage: usage,
      mappedAtCreation: true
    });
    
    // Copy data to buffer
    new Float32Array(this.vertexBuffer.getMappedRange()).set(interleaved);
    this.vertexBuffer.unmap();
    
    this.vertexCountValue = vertexData.position.length / 3;
    
    // Create index buffer if provided
    if (indices && indices.length > 0) {
      const indexArray = new Uint16Array(indices);
      
      this.indexBuffer = this.device.createBuffer({
        label: config.name ? `${config.name}_IndexBuffer` : 'IndexBuffer',
        size: indexArray.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      });
      
      new Uint16Array(this.indexBuffer.getMappedRange()).set(indexArray);
      this.indexBuffer.unmap();
      
      this.indexCountValue = indices.length;
    }
    
    // Create vertex layout descriptor
    this.vertexLayout = {
      arrayStride: WebGPUMesh.VERTEX_STRIDE,
      stepMode: 'vertex',
      attributes: [
        {
          shaderLocation: 0,
          offset: WebGPUMesh.POSITION_OFFSET,
          format: 'float32x4'
        },
        {
          shaderLocation: 1,
          offset: WebGPUMesh.NORMAL_OFFSET,
          format: 'float32x4'
        },
        {
          shaderLocation: 2,
          offset: WebGPUMesh.UV_OFFSET,
          format: 'float32x2'
        },
        {
          shaderLocation: 3,
          offset: WebGPUMesh.COLOR_OFFSET,
          format: 'float32x4'
        }
      ]
    };
  }
  
  /**
   * Interleave vertex attributes for efficient GPU access
   */
  private interleaveVertices(data: VertexData): Float32Array {
    const vertexCount = data.position.length / 3;
    const result = new Float32Array(vertexCount * 14); // 14 floats per vertex
    
    for (let i = 0; i < vertexCount; i++) {
      const base = i * 14;
      
      // Position (xyz, w=1)
      result[base + 0] = data.position[i * 3];
      result[base + 1] = data.position[i * 3 + 1];
      result[base + 2] = data.position[i * 3 + 2];
      result[base + 3] = 1.0;
      
      // Normal (xyz, w=0)
      if (data.normal) {
        result[base + 4] = data.normal[i * 3];
        result[base + 5] = data.normal[i * 3 + 1];
        result[base + 6] = data.normal[i * 3 + 2];
      } else {
        result[base + 4] = 0;
        result[base + 5] = 1;
        result[base + 6] = 0;
      }
      result[base + 7] = 0.0;
      
      // UV (uv, pad to vec2)
      if (data.uv) {
        result[base + 8] = data.uv[i * 2];
        result[base + 9] = data.uv[i * 2 + 1];
      } else {
        result[base + 8] = 0;
        result[base + 9] = 0;
      }
      
      // Color (rgba, default white)
      if (data.color) {
        result[base + 10] = data.color[i * 4];
        result[base + 11] = data.color[i * 4 + 1];
        result[base + 12] = data.color[i * 4 + 2];
        result[base + 13] = data.color[i * 4 + 3];
      } else {
        result[base + 10] = 1;
        result[base + 11] = 1;
        result[base + 12] = 1;
        result[base + 13] = 1;
      }
    }
    
    return result;
  }
  
  /**
   * Get the vertex buffer
   */
  getVertexBuffer(): GPUBuffer {
    if (!this.vertexBuffer) {
      throw new Error('Mesh not initialized');
    }
    return this.vertexBuffer;
  }
  
  /**
   * Get the index buffer (null if not using indices)
   */
  getIndexBuffer(): GPUBuffer | null {
    return this.indexBuffer;
  }
  
  /**
   * Get the vertex buffer layout
   */
  getVertexLayout(): GPUVertexBufferLayout {
    if (!this.vertexLayout) {
      throw new Error('Mesh not initialized');
    }
    return this.vertexLayout;
  }
  
  /**
   * Get vertex count
   */
  get vertexCount(): number {
    return this.vertexCountValue;
  }
  
  /**
   * Get index count
   */
  get indexCount(): number {
    return this.indexCountValue;
  }
  
  /**
   * Update vertex data (for dynamic meshes)
   */
  updateVertices(vertexData: VertexData, indices?: number[]): void {
    if (!this.vertexBuffer) {
      this.init(vertexData, indices);
      return;
    }
    
    const interleaved = this.interleaveVertices(vertexData);
    
    // Resize if needed
    const requiredSize = interleaved.byteLength;
    if (requiredSize > this.vertexBuffer.size) {
      this.vertexBuffer.destroy();
      this.vertexBuffer = this.device.createBuffer({
        size: requiredSize,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
    }
    
    // Write new data
    this.device.queue.writeBuffer(
      this.vertexBuffer,
      0,
      interleaved
    );
    
    this.vertexCountValue = vertexData.position.length / 3;
    
    // Update index buffer if provided
    if (indices && indices.length > 0) {
      const indexArray = new Uint16Array(indices);
      
      if (!this.indexBuffer || indexArray.byteLength > this.indexBuffer.size) {
        if (this.indexBuffer) this.indexBuffer.destroy();
        
        this.indexBuffer = this.device.createBuffer({
          size: indexArray.byteLength,
          usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
      }
      
      this.device.queue.writeBuffer(
        this.indexBuffer,
        0,
        indexArray
      );
      
      this.indexCountValue = indices.length;
    }
  }
  
  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
      this.vertexBuffer = null;
    }
    if (this.indexBuffer) {
      this.indexBuffer.destroy();
      this.indexBuffer = null;
    }
    this.vertexLayout = null;
  }
}

// ============================================================================
// Utility: Create primitive meshes
// ============================================================================

/**
 * Create a simple cube mesh (low-poly friendly)
 */
export function createCubeMesh(
  device: GPUDevice,
  size: number = 1,
  config: MeshConfig = {}
): WebGPUMesh {
  const s = size / 2;
  
  const vertexData: VertexData = {
    position: [
      // Front face
      -s, -s, s,  s, -s, s,  s, s, s,  -s, s, s,
      // Back face
      s, -s, -s,  -s, -s, -s,  -s, s, -s,  s, s, -s,
      // Top face
      -s, s, s,  s, s, s,  s, s, -s,  -s, s, -s,
      // Bottom face
      -s, -s, -s,  s, -s, -s,  s, -s, s,  -s, -s, s,
      // Right face
      s, -s, s,  s, -s, -s,  s, s, -s,  s, s, s,
      // Left face
      -s, -s, -s,  -s, -s, s,  -s, s, s,  -s, s, -s
    ],
    normal: [
      // Front face
      0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
      // Back face
      0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
      // Top face
      0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
      // Bottom face
      0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
      // Right face
      1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
      // Left face
      -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
    ],
    uv: [
      // Front face
      0, 0,  1, 0,  1, 1,  0, 1,
      // Back face
      0, 0,  1, 0,  1, 1,  0, 1,
      // Top face
      0, 0,  1, 0,  1, 1,  0, 1,
      // Bottom face
      0, 0,  1, 0,  1, 1,  0, 1,
      // Right face
      0, 0,  1, 0,  1, 1,  0, 1,
      // Left face
      0, 0,  1, 0,  1, 1,  0, 1
    ]
  };
  
  const indices = [
    // Front face
    0, 1, 2,  0, 2, 3,
    // Back face
    4, 5, 6,  4, 6, 7,
    // Top face
    8, 9, 10,  8, 10, 11,
    // Bottom face
    12, 13, 14,  12, 14, 15,
    // Right face
    16, 17, 18,  16, 18, 19,
    // Left face
    20, 21, 22,  20, 22, 23
  ];
  
  const mesh = new WebGPUMesh(device, { ...config, name: config.name || 'Cube' });
  mesh.init(vertexData, indices);
  
  return mesh;
}

/**
 * Create a simple plane mesh (for terrain/ground)
 */
export function createPlaneMesh(
  device: GPUDevice,
  width: number = 1,
  height: number = 1,
  subdivisions: number = 1,
  config: MeshConfig = {}
): WebGPUMesh {
  const hw = width / 2;
  const hh = height / 2;
  
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  
  for (let z = 0; z <= subdivisions; z++) {
    for (let x = 0; x <= subdivisions; x++) {
      const u = x / subdivisions;
      const v = z / subdivisions;
      
      positions.push(
        -hw + u * width,
        0,
        -hh + v * height
      );
      
      normals.push(0, 1, 0);
      uvs.push(u, v);
    }
  }
  
  const indices: number[] = [];
  const stride = subdivisions + 1;
  
  for (let z = 0; z < subdivisions; z++) {
    for (let x = 0; x < subdivisions; x++) {
      const a = z * stride + x;
      const b = z * stride + x + 1;
      const c = (z + 1) * stride + x;
      const d = (z + 1) * stride + x + 1;
      
      indices.push(a, b, c, b, d, c);
    }
  }
  
  const vertexData: VertexData = {
    position: positions,
    normal: normals,
    uv: uvs
  };
  
  const mesh = new WebGPUMesh(device, { ...config, name: config.name || 'Plane' });
  mesh.init(vertexData, indices);
  
  return mesh;
}
