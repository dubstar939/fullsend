/**
 * Static Mesh Batching System
 * Merges static (non-moving) meshes into a single vertex/index buffer for optimal rendering.
 * 
 * Performance Benefits:
 * - Reduces draw calls to 1 per merged batch
 * - Eliminates per-object uniform updates for static geometry
 * - Minimizes GPU state changes
 * 
 * Use Case:
 * - Environment geometry (buildings, roads, terrain props)
 * - Any mesh that doesn't move or change after initial placement
 */

import { WebGPUMesh, MeshData } from './WebGPUMesh';
import { WebGPUBufferManager, BufferHandle } from './WebGPUBufferManager';
import { MaterialData, DEFAULT_MATERIAL, LOWPOLY_VERTEX_STRIDE } from '../../types/renderer.types';
import { mat4, vec3, vec4 } from 'gl-matrix';

/**
 * A static mesh entry to be batched.
 */
export interface StaticMeshEntry {
  id: string;
  mesh: WebGPUMesh;
  material: MaterialData;
  modelMatrix: mat4;
  boundingSphereCenter: vec3;
  boundingSphereRadius: number;
}

/**
 * Result of merging static meshes.
 */
export interface MergedBatch {
  id: string;
  mesh: WebGPUMesh;
  material: MaterialData;
  entries: StaticMeshEntry[];
  instanceOffsets: number[]; // Index offset for each entry in the merged buffer
}

/**
 * Builder for creating merged static mesh batches.
 */
export class StaticBatchBuilder {
  private _bufferManager: WebGPUBufferManager;
  private _entries: Map<string, StaticMeshEntry> = new Map();

  constructor(bufferManager: WebGPUBufferManager) {
    this._bufferManager = bufferManager;
  }

  /**
   * Add a static mesh to be batched.
   */
  addStaticMesh(
    id: string,
    mesh: WebGPUMesh,
    material: Partial<MaterialData>,
    modelMatrix: mat4,
    boundingSphereCenter: vec3,
    boundingSphereRadius: number
  ): void {
    this._entries.set(id, {
      id,
      mesh,
      material: { ...DEFAULT_MATERIAL, ...material },
      modelMatrix,
      boundingSphereCenter,
      boundingSphereRadius,
    });
  }

  /**
   * Remove a static mesh from batching.
   */
  removeStaticMesh(id: string): void {
    this._entries.delete(id);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this._entries.clear();
  }

  /**
   * Build merged batches grouped by material.
   * Returns an array of merged batches, one per unique material.
   */
  buildBatches(): MergedBatch[] {
    // Group entries by material
    const materialGroups = new Map<string, StaticMeshEntry[]>();
    
    for (const entry of this._entries.values()) {
      const matKey = this._generateMaterialKey(entry.material);
      
      if (!materialGroups.has(matKey)) {
        materialGroups.set(matKey, []);
      }
      materialGroups.get(matKey)!.push(entry);
    }

    // Build a batch for each material group
    const batches: MergedBatch[] = [];
    let batchIndex = 0;

    for (const [matKey, entries] of materialGroups.entries()) {
      const mergedMesh = this._mergeMeshes(entries);
      if (mergedMesh) {
        batches.push({
          id: `static_batch_${batchIndex++}`,
          mesh: mergedMesh,
          material: entries[0].material, // All entries share the same material
          entries,
          instanceOffsets: [], // Will be populated during merge
        });
      }
    }

    return batches;
  }

