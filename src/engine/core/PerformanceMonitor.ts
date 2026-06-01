/**
 * Performance Monitor - FPS and frame timing tracking
 */

export class PerformanceMonitor {
  private fps: number = 0;
  private frameTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private startTime: number = 0;
  
  constructor() {
    this.startTime = performance.now();
  }
  
  beginFrame(): void {
    // Called at start of frame
  }
  
  endFrame(): void {
    this.frameCount++;
    const now = performance.now();
    
    // Update FPS every 500ms
    if (now - this.lastFpsUpdate >= 500) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameTime = (now - this.lastFpsUpdate) / this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }
  
  getFPS(): number {
    return this.fps;
  }
  
  getFrameTime(): number {
    return this.frameTime;
  }
  
  /**
   * Get average FPS since start
   */
  getAverageFPS(): number {
    const elapsed = performance.now() - this.startTime;
    if (elapsed < 1000) return 0;
    return Math.round((this.frameCount + this.frameCount) * 1000 / elapsed);
  }
  
  /**
   * Check if we're meeting target FPS
   */
  isMeetingTarget(targetFPS: number): boolean {
    return this.fps >= targetFPS - 5; // Allow 5 FPS tolerance
  }
}
