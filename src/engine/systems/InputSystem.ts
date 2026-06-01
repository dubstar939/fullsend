/**
 * Input System - Unified keyboard, gamepad, and touch input
 */

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  nitrous: boolean;
  handbrake: boolean;
  action: boolean;
}

export interface InputAxis {
  steer: number; // -1 to 1
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
}

export class InputSystem {
  private state: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    nitrous: false,
    handbrake: false,
    action: false,
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
    Enter: 'action',
    KeyE: 'action',
  };

  private gamepadIndex: number | null = null;

  constructor() {
    this.setupKeyboardListeners();
    this.setupGamepadListeners();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private setupGamepadListeners(): void {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadIndex = null;
    });
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

  /**
   * Update input state (called each frame)
   */
  update(_deltaTime: number): void {
    // Poll gamepad if connected
    if (this.gamepadIndex !== null) {
      this.pollGamepad();
    }
  }

  /**
   * Poll gamepad state
   */
  private pollGamepad(): void {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex!];
    
    if (!gamepad) return;

    // Left stick or D-pad for steering
    const stickX = gamepad.axes[0];
    const dpadLeft = gamepad.buttons[14]?.pressed ?? false;
    const dpadRight = gamepad.buttons[15]?.pressed ?? false;
    
    this.state.left = stickX < -0.5 || dpadLeft;
    this.state.right = stickX > 0.5 || dpadRight;

    // Triggers for throttle/brake
    const rightTrigger = gamepad.buttons[7]?.value ?? 0;
    const leftTrigger = gamepad.buttons[6]?.value ?? 0;
    
    this.state.up = rightTrigger > 0.5;
    this.state.down = leftTrigger > 0.5;

    // Buttons
    this.state.nitrous = gamepad.buttons[2]?.pressed ?? false; // X button
    this.state.handbrake = gamepad.buttons[1]?.pressed ?? false; // A button
    this.state.action = gamepad.buttons[0]?.pressed ?? false; // B button

    // Update axes
    this.axis.steer = Math.max(-1, Math.min(1, stickX));
    this.axis.throttle = rightTrigger;
    this.axis.brake = leftTrigger;
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
      action: false,
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
    window.removeEventListener('gamepadconnected', () => {});
    window.removeEventListener('gamepaddisconnected', () => {});
  }
}
