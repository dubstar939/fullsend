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
  private canvas: HTMLCanvasElement;
  
  constructor(canvas: HTMLCanvasElement, config: EngineConfig) {
    this.config = config;
    this.canvas = canvas;
    
    // Create WebGL renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: config.antialias,
      powerPreference: 'high-performance',
      precision: 'mediump', // Better performance on mobile
    });
    
    // Configure renderer for low-poly style
    // Cap pixel ratio at 1.5 for better mobile performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    
    // Use canvas size, not window size
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x87ceeb, 1);
    
    // Shadow configuration
    if (config.shadowQuality !== 'off') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false; // Manual control for better performance
    }
    
    // Output encoding
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Create perspective camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 12);
  }
  
  /**
   * Render the scene
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    // Update shadow maps manually when autoUpdate is disabled
    if (this.config.shadowQuality !== 'off') {
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.renderer.render(scene, camera);
  }
  
  /**
   * Manually update shadow maps
   */
  updateShadows(): void {
    if (this.config.shadowQuality !== 'off') {
      this.renderer.shadowMap.needsUpdate = true;
    }
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
   * Cleanup resources - fully destroy WebGL context
   */
  dispose(): void {
    // Force context loss to ensure complete cleanup
    const gl = this.renderer.getContext() as WebGLRenderingContext;
    if (gl) {
      // Trigger context loss
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
      }
    }
    
    // Dispose renderer
    this.renderer.dispose();
    
    // Clear canvas reference
    this.canvas = null as unknown as HTMLCanvasElement;
  }
}
