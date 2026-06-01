/**
 * Scene Graph - Hierarchical scene management
 * Efficient spatial organization and update propagation
 */

import * as THREE from 'three';

export type SceneNodeType = 'object' | 'group' | 'light' | 'camera' | 'mesh' | 'sprite';

export interface SceneNode {
  id: string;
  name: string;
  object: THREE.Object3D;
  type: SceneNodeType;
  parent: SceneNode | null;
  children: SceneNode[];
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  userData: Record<string, unknown>;
  boundingSphere?: THREE.Sphere;
  isCulled: boolean;
}

export class SceneGraph {
  private nodes: Map<string, SceneNode> = new Map();
  private rootNodes: SceneNode[] = [];
  private nodeIdCounter: number = 0;
  
  /**
   * Add an object to the scene graph
   */
  addNode(
    object: THREE.Object3D,
    name?: string,
    parent?: SceneNode | null
  ): SceneNode {
    const id = name || `node_${this.nodeIdCounter++}`;
    
    const node: SceneNode = {
      id,
      name: name || object.name || id,
      object,
      type: this.determineNodeType(object),
      parent: parent || null,
      children: [],
      visible: object.visible,
      castShadow: object.castShadow,
      receiveShadow: object.receiveShadow,
      userData: { ...object.userData },
      isCulled: false,
    };
    
    // Store node
    this.nodes.set(id, node);
    
    // Add to parent or root
    if (parent) {
      parent.children.push(node);
    } else {
      this.rootNodes.push(node);
    }
    
    // Compute bounding sphere
    this.computeBoundingSphere(node);
    
    return node;
  }
  
  /**
   * Remove a node from the scene graph
   */
  removeNode(object: THREE.Object3D): void {
    let nodeToRemove: SceneNode | undefined;
    
    // Find the node
    for (const [id, node] of this.nodes.entries()) {
      if (node.object === object) {
        nodeToRemove = node;
        this.nodes.delete(id);
        break;
      }
    }
    
    if (!nodeToRemove) return;
    
    // Remove from parent
    if (nodeToRemove.parent) {
      const index = nodeToRemove.parent.children.indexOf(nodeToRemove);
      if (index > -1) {
        nodeToRemove.parent.children.splice(index, 1);
      }
    } else {
      const index = this.rootNodes.indexOf(nodeToRemove);
      if (index > -1) {
        this.rootNodes.splice(index, 1);
      }
    }
    
    // Recursively remove children
    for (const child of nodeToRemove.children) {
      this.removeNode(child.object);
    }
  }
  
  /**
   * Get a node by ID
   */
  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }
  
  /**
   * Get all nodes
   */
  getAllNodes(): SceneNode[] {
    return Array.from(this.nodes.values());
  }
  
  /**
   * Get root nodes
   */
  getRootNodes(): SceneNode[] {
    return this.rootNodes;
  }
  
  /**
   * Update all nodes in the graph
   */
  update(deltaTime: number): void {
    for (const node of this.rootNodes) {
      this.updateNode(node, deltaTime);
    }
  }
  
  /**
   * Recursively update a node and its children
   */
  private updateNode(node: SceneNode, deltaTime: number): void {
    if (!node.visible || node.isCulled) return;
    
    // Call update callback if exists
    const updateCallback = (node.object as any).onUpdate;
    if (typeof updateCallback === 'function') {
      updateCallback(deltaTime);
    }
    
    // Update children
    for (const child of node.children) {
      this.updateNode(child, deltaTime);
    }
  }
  
  /**
   * Set node visibility
   */
  setNodeVisibility(nodeId: string, visible: boolean): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.visible = visible;
      node.object.visible = visible;
    }
  }
  
  /**
   * Mark nodes as culled based on visibility test
   */
  setCulledNodes(nodeIds: string[]): void {
    // Reset all to not culled first
    for (const node of this.nodes.values()) {
      node.isCulled = false;
    }
    
    // Mark specified nodes as culled
    for (const id of nodeIds) {
      const node = this.nodes.get(id);
      if (node) {
        node.isCulled = true;
        node.object.visible = false;
      }
    }
  }
  
  /**
   * Get active (non-culled) node count
   */
  getActiveCount(): number {
    let count = 0;
    for (const node of this.nodes.values()) {
      if (!node.isCulled && node.visible) {
        count++;
      }
    }
    return count;
  }
  
  /**
   * Compute bounding sphere for a node
   */
  private computeBoundingSphere(node: SceneNode): void {
    if (node.object instanceof THREE.Mesh) {
      const mesh = node.object;
      if (mesh.geometry.boundingSphere === null) {
        mesh.geometry.computeBoundingSphere();
      }
      
      if (mesh.geometry.boundingSphere) {
        const sphere = mesh.geometry.boundingSphere.clone();
        sphere.applyMatrix4(mesh.matrixWorld);
        node.boundingSphere = sphere;
      }
    } else if (node.object instanceof THREE.Group) {
      // Compute approximate bounding sphere for groups
      const box = new THREE.Box3();
      box.setFromObject(node.object);
      const center = box.getCenter(new THREE.Vector3());
      const radius = box.getSize(new THREE.Vector3()).length() / 2;
      node.boundingSphere = new THREE.Sphere(center, radius);
    }
  }
  
  /**
   * Update bounding spheres after transform changes
   */
  updateBoundingSpheres(): void {
    for (const node of this.nodes.values()) {
      this.computeBoundingSphere(node);
    }
  }
  
  /**
   * Determine node type from object
   */
  private determineNodeType(object: THREE.Object3D): SceneNodeType {
    if (object instanceof THREE.Group) return 'group';
    if (object instanceof THREE.Light) return 'light';
    if (object instanceof THREE.Camera) return 'camera';
    if (object instanceof THREE.Mesh) return 'mesh';
    if (object instanceof THREE.Sprite) return 'sprite';
    return 'object';
  }
  
  /**
   * Traverse the graph with a callback
   */
  traverse(callback: (node: SceneNode) => void): void {
    for (const node of this.rootNodes) {
      this.traverseNode(node, callback);
    }
  }
  
  private traverseNode(node: SceneNode, callback: (node: SceneNode) => void): void {
    callback(node);
    for (const child of node.children) {
      this.traverseNode(child, callback);
    }
  }
  
  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.nodes.clear();
    this.rootNodes = [];
  }
}
