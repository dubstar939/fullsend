/**
 * Debug HUD - On-screen debug overlay for performance monitoring
 * HTML/CSS-based overlay with toggle support
 */

import { Profiler } from '../core/Profiler';

export interface DebugHUDConfig {
  /** Initial visibility state */
  visible: boolean;
  /** Toggle key code (default: 'F3') */
  toggleKey: string;
  /** Position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' */
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Panel opacity (0-1) */
  opacity: number;
}

export class DebugHUD {
  private profiler: Profiler;
  private config: Required<DebugHUDConfig>;
  private element: HTMLElement | null = null;
  private isVisible: boolean = false;
  private updateInterval: number = 0;
  
  // DOM elements
  private fpsElement: HTMLElement | null = null;
  private avgFpsElement: HTMLElement | null = null;
  private minFpsElement: HTMLElement | null = null;
  private maxFpsElement: HTMLElement | null = null;
  private drawCallsElement: HTMLElement | null = null;
  private instancesElement: HTMLElement | null = null;
  private culledElement: HTMLElement | null = null;
  private staticObjectsElement: HTMLElement | null = null;
  private dynamicObjectsElement: HTMLElement | null = null;
  private trianglesElement: HTMLElement | null = null;
  private frameTimeElement: HTMLElement | null = null;

  constructor(profiler: Profiler, config: Partial<DebugHUDConfig> = {}) {
    this.profiler = profiler;
    this.config = {
      visible: config.visible ?? false,
      toggleKey: config.toggleKey ?? 'F3',
      position: config.position ?? 'top-left',
      opacity: config.opacity ?? 0.9,
    };
    this.isVisible = this.config.visible;
  }

