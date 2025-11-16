import { useEffect, useRef, useCallback } from 'react';

interface GamepadControlsOptions {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRotate: () => void;
  onHardDrop: () => void;
  onPause?: () => void;
  enabled: boolean;
}

// Gamepad button mapping (standard gamepad layout)
const BUTTON_MAP = {
  A: 0,        // Bottom button (A on Xbox, Cross on PlayStation)
  B: 1,        // Right button (B on Xbox, Circle on PlayStation)
  X: 2,        // Left button (X on Xbox, Square on PlayStation)
  Y: 3,        // Top button (Y on Xbox, Triangle on PlayStation)
  LB: 4,       // Left bumper
  RB: 5,       // Right bumper
  LT: 6,       // Left trigger
  RT: 7,       // Right trigger
  SELECT: 8,   // Select/Back/Share button
  START: 9,    // Start/Options button
  L3: 10,      // Left stick press
  R3: 11,      // Right stick press
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
};

// Axis mapping
const AXIS_MAP = {
  LEFT_STICK_X: 0,
  LEFT_STICK_Y: 1,
  RIGHT_STICK_X: 2,
  RIGHT_STICK_Y: 3,
};

// Deadzone for analog sticks (to prevent drift)
const DEADZONE = 0.3;

// Delay between repeat actions (in milliseconds)
const REPEAT_DELAY = 150;

/**
 * Hook to handle USB gamepad/controller input for game controls
 * Supports standard gamepad layout (Xbox, PlayStation, etc.)
 */
export function useGamepadControls({
  onMoveLeft,
  onMoveRight,
  onRotate,
  onHardDrop,
  onPause,
  enabled,
}: GamepadControlsOptions) {
  const lastActionTimeRef = useRef<Record<string, number>>({});
  const animationFrameRef = useRef<number>();

  const canPerformAction = useCallback((action: string): boolean => {
    const now = Date.now();
    const lastTime = lastActionTimeRef.current[action] || 0;
    if (now - lastTime >= REPEAT_DELAY) {
      lastActionTimeRef.current[action] = now;
      return true;
    }
    return false;
  }, []);

  const pollGamepad = useCallback(() => {
    if (!enabled) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // Use first connected gamepad

    if (!gamepad) {
      animationFrameRef.current = requestAnimationFrame(pollGamepad);
      return;
    }

    // D-Pad controls
    if (gamepad.buttons[BUTTON_MAP.DPAD_LEFT]?.pressed && canPerformAction('dpad_left')) {
      onMoveLeft();
    }
    if (gamepad.buttons[BUTTON_MAP.DPAD_RIGHT]?.pressed && canPerformAction('dpad_right')) {
      onMoveRight();
    }
    if (gamepad.buttons[BUTTON_MAP.DPAD_UP]?.pressed && canPerformAction('dpad_up')) {
      onRotate();
    }
    if (gamepad.buttons[BUTTON_MAP.DPAD_DOWN]?.pressed && canPerformAction('dpad_down')) {
      onHardDrop();
    }

    // Left analog stick (with deadzone)
    const leftStickX = gamepad.axes[AXIS_MAP.LEFT_STICK_X];
    const leftStickY = gamepad.axes[AXIS_MAP.LEFT_STICK_Y];

    if (leftStickX < -DEADZONE && canPerformAction('stick_left')) {
      onMoveLeft();
    }
    if (leftStickX > DEADZONE && canPerformAction('stick_right')) {
      onMoveRight();
    }
    if (leftStickY < -DEADZONE && canPerformAction('stick_up')) {
      onRotate();
    }
    if (leftStickY > DEADZONE && canPerformAction('stick_down')) {
      onHardDrop();
    }

    // Face buttons
    if (gamepad.buttons[BUTTON_MAP.A]?.pressed && canPerformAction('button_a')) {
      onRotate(); // A button rotates
    }
    if (gamepad.buttons[BUTTON_MAP.B]?.pressed && canPerformAction('button_b')) {
      onHardDrop(); // B button hard drops
    }
    if (gamepad.buttons[BUTTON_MAP.X]?.pressed && canPerformAction('button_x')) {
      onRotate(); // X button also rotates
    }

    // Shoulder buttons for movement
    if (gamepad.buttons[BUTTON_MAP.LB]?.pressed && canPerformAction('lb')) {
      onMoveLeft();
    }
    if (gamepad.buttons[BUTTON_MAP.RB]?.pressed && canPerformAction('rb')) {
      onMoveRight();
    }

    // Start button for pause
    if (gamepad.buttons[BUTTON_MAP.START]?.pressed && canPerformAction('start')) {
      onPause?.();
    }

    // Continue polling
    animationFrameRef.current = requestAnimationFrame(pollGamepad);
  }, [enabled, onMoveLeft, onMoveRight, onRotate, onHardDrop, onPause, canPerformAction]);

  useEffect(() => {
    if (!enabled) return;

    // Start polling
    animationFrameRef.current = requestAnimationFrame(pollGamepad);

    // Handle gamepad connection events
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
    };

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
    };

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
    };
  }, [enabled, pollGamepad]);

  return null;
}
