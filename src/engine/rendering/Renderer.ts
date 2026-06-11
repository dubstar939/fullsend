/**
 * Renderer - WebGL rendering pipeline with low-poly optimizations
 * Production-optimized for stable 60 FPS on desktop and mobile
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
  private isMobile: boolean = false;
  
  constructor(canvas: HTMLCanvasElement, config: EngineConfig) {
    this.config = config;
    this.canvas = canvas;
    
    // Detect mobile devices for optimized settings
    this.isMobile = this.detectMobileDevice();
    
    // Create WebGL renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: config.antialias && !this.isMobile, // Disable AA on mobile for performance
      powerPreference: 'high-performance',
      precision: this.isMobile ? 'lowp' : 'mediump', // Lower precision on mobile
      alpha: false, // Disable alpha channel for better performance
      depth: true,
      stencil: false, // Disable stencil buffer if not needed
      preserveDrawingBuffer: false, // Allow buffer clearing for better performance
    });
    
    // Configure renderer for low-poly style
    // Cap pixel ratio at 1.0 for mobile, 1.5 for desktop for better performance
    const maxPixelRatio = this.isMobile ? 1.0 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    
    // Use canvas size, not window size
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x87ceeb, 1);
    
    // Enable auto-clear for better performance
    this.renderer.autoClear = true;
    
    // Shadow configuration - reduced quality on mobile
    if (config.shadowQuality !== 'off') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false; // Manual control for better performance
      
      // Mobile shadow optimization
      if (this.isMobile) {
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
      }
    }
    
    // Output encoding
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Tone mapping for better visual quality
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    // Create perspective camera with optimized far plane
    this.camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      this.isMobile ? 500 : 1000 // Reduced render distance on mobile
    );
    this.camera.position.set(0, 5, 12);
  }
  
  /**
   * Detect if running on a mobile device
   */
  private detectMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
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
