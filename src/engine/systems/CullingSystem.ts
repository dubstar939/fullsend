/**
 * Culling System - Frustum and distance culling for performance
 */

import * as THREE from 'three';
import { SceneGraph, SceneNode } from '../core/SceneGraph';

export class CullingSystem {
  private frustum: THREE.Frustum;
  private camera: THREE.Camera;
  private culledNodeIds: Set<string> = new Set();
  private distanceThreshold: number = 150;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.frustum = new THREE.Frustum();
  }

  /**
   * Update culling based on camera view
   */
  update(sceneGraph: SceneGraph): void {
    // Update frustum from camera projection matrix
    const projMatrix = new THREE.Matrix4();
    projMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(projMatrix);

    const nodesToCull: string[] = [];

    // Test each node against frustum and distance
    sceneGraph.traverse((node) => {
      if (this.shouldCull(node)) {
        nodesToCull.push(node.id);
      }
    });

    // Apply culling
    sceneGraph.setCulledNodes(nodesToCull);
    this.culledNodeIds.clear();
    nodesToCull.forEach((id) => this.culledNodeIds.add(id));
  }

  /**
   * Determine if a node should be culled
   */
  private shouldCull(node: SceneNode): boolean {
    // Skip lights and cameras from culling
    if (node.type === 'light' || node.type === 'camera') {
      return false;
    }

    // Check bounding sphere
    if (node.boundingSphere) {
      // Distance culling
      const distance = this.camera.position.distanceTo(node.boundingSphere.center);
      if (distance > this.distanceThreshold) {
        return true;
      }

      // Frustum culling
      if (!this.frustum.intersectsSphere(node.boundingSphere)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Set distance threshold for culling
   */
  setDistanceThreshold(distance: number): void {
    this.distanceThreshold = distance;
  }

  /**
   * Get count of culled objects
   */
  getCulledCount(): number {
    return this.culledNodeIds.size;
  }

  /**
   * Check if a specific node is culled
   */
  isCulled(nodeId: string): boolean {
    return this.culledNodeIds.has(nodeId);
  }

  /**
   * Force visibility of a node (override culling)
   */
  forceVisible(node: SceneNode): void {
    node.object.visible = true;
    node.isCulled = false;
  }
}
