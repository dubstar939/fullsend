/**
 * Renderer - WebGL rendering pipeline with low-poly optimizations
 */

import * as THREE from 'three';
import { EngineConfig } from '../core/Engine';

export class Renderer {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly camera: THREE.PerspectiveCamera;
  
  private config: EngineConfig;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private _debugMode: boolean = false;
  
  constructor(canvas: HTMLCanvasElement, config: EngineConfig) {
    this.config = config;
    
    // Create WebGL renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: config.antialias,
      powerPreference: 'high-performance',
      precision: 'mediump', // Better performance on mobile
    });
    
    // Configure renderer for low-poly style
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x87ceeb, 1);
    
    // Shadow configuration
    if (config.shadowQuality !== 'off') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // Output encoding
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Create perspective camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 12);
  }
  
  /**
   * Render the scene
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }
  
  /**
   * Resize the rendering surface
   */
  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Set debug mode
   */
  setDebugMode(enabled: boolean): void {
    this._debugMode = enabled;
  }
  
  /**
   * Get number of draw calls last frame
   */
  getDrawCalls(): number {
    return this.renderer.info.render.calls;
  }
  
  /**
   * Get triangle count last frame
   */
  getTriangleCount(): number {
    return this.renderer.info.render.triangles;
  }
  
  /**
   * Get texture memory usage in MB
   */
  getTextureMemoryMB(): number {
    const textures = this.renderer.info.memory.textures;
    // Estimate ~4 bytes per pixel for RGBA
    return (textures * 1024 * 1024 * 4) / (1024 * 1024);
  }
  
  /**
   * Get renderer info
   */
  getInfo(): {
    drawCalls: number;
    triangles: number;
    points: number;
    textures: number;
    geometries: number;
  } {
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      points: this.renderer.info.render.points,
      textures: this.renderer.info.memory.textures,
      geometries: this.renderer.info.memory.geometries,
    };
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.renderer.dispose();
  }
}
