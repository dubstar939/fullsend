/**
 * Instanced Mesh Manager - GPU instancing for high-performance rendering
 * Reduces draw calls by batching identical meshes
 */

import * as THREE from 'three';

export interface InstancedMeshConfig {
  /** Maximum instances */
  maxCount: number;
  /** Initial visible count */
  initialCount?: number;
}

export class InstancedMeshManager {
  private instancedMesh: THREE.InstancedMesh;
  private activeCount: number = 0;
  private freeIndices: number[] = [];
  private instanceData: Map<number, { matrix: THREE.Matrix4; color: THREE.Color }> = new Map();
  
  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    config: InstancedMeshConfig
  ) {
    const maxCount = config.maxCount;
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.instancedMesh.count = config.initialCount ?? maxCount;
    this.activeCount = config.initialCount ?? maxCount;
    
    // Initialize free indices
    for (let i = 0; i < maxCount; i++) {
      this.freeIndices.push(i);
    }
  }
  
  /**
   * Get the underlying instanced mesh
   */
  getMesh(): THREE.InstancedMesh {
    return this.instancedMesh;
  }
  
  /**
   * Add an instance at the given position
   */
  addInstance(
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3,
    color?: THREE.Color
  ): number | null {
    if (this.freeIndices.length === 0) {
      return null; // Pool exhausted
    }
    
    const index = this.freeIndices.pop()!;
    
    // Create transformation matrix
    const matrix = new THREE.Matrix4();
    matrix.compose(
      position,
      rotation ? new THREE.Quaternion().setFromEuler(rotation) : new THREE.Quaternion(),
      scale ?? new THREE.Vector3(1, 1, 1)
    );
    
    this.instancedMesh.setMatrixAt(index, matrix);
    
    // Set color if provided
    if (color) {
      this.instancedMesh.setColorAt(index, color);
      this.instanceData.set(index, { matrix, color });
    } else {
      this.instanceData.set(index, { matrix, color: new THREE.Color(0xffffff) });
    }
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (color) {
      this.instancedMesh.instanceColor!.needsUpdate = true;
    }
    
    return index;
  }
  
  /**
   * Remove an instance by index
   */
  removeInstance(index: number): void {
    if (!this.instanceData.has(index)) return;
    
    // Hide the instance by scaling to zero
    const hiddenMatrix = new THREE.Matrix4();
    hiddenMatrix.compose(
      new THREE.Vector3(0, 0, 0),
      new THREE.Quaternion(),
      new THREE.Vector3(0, 0, 0)
    );
    this.instancedMesh.setMatrixAt(index, hiddenMatrix);
    
    this.instanceData.delete(index);
    this.freeIndices.push(index);
    
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
  
  /**
   * Update an instance's transform
   */
  updateInstance(
    index: number,
    position: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ): void {
    if (!this.instanceData.has(index)) return;
    
    const matrix = new THREE.Matrix4();
    matrix.compose(
      position,
      rotation ? new THREE.Quaternion().setFromEuler(rotation) : new THREE.Quaternion(),
      scale ?? new THREE.Vector3(1, 1, 1)
    );
    
    this.instancedMesh.setMatrixAt(index, matrix);
    this.instanceData.get(index)!.matrix = matrix;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }
  
  /**
   * Update an instance's color
   */
  updateInstanceColor(index: number, color: THREE.Color): void {
    if (!this.instanceData.has(index)) return;
    
    this.instancedMesh.setColorAt(index, color);
    this.instanceData.get(index)!.color = color;
    this.instancedMesh.instanceColor!.needsUpdate = true;
  }
  
  /**
   * Get instance data
   */
  getInstanceData(index: number): { matrix: THREE.Matrix4; color: THREE.Color } | undefined {
    return this.instanceData.get(index);
  }
  
  /**
   * Get active instance count
   */
  getActiveCount(): number {
    return this.instanceData.size;
  }
  
  /**
   * Get available capacity
   */
  getAvailableCapacity(): number {
    return this.freeIndices.length;
  }
  
  /**
   * Clear all instances
   */
  clearAll(): void {
    for (let i = 0; i < this.instancedMesh.count; i++) {
      this.removeInstance(i);
    }
  }
  
  /**
   * Set visibility of entire instanced mesh
   */
  setVisible(visible: boolean): void {
    this.instancedMesh.visible = visible;
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.instancedMesh.geometry.dispose();
    if (Array.isArray(this.instancedMesh.material)) {
      this.instancedMesh.material.forEach((m) => m.dispose());
    } else {
      this.instancedMesh.material.dispose();
    }
    this.instancedMesh.removeFromParent();
  }
}

/**
 * Factory for creating common instanced objects
 */
export class InstancedFactory {
  /**
   * Create an instanced tree system
   */
  static createTrees(count: number = 100): InstancedMeshManager {
    // Simple low-poly tree geometry (foliage only for simplicity)
    const foliageGeo = new THREE.ConeGeometry(1, 2, 8);
    
    const treeMat = new THREE.MeshPhongMaterial({
      color: 0x226622,
      flatShading: true,
    });
    
    return new InstancedMeshManager(foliageGeo, treeMat, { maxCount: count });
  }
  
  /**
   * Create an instanced building system
   */
  static createBuildings(count: number = 50): InstancedMeshManager {
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshPhongMaterial({
      color: 0x666677,
      flatShading: true,
    });
    
    return new InstancedMeshManager(buildingGeo, buildingMat, { maxCount: count });
  }
  
  /**
   * Create an instanced coin/collectible system
   */
  static createCoins(count: number = 200): InstancedMeshManager {
    const coinGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    const coinMat = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.3,
      flatShading: true,
    });
    
    return new InstancedMeshManager(coinGeo, coinMat, { maxCount: count });
  }
}