  /**
   * Create and mount the HUD to the document
   */
  mount(container?: HTMLElement): void {
    if (this.element) return; // Already mounted

    const targetContainer = container ?? document.body;

    // Create main panel
    this.element = document.createElement('div');
    this.element.id = 'debug-hud';
    this.element.style.cssText = `
      position: fixed;
      z-index: 99999;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.4;
      background: rgba(0, 0, 0, ${this.config.opacity * 0.85});
      color: #00ff00;
      padding: 10px 14px;
      border-radius: 6px;
      pointer-events: none;
      user-select: none;
      backdrop-filter: blur(4px);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
      transition: opacity 0.2s ease;
      opacity: ${this.isVisible ? 1 : 0};
      ${this.getPositionStyles()}
    `;

    // Create content
    this.element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #ffffff;">
        ⚡ DEBUG HUD
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px;">
        <span style="color: #aaaaaa;">FPS:</span>
        <span id="debug-hud-fps">--</span>
        
        <span style="color: #aaaaaa;">Avg:</span>
        <span id="debug-hud-avg-fps">--</span>
        
        <span style="color: #aaaaaa;">Min:</span>
        <span id="debug-hud-min-fps">--</span>
        
        <span style="color: #aaaaaa;">Max:</span>
        <span id="debug-hud-max-fps">--</span>
        
        <span style="color: #aaaaaa;">Frame:</span>
        <span id="debug-hud-frame-time">--</span>
        
        <span style="color: #aaaaaa;">Triangles:</span>
        <span id="debug-hud-triangles">--</span>
        
        <span style="color: #aaaaaa;">Draw Calls:</span>
        <span id="debug-hud-draw-calls">--</span>
        
        <span style="color: #aaaaaa;">Instances:</span>
        <span id="debug-hud-instances">--</span>
        
        <span style="color: #aaaaaa;">Culled:</span>
        <span id="debug-hud-culled">--</span>
        
        <span style="color: #aaaaaa;">Static:</span>
        <span id="debug-hud-static">--</span>
        
        <span style="color: #aaaaaa;">Dynamic:</span>
        <span id="debug-hud-dynamic">--</span>
      </div>
    `;

    targetContainer.appendChild(this.element);

    // Cache element references
    this.fpsElement = this.element.querySelector('#debug-hud-fps');
    this.avgFpsElement = this.element.querySelector('#debug-hud-avg-fps');
    this.minFpsElement = this.element.querySelector('#debug-hud-min-fps');
    this.maxFpsElement = this.element.querySelector('#debug-hud-max-fps');
    this.frameTimeElement = this.element.querySelector('#debug-hud-frame-time');
    this.trianglesElement = this.element.querySelector('#debug-hud-triangles');
    this.drawCallsElement = this.element.querySelector('#debug-hud-draw-calls');
    this.instancesElement = this.element.querySelector('#debug-hud-instances');
    this.culledElement = this.element.querySelector('#debug-hud-culled');
    this.staticObjectsElement = this.element.querySelector('#debug-hud-static');
    this.dynamicObjectsElement = this.element.querySelector('#debug-hud-dynamic');

    // Setup keyboard toggle
    this.setupKeyboardToggle();

    // Start update loop
    this.startUpdateLoop();

    // Set initial visibility
    this.setVisible(this.isVisible);
  }

  /**
   * Get CSS styles based on position
   */
  private getPositionStyles(): string {
    switch (this.config.position) {
      case 'top-left':
        return 'top: 10px; left: 10px;';
      case 'top-right':
        return 'top: 10px; right: 10px;';
      case 'bottom-left':
        return 'bottom: 10px; left: 10px;';
      case 'bottom-right':
        return 'bottom: 10px; right: 10px;';
    }
  }

  /**
   * Setup keyboard toggle listener
   */
  private setupKeyboardToggle(): void {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.code === this.config.toggleKey) {
        this.toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
  }

  /**
   * Start the update loop
   */
  private startUpdateLoop(): void {
    const update = (): void => {
      if (this.isVisible && this.profiler.isEnabled()) {
        this.updateDisplay();
      }
      this.updateInterval = requestAnimationFrame(update);
    };
    this.updateInterval = requestAnimationFrame(update);
  }

  /**
   * Update the display with current stats
   */
  private updateDisplay(): void {
    const stats = this.profiler.getStats();

    if (this.fpsElement) {
      this.fpsElement.textContent = `${stats.fps}`;
      this.fpsElement.style.color = this.getFpsColor(stats.fps);
    }

    if (this.avgFpsElement) {
      this.avgFpsElement.textContent = `${stats.avgFps}`;
    }

    if (this.minFpsElement) {
      this.minFpsElement.textContent = `${stats.minFps}`;
    }

    if (this.maxFpsElement) {
      this.maxFpsElement.textContent = `${stats.maxFps}`;
    }

    if (this.frameTimeElement) {
      this.frameTimeElement.textContent = `${stats.frameTimeMs.toFixed(1)}ms`;
    }

    if (this.trianglesElement) {
      this.trianglesElement.textContent = stats.triangles.toLocaleString();
    }

    if (this.drawCallsElement) {
      this.drawCallsElement.textContent = stats.drawCalls.toLocaleString();
    }

    if (this.instancesElement) {
      this.instancesElement.textContent = stats.instancesRendered.toLocaleString();
    }

    if (this.culledElement) {
      this.culledElement.textContent = stats.objectsCulled.toLocaleString();
      this.culledElement.style.color = stats.objectsCulled > 0 ? '#ffaa00' : '#00ff00';
    }

    if (this.staticObjectsElement) {
      this.staticObjectsElement.textContent = stats.staticObjects.toLocaleString();
    }

    if (this.dynamicObjectsElement) {
      this.dynamicObjectsElement.textContent = stats.dynamicObjects.toLocaleString();
    }
  }

  /**
   * Get color based on FPS value
   */
  private getFpsColor(fps: number): string {
    if (fps >= 55) return '#00ff00'; // Green - good
    if (fps >= 30) return '#ffff00'; // Yellow - acceptable
    return '#ff4444'; // Red - needs attention
  }

  /**
   * Toggle HUD visibility
   */
  toggle(): void {
    this.setVisible(!this.isVisible);
  }

  /**
   * Set HUD visibility
   */
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.element) {
      this.element.style.opacity = visible ? '1' : '0';
    }
  }

  /**
   * Check if HUD is visible
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Unmount and cleanup
   */
  unmount(): void {
    if (this.updateInterval) {
      cancelAnimationFrame(this.updateInterval);
      this.updateInterval = 0;
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.fpsElement = null;
    this.avgFpsElement = null;
    this.minFpsElement = null;
    this.maxFpsElement = null;
    this.frameTimeElement = null;
    this.trianglesElement = null;
    this.drawCallsElement = null;
    this.instancesElement = null;
    this.culledElement = null;
    this.staticObjectsElement = null;
    this.dynamicObjectsElement = null;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.unmount();
  }
}
