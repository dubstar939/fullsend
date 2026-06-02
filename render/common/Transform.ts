/**
 * Transform component - handles position, rotation, scale and matrix computation
 * Shared between WebGL and WebGPU renderers
 */

import { mat4, vec3 } from 'gl-matrix';
import type { ITransform, Vec3, Mat4 } from '../../types/engine.types';

export class Transform implements ITransform {
  position: Vec3 = vec3.create();
  rotation: Vec3 = vec3.create(); // Euler angles in radians (x=pitch, y=yaw, z=roll)
  scale: Vec3 = vec3.fromValues(1, 1, 1);
  
  private localMatrix: Mat4 = mat4.create();
  private worldMatrix: Mat4 = mat4.create();
  private localDirty: boolean = true;
  private worldDirty: boolean = true;
  
  private parent: Transform | null = null;
  private children: Transform[] = [];
  
  constructor(
    position?: [number, number, number],
    rotation?: [number, number, number],
    scale?: [number, number, number]
  ) {
    if (position) vec3.copy(this.position, position);
    if (rotation) vec3.copy(this.rotation, rotation);
    if (scale) vec3.copy(this.scale, scale);
  }
  
  /**
   * Get the local transformation matrix
   */
  getMatrix(): Mat4 {
    if (this.localDirty) {
      this.recomputeLocalMatrix();
    }
    return this.localMatrix;
  }
  
  /**
   * Get the world transformation matrix
   */
  getWorldMatrix(): Mat4 {
    if (this.worldDirty) {
      this.recomputeWorldMatrix();
    }
    return this.worldMatrix;
  }
  
  /**
   * Update world matrix relative to parent
   */
  updateWorldMatrix(parent?: ITransform): void {
    this.parent = parent as Transform | null;
    this.worldDirty = true;
    
    // Mark children as dirty too
    for (const child of this.children) {
      child.updateWorldMatrix(this);
    }
  }
  
  /**
   * Set position
   */
  setPosition(x: number, y: number, z: number): void {
    vec3.set(this.position, x, y, z);
    this.localDirty = true;
    this.worldDirty = true;
  }
  
  /**
   * Set rotation (Euler angles in radians)
   */
  setRotation(x: number, y: number, z: number): void {
    vec3.set(this.rotation, x, y, z);
    this.localDirty = true;
    this.worldDirty = true;
  }
  
  /**
   * Set rotation from quaternion components (alternative)
   */
  setRotationFromAxisAngle(axis: Vec3, angle: number): void {
    // Convert axis-angle to Euler (simplified for Y-axis rotation)
    if (axis[0] === 0 && axis[2] === 0 && axis[1] !== 0) {
      vec3.set(this.rotation, 0, angle, 0);
    } else {
      // For full quaternion support, store quaternion separately
      console.warn('Full quaternion rotation not yet implemented');
    }
    this.localDirty = true;
    this.worldDirty = true;
  }
  
  /**
   * Set scale
   */
  setScale(x: number, y: number, z: number): void {
    vec3.set(this.scale, x, y, z);
    this.localDirty = true;
    this.worldDirty = true;
  }
  
  /**
   * Translate by offset
   */
  translate(x: number, y: number, z: number): void {
    vec3.add(this.position, this.position, [x, y, z]);
    this.localDirty = true;
    this.worldDirty = true;
  }
  
  /**
   * Rotate around Y axis (yaw)
   */
  rotateY(angle: number): void {
    this.rotation[1] += angle;
    this.localDirty = true;
    this.worldDirty = true;
  }
  
  /**
   * Add child transform
   */
  addChild(child: Transform): void {
    if (!this.children.includes(child)) {
      this.children.push(child);
      child.parent = this;
      child.updateWorldMatrix(this);
    }
  }
  
  /**
   * Remove child transform
   */
  removeChild(child: Transform): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      child.worldDirty = true;
    }
  }
  
  /**
   * Recompute local transformation matrix
   */
  private recomputeLocalMatrix(): void {
    mat4.identity(this.localMatrix);
    
    // Apply scale
    mat4.scale(this.localMatrix, this.localMatrix, this.scale);
    
    // Apply rotation (XYZ order)
    mat4.rotateX(this.localMatrix, this.localMatrix, this.rotation[0]);
    mat4.rotateY(this.localMatrix, this.localMatrix, this.rotation[1]);
    mat4.rotateZ(this.localMatrix, this.localMatrix, this.rotation[2]);
    
    // Apply translation
    mat4.translate(this.localMatrix, this.localMatrix, this.position);
    
    this.localDirty = false;
  }
  
  /**
   * Recompute world transformation matrix
   */
  private recomputeWorldMatrix(): void {
    if (this.localDirty) {
      this.recomputeLocalMatrix();
    }
    
    if (this.parent) {
      mat4.multiply(this.worldMatrix, this.parent.getWorldMatrix(), this.localMatrix);
    } else {
      mat4.copy(this.worldMatrix, this.localMatrix);
    }
    
    this.worldDirty = false;
  }
  
  /**
   * Mark transform as dirty
   */
  markDirty(): void {
    this.localDirty = true;
    this.worldDirty = true;
    
    for (const child of this.children) {
      child.markDirty();
    }
  }
}