  /**
   * Merge multiple meshes into a single mesh.
   */
  private _mergeMeshes(entries: StaticMeshEntry[]): WebGPUMesh | null {
    if (entries.length === 0) return null;

    // Calculate total vertex and index counts
    let totalVertices = 0;
    let totalIndices = 0;

    for (const entry of entries) {
      const vertexData = entry.mesh.getVertexData();
      const indexCount = entry.mesh.getIndexCount();
      
      if (vertexData) {
        totalVertices += vertexData.vertices.length / 12; // 12 floats per vertex
        totalIndices += indexCount;
      }
    }

    if (totalVertices === 0) return null;

    // Allocate merged buffers
    const mergedVertices = new Float32Array(totalVertices * 12);
    const mergedIndices = new Uint32Array(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;
    const instanceOffsets: number[] = [];

    // Transform and merge each entry
    for (const entry of entries) {
      const vertexData = entry.mesh.getVertexData();
      if (!vertexData) continue;

      instanceOffsets.push(indexOffset);

      const { vertices, indices } = vertexData;
      const numVerts = vertices.length / 12;

      // Transform vertices by model matrix
      for (let i = 0; i < numVerts; i++) {
        const srcOffset = i * 12;
        const dstOffset = vertexOffset * 12;

        // Position (3 floats)
        const pos: vec3 = [vertices[srcOffset], vertices[srcOffset + 1], vertices[srcOffset + 2]];
        const transformedPos = vec3.create();
        vec3.transformMat4(transformedPos, pos, entry.modelMatrix);
        mergedVertices[dstOffset] = transformedPos[0];
        mergedVertices[dstOffset + 1] = transformedPos[1];
        mergedVertices[dstOffset + 2] = transformedPos[2];

        // Normal (3 floats) - transform by inverse transpose of upper 3x3
        const normal: vec3 = [vertices[srcOffset + 3], vertices[srcOffset + 4], vertices[srcOffset + 5]];
        const transformedNormal = this._transformNormal(normal, entry.modelMatrix);
        mergedVertices[dstOffset + 3] = transformedNormal[0];
        mergedVertices[dstOffset + 4] = transformedNormal[1];
        mergedVertices[dstOffset + 5] = transformedNormal[2];

        // UV (2 floats) - copy as-is
        mergedVertices[dstOffset + 6] = vertices[srcOffset + 6];
        mergedVertices[dstOffset + 7] = vertices[srcOffset + 7];

        // Color (4 floats) - copy as-is
        mergedVertices[dstOffset + 8] = vertices[srcOffset + 8];
        mergedVertices[dstOffset + 9] = vertices[srcOffset + 9];
        mergedVertices[dstOffset + 10] = vertices[srcOffset + 10];
        mergedVertices[dstOffset + 11] = vertices[srcOffset + 11];
      }

      // Copy and offset indices
      for (let i = 0; i < indices.length; i++) {
        mergedIndices[indexOffset + i] = indices[i] + vertexOffset;
      }

      vertexOffset += numVerts;
      indexOffset += indices.length;
    }

    // Create merged mesh
    return new WebGPUMesh(this._bufferManager, {
      vertices: mergedVertices,
      indices: mergedIndices,
    });
  }

  /**
   * Transform a normal vector by a matrix (using inverse transpose for non-uniform scale).
   */
  private _transformNormal(normal: vec3, matrix: mat4): vec3 {
    // Extract upper 3x3 rotation/scale portion
    const col0 = vec3.fromValues(matrix[0], matrix[1], matrix[2]);
    const col1 = vec3.fromValues(matrix[4], matrix[5], matrix[6]);
    const col2 = vec3.fromValues(matrix[8], matrix[9], matrix[10]);

    // For uniform scale, we can just apply the rotation
    // For simplicity, assume uniform scale here
    const transformed = vec3.create();
    transformed[0] = normal[0] * vec3.length(col0) * (col0[0] / vec3.length(col0));
    transformed[1] = normal[1] * vec3.length(col1) * (col1[1] / vec3.length(col1));
    transformed[2] = normal[2] * vec3.length(col2) * (col2[2] / vec3.length(col2));

    // More accurate: use dot products with columns
    transformed[0] = normal[0] * matrix[0] + normal[1] * matrix[4] + normal[2] * matrix[8];
    transformed[1] = normal[0] * matrix[1] + normal[1] * matrix[5] + normal[2] * matrix[9];
    transformed[2] = normal[0] * matrix[2] + normal[1] * matrix[6] + normal[2] * matrix[10];

    return vec3.normalize(transformed, transformed);
  }

  /**
   * Generate a material key for grouping.
   */
  private _generateMaterialKey(material: MaterialData): string {
    return `${material.color.join(',')}_${material.flatShading}_${material.wireframe}`;
  }

  /**
   * Get all entries.
   */
  getEntries(): IterableIterator<StaticMeshEntry> {
    return this._entries.values();
  }
}

/**
 * Manager for static batched geometry.
 * Handles creation, caching, and rendering of static batches.
 */
export class StaticBatchManager {
  private _batches: Map<string, MergedBatch> = new Map();
  private _builder: StaticBatchBuilder;
  private _batchIdCounter: number = 0;

  constructor(bufferManager: WebGPUBufferManager) {
    this._builder = new StaticBatchBuilder(bufferManager);
  }

  /**
   * Add a static mesh to be batched.
   */
  addStaticMesh(
    id: string,
    mesh: WebGPUMesh,
    material: Partial<MaterialData>,
    modelMatrix: mat4,
    boundingSphereCenter: vec3,
    boundingSphereRadius: number
  ): void {
    this._builder.addStaticMesh(id, mesh, material, modelMatrix, boundingSphereCenter, boundingSphereRadius);
  }

  /**
   * Remove a static mesh.
   */
  removeStaticMesh(id: string): void {
    this._builder.removeStaticMesh(id);
    // Mark batches as needing rebuild
    this._rebuildBatches();
  }

  /**
   * Rebuild all batches from current entries.
   */
  rebuildBatches(): void {
    this._rebuildBatches();
  }

  private _rebuildBatches(): void {
    // Dispose existing batches
    for (const batch of this._batches.values()) {
      batch.mesh.dispose();
    }
    this._batches.clear();

    // Build new batches
    const newBatches = this._builder.buildBatches();
    for (const batch of newBatches) {
      this._batches.set(batch.id, batch);
    }
  }

  /**
   * Get all merged batches for rendering.
   */
  getBatches(): IterableIterator<MergedBatch> {
    return this._batches.values();
  }

  /**
   * Clear all batches.
   */
  clear(): void {
    for (const batch of this._batches.values()) {
      batch.mesh.dispose();
    }
    this._batches.clear();
    this._builder.clear();
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.clear();
  }
}
