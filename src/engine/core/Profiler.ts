/**
 * Profiler - Lightweight performance profiling and statistics collection
 * Zero overhead when disabled, integrates with renderer and culling systems
 */

export interface FrameStats {
  /** Current frames per second */
  fps: number;
  /** Average FPS over last 60 frames */
  avgFps: number;
  /** Minimum FPS observed */
  minFps: number;
  /** Maximum FPS observed */
  maxFps: number;
  /** Number of draw calls last frame */
  drawCalls: number;
  /** Number of instances rendered */
  instancesRendered: number;
  /** Number of objects culled by frustum culling */
  objectsCulled: number;
  /** Number of static objects in scene */
  staticObjects: number;
  /** Number of dynamic objects in scene */
  dynamicObjects: number;
  /** Triangle count last frame */
  triangles: number;
  /** Frame time in milliseconds */
  frameTimeMs: number;
}

export interface ProfilerConfig {
  /** Enable profiling (default: false for zero overhead) */
  enabled: boolean;
  /** History size for averaging (default: 60 frames) */
  historySize: number;
}

export class Profiler {
  private enabled: boolean = false;
  private historySize: number = 60;
  
  // FPS tracking
  private fps: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private fpsHistory: number[] = [];
  private minFps: number = Infinity;
  private maxFps: number = 0;
  
  // Frame stats
  private drawCalls: number = 0;
  private instancesRendered: number = 0;
  private objectsCulled: number = 0;
  private staticObjects: number = 0;
  private dynamicObjects: number = 0;
  private triangles: number = 0;
  private frameTimeMs: number = 0;
  
  // Timing
  private frameStartTime: number = 0;
  
  constructor(config: Partial<ProfilerConfig> = {}) {
    this.enabled = config.enabled ?? false;
    this.historySize = config.historySize ?? 60;
    this.lastFpsUpdate = performance.now();
  }
  
  /**
   * Enable or disable profiling
   * When disabled, all methods become no-ops for zero overhead
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && this.lastFpsUpdate === 0) {
      this.lastFpsUpdate = performance.now();
    }
  }
  
  /**
   * Check if profiler is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Begin a new frame - call at start of frame
   */
  beginFrame(): void {
    if (!this.enabled) return;
    this.frameStartTime = performance.now();
  }
  
  /**
   * End current frame - call at end of frame
   */
  endFrame(): void {
    if (!this.enabled) return;
    
    const now = performance.now();
    this.frameTimeMs = now - this.frameStartTime;
    this.frameCount++;
    
    // Update FPS every 500ms for stability
    if (now - this.lastFpsUpdate >= 500) {
      const elapsed = now - this.lastFpsUpdate;
      const currentFps = Math.round((this.frameCount * 1000) / elapsed);
      
      this.fps = currentFps;
      this.minFps = Math.min(this.minFps, currentFps);
      this.maxFps = Math.max(this.maxFps, currentFps);
      
      // Add to history for average calculation
      this.fpsHistory.push(currentFps);
      if (this.fpsHistory.length > this.historySize) {
        this.fpsHistory.shift();
      }
      
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }
  
  /**
   * Set draw call count
   */
  setDrawCalls(count: number): void {
    if (!this.enabled) return;
    this.drawCalls = count;
  }
  
  /**
   * Set triangle count
   */
  setTriangles(count: number): void {
    if (!this.enabled) return;
    this.triangles = count;
  }
  
  /**
   * Set instances rendered count
   */
  setInstancesRendered(count: number): void {
    if (!this.enabled) return;
    this.instancesRendered = count;
  }
  
  /**
   * Set objects culled count
   */
  setObjectsCulled(count: number): void {
    if (!this.enabled) return;
    this.objectsCulled = count;
  }
  
  /**
   * Set static object count
   */
  setStaticObjects(count: number): void {
    if (!this.enabled) return;
    this.staticObjects = count;
  }
  
  /**
   * Set dynamic object count
   */
  setDynamicObjects(count: number): void {
    if (!this.enabled) return;
    this.dynamicObjects = count;
  }
  
  /**
   * Increment instances rendered (for batched rendering)
   */
  addInstancesRendered(count: number): void {
    if (!this.enabled) return;
    this.instancesRendered += count;
  }
  
  /**
   * Reset counters for new frame
   */
  resetFrameCounters(): void {
    if (!this.enabled) return;
    this.drawCalls = 0;
    this.instancesRendered = 0;
    this.objectsCulled = 0;
    this.triangles = 0;
  }
  
  /**
   * Get current frame statistics
   */
  getStats(): FrameStats {
    return {
      fps: this.fps,
      avgFps: this.getAverageFps(),
      minFps: this.minFps === Infinity ? 0 : this.minFps,
      maxFps: this.maxFps,
      drawCalls: this.drawCalls,
      instancesRendered: this.instancesRendered,
      objectsCulled: this.objectsCulled,
      staticObjects: this.staticObjects,
      dynamicObjects: this.dynamicObjects,
      triangles: this.triangles,
      frameTimeMs: Math.round(this.frameTimeMs * 100) / 100,
    };
  }
  
  /**
   * Get average FPS from history
   */
  getAverageFps(): number {
    if (!this.enabled || this.fpsHistory.length === 0) {
      return this.fps;
    }
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }
  
  /**
   * Reset all statistics including min/max
   */
  resetAll(): void {
    if (!this.enabled) return;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsHistory = [];
    this.minFps = Infinity;
    this.maxFps = 0;
    this.resetFrameCounters();
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.enabled = false;
    this.fpsHistory = [];
  }
}
