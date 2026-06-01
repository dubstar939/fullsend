/**
 * Camera component - handles view and projection matrices.
 * Supports both perspective and orthographic projections.
 */

import { mat4, vec3 } from 'gl-matrix';
import { CameraData, CameraUniforms, CAMERA_UNIFORM_SIZE, ViewFrustum } from '../../types/renderer.types';
import { extractFrustum } from '../common/Frustum';

export class Camera {
  private _position: vec3;
  private _target: vec3;
  private _up: vec3;
  private _fov: number;
  private _near: number;
  private _far: number;
  private _aspect: number;
  private _orthoHeight: number;
  private _projectionType: 'perspective' | 'orthographic';
  
  private _viewMatrix: mat4;
  private _projectionMatrix: mat4;
  private _viewProjectionMatrix: mat4;
  private _frustum: ViewFrustum | null = null;
  private _dirty: boolean;

  constructor(config: Partial<CameraData> = {}) {
    this._position = config.position || [0, 5, 10];
    this._target = config.target || [0, 0, 0];
    this._up = config.up || [0, 1, 0];
    this._fov = config.fov ?? Math.PI / 4; // 45 degrees
    this._near = config.near ?? 0.1;
    this._far = config.far ?? 1000;
    this._aspect = config.aspect ?? 16 / 9;
    this._orthoHeight = config.orthoHeight ?? 5;
    this._projectionType = config.projectionType || 'perspective';
    
    this._viewMatrix = mat4.create();
    this._projectionMatrix = mat4.create();
    this._viewProjectionMatrix = mat4.create();
    this._dirty = true;
  }

  get position(): vec3 { return this._position; }
  get target(): vec3 { return this._target; }
  get up(): vec3 { return this._up; }
  get fov(): number { return this._fov; }
  get near(): number { return this._near; }
  get far(): number { return this._far; }
  get aspect(): number { return this._aspect; }
  get orthoHeight(): number { return this._orthoHeight; }
  get projectionType(): 'perspective' | 'orthographic' { return this._projectionType; }

  set position(value: vec3) {
    vec3.copy(this._position, value);
    this._dirty = true;
  }

  set target(value: vec3) {
    vec3.copy(this._target, value);
    this._dirty = true;
  }

  set aspect(value: number) {
    this._aspect = value;
    this._dirty = true;
  }

  /**
   * Set perspective projection parameters.
   */
  setPerspective(fov: number, near: number, far: number): void {
    this._fov = fov;
    this._near = near;
    this._far = far;
    this._projectionType = 'perspective';
    this._dirty = true;
  }

  /**
   * Set orthographic projection parameters.
   */
  setOrthographic(orthoHeight: number, near: number, far: number): void {
    this._orthoHeight = orthoHeight;
    this._near = near;
    this._far = far;
    this._projectionType = 'orthographic';
    this._dirty = true;
  }

  /**
   * Look at a target point.
   */
  lookAt(target: vec3, up?: vec3): void {
    vec3.copy(this._target, target);
    if (up) vec3.copy(this._up, up);
    this._dirty = true;
  }

  /**
   * Get the view matrix (world to camera transform).
   */
  getViewMatrix(): mat4 {
    if (this._dirty) {
      this._updateMatrices();
    }
    return this._viewMatrix;
  }

  /**
   * Get the projection matrix.
   */
  getProjectionMatrix(): mat4 {
    if (this._dirty) {
      this._updateMatrices();
    }
    return this._projectionMatrix;
  }

  /**
   * Get the combined view-projection matrix.
   */
  getViewProjectionMatrix(): mat4 {
    if (this._dirty) {
      this._updateMatrices();
    }
    return this._viewProjectionMatrix;
  }

  /**
   * Get the view frustum for culling.
   * Returns cached frustum if matrices haven't changed.
   */
  getFrustum(): ViewFrustum {
    if (this._dirty || !this._frustum) {
      const vpMatrix = this.getViewProjectionMatrix();
      this._frustum = extractFrustum(vpMatrix);
    }
    return this._frustum;
  }

  /**
   * Get camera uniforms for WebGPU buffer upload.
   */
  getUniforms(): CameraUniforms {
    if (this._dirty) {
      this._updateMatrices();
    }
    
    const view = this.getViewMatrix();
    const proj = this.getProjectionMatrix();
    
    return {
      viewMatrix: new Float32Array(view),
      projectionMatrix: new Float32Array(proj),
      cameraPosition: new Float32Array([...this._position, 0]),
    };
  }

  /**
   * Update internal matrices when dirty.
   */
  private _updateMatrices(): void {
    // View matrix: lookAt
    mat4.lookAt(this._viewMatrix, this._position, this._target, this._up);

    // Projection matrix
    if (this._projectionType === 'perspective') {
      mat4.perspective(
        this._projectionMatrix,
        this._fov,
        this._aspect,
        this._near,
        this._far
      );
    } else {
      // Orthographic: aspect * height width, height height
      const halfHeight = this._orthoHeight / 2;
      const halfWidth = halfHeight * this._aspect;
      mat4.ortho(
        this._projectionMatrix,
        -halfWidth, halfWidth,
        -halfHeight, halfHeight,
        this._near,
        this._far
      );
    }

    // Compute view-projection matrix
    mat4.multiply(this._viewProjectionMatrix, this._projectionMatrix, this._viewMatrix);

    // Invalidate cached frustum
    this._frustum = null;
    this._dirty = false;
  }

  /**
   * Extract camera data as plain object.
   */
  toJSON(): CameraData {
    return {
      position: vec3.clone(this._position),
      target: vec3.clone(this._target),
      up: vec3.clone(this._up),
      fov: this._fov,
      near: this._near,
      far: this._far,
      aspect: this._aspect,
      orthoHeight: this._orthoHeight,
      projectionType: this._projectionType,
    };
  }
}
