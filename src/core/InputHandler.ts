/**
 * Input Handler - Manages keyboard and touch input with state tracking
 */

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  nitrous: boolean;
  handbrake: boolean;
}

export interface InputAxis {
  steer: number; // -1 to 1
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
}

export class InputHandler {
  private state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    nitrous: false,
    handbrake: false,
  };

  private axis: InputAxis = {
    steer: 0,
    throttle: 0,
    brake: 0,
  };

  private keyMap: Record<string, keyof InputState> = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    Space: 'handbrake',
    ShiftLeft: 'nitrous',
    ShiftRight: 'nitrous',
  };

  private onTouchStart?: (input: InputState) => void;
  private onTouchEnd?: () => void;

  constructor() {
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.code;
    if (this.keyMap[key]) {
      this.state[this.keyMap[key]] = true;
      this.updateAxis();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.code;
    if (this.keyMap[key]) {
      this.state[this.keyMap[key]] = false;
      this.updateAxis();
    }
  }

  private updateAxis(): void {
    // Steering axis
    if (this.state.left) {
      this.axis.steer = -1;
    } else if (this.state.right) {
      this.axis.steer = 1;
    } else {
      this.axis.steer = 0;
    }

    // Throttle axis
    this.axis.throttle = this.state.up ? 1 : 0;

    // Brake axis
    this.axis.brake = this.state.down || this.state.handbrake ? 1 : 0;
  }

  getState(): InputState {
    return { ...this.state };
  }

  getAxis(): InputAxis {
    return { ...this.axis };
  }

  isSteering(): boolean {
    return this.state.left || this.state.right;
  }

  isAccelerating(): boolean {
    return this.state.up;
  }

  isBraking(): boolean {
    return this.state.down || this.state.handbrake;
  }

  isUsingNitrous(): boolean {
    return this.state.nitrous;
  }

  setTouchControls(enabled: boolean): void {
    if (!enabled) {
      this.onTouchStart = undefined;
      this.onTouchEnd = undefined;
      return;
    }

    // Touch controls would be implemented via UI buttons
    // This sets up the callback interface
    this.onTouchStart = (input) => {
      this.state = { ...this.state, ...input };
      this.updateAxis();
    };

    this.onTouchEnd = () => {
      this.state = {
        left: false,
        right: false,
        up: false,
        down: false,
        nitrous: false,
        handbrake: false,
      };
      this.updateAxis();
    };
  }

  simulateInput(input: Partial<InputState>): void {
    this.state = { ...this.state, ...input };
    this.updateAxis();
  }

  reset(): void {
    this.state = {
      left: false,
      right: false,
      up: false,
      down: false,
      nitrous: false,
      handbrake: false,
    };
    this.axis = {
      steer: 0,
      throttle: 0,
      brake: 0,
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}

/**
 * Mobile touch button handler
 */
export class TouchButton {
  private elementId: string;
  private inputKey: keyof InputState;
  private handler: InputHandler;
  private isActive: boolean = false;

  constructor(elementId: string, inputKey: keyof InputState, handler: InputHandler) {
    this.elementId = elementId;
    this.inputKey = inputKey;
    this.handler = handler;
    this.setupTouchListeners();
  }

  private setupTouchListeners(): void {
    const element = document.getElementById(this.elementId);
    if (!element) return;

    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isActive = true;
      this.handler.simulateInput({ [this.inputKey]: true });
    });

    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isActive = false;
      this.handler.simulateInput({ [this.inputKey]: false });
    });

    element.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.isActive = false;
      this.handler.simulateInput({ [this.inputKey]: false });
    });
  }

  destroy(): void {
    const element = document.getElementById(this.elementId);
    if (!element) return;

    element.removeEventListener('touchstart', () => {});
    element.removeEventListener('touchend', () => {});
    element.removeEventListener('touchcancel', () => {});
  }
}
