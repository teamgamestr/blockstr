import { useEffect, useRef, useCallback } from 'react';

interface GamepadMenuOptions {
  onConfirm?: () => void;
  onCancel?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
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

// Deadzone for analog sticks
const DEADZONE = 0.3;

// Delay between repeat actions (in milliseconds)
const REPEAT_DELAY = 200;

/**
 * Hook to handle USB gamepad/controller input for menu navigation
 * Supports standard gamepad layout (Xbox, PlayStation, etc.)
 */
export function useGamepadMenu({
  onConfirm,
  onCancel,
  onNavigateUp,
  onNavigateDown,
  onNavigateLeft,
  onNavigateRight,
  enabled,
}: GamepadMenuOptions) {
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

    // A button - Confirm/Select
    if (gamepad.buttons[BUTTON_MAP.A]?.pressed && canPerformAction('button_a')) {
      onConfirm?.();
    }

    // B button - Cancel/Back
    if (gamepad.buttons[BUTTON_MAP.B]?.pressed && canPerformAction('button_b')) {
      onCancel?.();
    }

    // Start button - Confirm (alternative)
    if (gamepad.buttons[BUTTON_MAP.START]?.pressed && canPerformAction('start')) {
      onConfirm?.();
    }

    // Select button - Cancel (alternative)
    if (gamepad.buttons[BUTTON_MAP.SELECT]?.pressed && canPerformAction('select')) {
      onCancel?.();
    }

    // D-Pad navigation
    if (gamepad.buttons[BUTTON_MAP.DPAD_UP]?.pressed && canPerformAction('dpad_up')) {
      onNavigateUp?.();
    }
    if (gamepad.buttons[BUTTON_MAP.DPAD_DOWN]?.pressed && canPerformAction('dpad_down')) {
      onNavigateDown?.();
    }
    if (gamepad.buttons[BUTTON_MAP.DPAD_LEFT]?.pressed && canPerformAction('dpad_left')) {
      onNavigateLeft?.();
    }
    if (gamepad.buttons[BUTTON_MAP.DPAD_RIGHT]?.pressed && canPerformAction('dpad_right')) {
      onNavigateRight?.();
    }

    // Left analog stick navigation (with deadzone)
    const leftStickX = gamepad.axes[AXIS_MAP.LEFT_STICK_X];
    const leftStickY = gamepad.axes[AXIS_MAP.LEFT_STICK_Y];

    if (leftStickY < -DEADZONE && canPerformAction('stick_up')) {
      onNavigateUp?.();
    }
    if (leftStickY > DEADZONE && canPerformAction('stick_down')) {
      onNavigateDown?.();
    }
    if (leftStickX < -DEADZONE && canPerformAction('stick_left')) {
      onNavigateLeft?.();
    }
    if (leftStickX > DEADZONE && canPerformAction('stick_right')) {
      onNavigateRight?.();
    }

    // Continue polling
    animationFrameRef.current = requestAnimationFrame(pollGamepad);
  }, [enabled, onConfirm, onCancel, onNavigateUp, onNavigateDown, onNavigateLeft, onNavigateRight, canPerformAction]);

  useEffect(() => {
    if (!enabled) return;

    // Start polling
    animationFrameRef.current = requestAnimationFrame(pollGamepad);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, pollGamepad]);

  return null;
}
