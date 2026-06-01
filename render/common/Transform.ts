/**
 * Transform component - handles local space transformations.
 * Computes model matrix from position, rotation, scale.
 */

import { mat4, vec3 } from 'gl-matrix';
import { TransformData } from '../../types/renderer.types';

export class Transform {
  private _position: vec3;
  private _rotation: vec3;
  private _scale: vec3;
  private _modelMatrix: mat4;
  private _normalMatrix: mat4;
  private _dirty: boolean;

  constructor(
    position: vec3 = [0, 0, 0],
    rotation: vec3 = [0, 0, 0],
    scale: vec3 = [1, 1, 1]
  ) {
    this._position = vec3.clone(position);
    this._rotation = vec3.clone(rotation);
    this._scale = vec3.clone(scale);
    this._modelMatrix = mat4.create();
    this._normalMatrix = mat4.create();
    this._dirty = true;
  }

  get position(): vec3 { return this._position; }
  get rotation(): vec3 { return this._rotation; }
  get scale(): vec3 { return this._scale; }
  
  set position(value: vec3) {
    vec3.copy(this._position, value);
    this._dirty = true;
  }
  
  set rotation(value: vec3) {
    vec3.copy(this._rotation, value);
    this._dirty = true;
  }
  
  set scale(value: vec3) {
    vec3.copy(this._scale, value);
    this._dirty = true;
  }

  /**
   * Get the model matrix (local to world transform).
   * Computed lazily when dirty.
   */
  getModelMatrix(): mat4 {
    if (this._dirty) {
      this._updateMatrix();
    }
    return this._modelMatrix;
  }

  /**
   * Get the normal matrix (inverse transpose of upper 3x3 of model matrix).
   * Used for transforming normals to world space.
   */
  getNormalMatrix(): mat4 {
    if (this._dirty) {
      this._updateMatrix();
    }
    return this._normalMatrix;
  }

  /**
   * Mark transform as dirty (force matrix recalculation).
   */
  markDirty(): void {
    this._dirty = true;
  }

  /**
   * Copy data to plain object for uniform buffer.
   */
  toJSON(): TransformData {
    return {
      position: vec3.clone(this._position),
      rotation: vec3.clone(this._rotation),
      scale: vec3.clone(this._scale),
    };
  }

  private _updateMatrix(): void {
    // Create model matrix from TRS
    mat4.fromRotationTranslationScale(
      this._modelMatrix,
      // Rotation: XYZ order
      mat4.create(), // Temporary for quaternion
      this._position,
      this._scale
    );
    
    // Apply Euler rotations (XYZ order)
    const tempQuat = mat4.create();
    mat4.fromYRot(tempQuat, this._rotation[1]);
    mat4.multiply(this._modelMatrix, this._modelMatrix, tempQuat);
    mat4.fromXRot(tempQuat, this._rotation[0]);
    mat4.multiply(this._modelMatrix, this._modelMatrix, tempQuat);
    mat4.fromZRot(tempQuat, this._rotation[2]);
    mat4.multiply(this._modelMatrix, this._modelMatrix, tempQuat);

    // Compute normal matrix (inverse transpose)
    mat4.invert(this._normalMatrix, this._modelMatrix);
    mat4.transpose(this._normalMatrix, this._normalMatrix);

    this._dirty = false;
  }
}
