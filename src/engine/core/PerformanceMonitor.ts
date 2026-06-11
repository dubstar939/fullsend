/**
 * Performance Monitor - FPS and frame timing tracking
 * Production-ready with performance budget monitoring
 */

export class PerformanceMonitor {
  private fps: number = 0;
  private frameTime: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private startTime: number = 0;
  
  // Performance budget tracking
  private readonly targetFPS: number = 60;
  private readonly minFPS: number = 55;
  private droppedFrames: number = 0;
  private performanceWarnings: string[] = [];
  
  constructor(targetFPS: number = 60) {
    this.startTime = performance.now();
    this.targetFPS = targetFPS;
  }
  
  beginFrame(): void {
    // Called at start of frame
  }
  
  endFrame(): void {
    this.frameCount++;
    const now = performance.now();
    
    // Update FPS every 500ms for responsive feedback
    if (now - this.lastFpsUpdate >= 500) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.frameTime = (now - this.lastFpsUpdate) / this.frameCount;
      
      // Track dropped frames
      if (this.fps < this.minFPS) {
        this.droppedFrames++;
        this.logPerformanceWarning(`FPS dropped to ${this.fps}`);
      }
      
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
  
  getAverageFPS(): number {
    const elapsed = performance.now() - this.startTime;
    if (elapsed < 1000) return 0;
    return Math.round((this.frameCount + this.frameCount) * 1000 / elapsed);
  }
  
  isMeetingTarget(targetFPS?: number): boolean {
    const target = targetFPS ?? this.targetFPS;
    return this.fps >= target - 5;
  }
  
  getPerformanceRating(): 'excellent' | 'good' | 'fair' | 'poor' {
    if (this.fps >= 58) return 'excellent';
    if (this.fps >= 45) return 'good';
    if (this.fps >= 30) return 'fair';
    return 'poor';
  }
  
  private logPerformanceWarning(message: string): void {
    if (!this.performanceWarnings.includes(message)) {
      this.performanceWarnings.push(message);
      console.warn(`[Performance] ${message}`);
      if (this.performanceWarnings.length > 10) {
        this.performanceWarnings.shift();
      }
    }
  }
  
  getReport(): { currentFPS: number; averageFPS: number; frameTime: number; rating: string; droppedFrameCount: number } {
    return {
      currentFPS: this.fps,
      averageFPS: this.getAverageFPS(),
      frameTime: this.frameTime,
      rating: this.getPerformanceRating(),
      droppedFrameCount: this.droppedFrames,
    };
  }
}
