/**
 * Camera abstraction - shared between WebGL and WebGPU renderers
 * Uses gl-matrix for efficient matrix operations
 */

import { mat4, vec3 } from 'gl-matrix';
import type { ICamera, Vec3, Mat4 } from '../../types/engine.types';

export class Camera implements ICamera {
  fov: number = Math.PI / 4; // 45 degrees
  near: number = 0.1;
  far: number = 1000;
  aspect: number = 16 / 9;
  
  position: Vec3 = vec3.create();
  target: Vec3 = vec3.create();
  up: Vec3 = vec3.fromValues(0, 1, 0);
  
  private viewMatrix: Mat4 = mat4.create();
  private projectionMatrix: Mat4 = mat4.create();
  private viewDirty: boolean = true;
  private projDirty: boolean = true;
  
  constructor(position?: Vec3, target?: Vec3) {
    if (position) {
      vec3.copy(this.position, position);
    } else {
      vec3.set(this.position, 0, 5, 10);
    }
    
    if (target) {
      vec3.copy(this.target, target);
    } else {
      vec3.set(this.target, 0, 0, 0);
    }
  }
  
  /**
   * Get the view matrix (world-to-camera transform)
   */
  getViewMatrix(): Mat4 {
    if (this.viewDirty) {
      mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
      this.viewDirty = false;
    }
    return this.viewMatrix;
  }
  
  /**
   * Get the projection matrix
   */
  getProjectionMatrix(): Mat4 {
    if (this.projDirty) {
      mat4.perspective(
        this.projectionMatrix,
        this.fov,
        this.aspect,
        this.near,
        this.far
      );
      this.projDirty = false;
    }
    return this.projectionMatrix;
  }
  
  /**
   * Update aspect ratio (call on window resize)
   */
  updateAspect(aspect: number): void {
    if (this.aspect !== aspect) {
      this.aspect = aspect;
      this.projDirty = true;
    }
  }
  
  /**
   * Move camera to a new position
   */
  setPosition(x: number, y: number, z: number): void {
    vec3.set(this.position, x, y, z);
    this.viewDirty = true;
  }
  
  /**
   * Set where the camera is looking
   */
  setTarget(x: number, y: number, z: number): void {
    vec3.set(this.target, x, y, z);
    this.viewDirty = true;
  }
  
  /**
   * Orbit around a target point
   */
  orbit(horizontalAngle: number, verticalAngle: number, distance: number): void {
    const x = distance * Math.sin(horizontalAngle) * Math.cos(verticalAngle);
    const y = distance * Math.sin(verticalAngle);
    const z = distance * Math.cos(horizontalAngle) * Math.cos(verticalAngle);
    
    vec3.add(this.position, this.target, [x, y, z] as Vec3);
    this.viewDirty = true;
  }
  
  /**
   * Mark view matrix as dirty (call after manual position changes)
   */
  markDirty(): void {
    this.viewDirty = true;
  }
}
