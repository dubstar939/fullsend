/**
 * LOD System - Level of Detail management for performance
 */

import * as THREE from 'three';
import { SceneGraph, SceneNode } from '../core/SceneGraph';

export interface LODConfig {
  /** Distance thresholds for each LOD level */
  distances: number[];
  /** Scale factors for geometry reduction */
  reductions: number[];
}

export class LODSystem {
  private config: LODConfig;
  private lodObjects: Map<string, LODObject> = new Map();

  constructor(config?: Partial<LODConfig>) {
    this.config = {
      distances: config?.distances ?? [30, 60, 100],
      reductions: config?.reductions ?? [0.5, 0.25, 0.1],
    };
  }

  /**
   * Register an object for LOD management
   */
  register(nodeId: string, mesh: THREE.Mesh, lodLevels: THREE.Mesh[]): void {
    this.lodObjects.set(nodeId, {
      nodeId,
      mesh,
      lodLevels,
      currentLOD: 0,
    });
  }

  /**
   * Update LOD levels based on camera distance
   */
  update(sceneGraph: SceneGraph, camera: THREE.Camera): void {
    for (const [nodeId, lodObj] of this.lodObjects.entries()) {
      const node = sceneGraph.getNode(nodeId);
      if (!node || node.isCulled) continue;

      const distance = camera.position.distanceTo(lodObj.mesh.position);
      const appropriateLOD = this.getLODForDistance(distance);

      if (appropriateLOD !== lodObj.currentLOD) {
        this.setLOD(lodObj, appropriateLOD);
      }
    }
  }

  /**
   * Get appropriate LOD level for a given distance
   */
  private getLODForDistance(distance: number): number {
    for (let i = 0; i < this.config.distances.length; i++) {
      if (distance < this.config.distances[i]) {
        return i;
      }
    }
    return this.config.distances.length; // Highest LOD (lowest detail)
  }

  /**
   * Set the LOD level for an object
   */
  private setLOD(lodObj: LODObject, level: number): void {
    lodObj.currentLOD = level;

    if (level >= lodObj.lodLevels.length) {
      // Hide object if beyond all LOD levels
      lodObj.mesh.visible = false;
    } else {
      // Show and potentially swap geometry
      lodObj.mesh.visible = true;
      
      // In a full implementation, you would swap geometries here
      // For now, we just track the LOD level
    }
  }

  /**
   * Auto-generate LOD levels for a mesh
   */
  generateLODLevels(
    originalMesh: THREE.Mesh,
    levels: number = 3
  ): THREE.Mesh[] {
    const lodLevels: THREE.Mesh[] = [originalMesh];

    for (let i = 1; i < levels; i++) {
      const reduction = this.config.reductions[i - 1] ?? 0.5;
      const simplifiedMesh = this.simplifyMesh(originalMesh, reduction);
      lodLevels.push(simplifiedMesh);
    }

    return lodLevels;
  }

  /**
   * Simplify a mesh by reducing vertex count
   * Note: This is a placeholder - real mesh simplification requires libraries like simplify.js
   */
  private simplifyMesh(original: THREE.Mesh, reduction: number): THREE.Mesh {
    // Create a new mesh with the same material but scaled
    // In production, use actual mesh decimation algorithms
    const simplified = original.clone();
    simplified.scale.multiplyScalar(reduction);
    return simplified;
  }

  /**
   * Unregister an object from LOD management
   */
  unregister(nodeId: string): void {
    this.lodObjects.delete(nodeId);
  }

  /**
   * Clear all registered LOD objects
   */
  clear(): void {
    this.lodObjects.clear();
  }

  /**
   * Get LOD info for debugging
   */
  getLODInfo(nodeId: string): { currentLOD: number; distance: number } | null {
    const lodObj = this.lodObjects.get(nodeId);
    if (!lodObj) return null;

    return {
      currentLOD: lodObj.currentLOD,
      distance: 0, // Would need camera reference
    };
  }
}

interface LODObject {
  nodeId: string;
  mesh: THREE.Mesh;
  lodLevels: THREE.Mesh[];
  currentLOD: number;
}

/**
 * Helper class for creating LOD groups
 */
export class LODGroup extends THREE.Group {
  private lods: THREE.Mesh[] = [];
  private currentLOD: number = 0;

  addLOD(mesh: THREE.Mesh, minDistance: number = 0, maxDistance: number = Infinity): void {
    mesh.userData.minDistance = minDistance;
    mesh.userData.maxDistance = maxDistance;
    this.lods.push(mesh);
    this.add(mesh);
  }

  update(camera: THREE.Camera): void {
    const distance = camera.position.distanceTo(this.position);

    for (let i = 0; i < this.lods.length; i++) {
      const lod = this.lods[i];
      const minDist = lod.userData.minDistance ?? 0;
      const maxDist = lod.userData.maxDistance ?? Infinity;

      if (distance >= minDist && distance < maxDist) {
        if (this.currentLOD !== i) {
          this.setActiveLOD(i);
        }
        break;
      }
    }
  }

  private setActiveLOD(index: number): void {
    this.currentLOD = index;
    this.lods.forEach((lod, i) => {
      lod.visible = i === index;
    });
  }
}
