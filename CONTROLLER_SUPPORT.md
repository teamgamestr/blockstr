# USB Controller Support

Blockstr now supports USB game controllers (gamepads) for a more authentic retro gaming experience!

## Supported Controllers

The game uses the standard Gamepad API and supports any controller that follows the standard layout, including:

- **Xbox Controllers** (Xbox One, Xbox Series X/S)
- **PlayStation Controllers** (DualShock 4, DualSense)
- **Nintendo Switch Pro Controller**
- **Generic USB controllers** with standard button mapping

## Controller Mapping

### D-Pad / Left Analog Stick
- **Left/Right**: Move piece horizontally
- **Up**: Rotate piece
- **Down**: Hard drop

### Face Buttons
- **A Button** (Xbox) / **Cross** (PlayStation): Rotate piece
- **B Button** (Xbox) / **Circle** (PlayStation): Hard drop
- **X Button** (Xbox) / **Square** (PlayStation): Rotate piece
- **Y Button** (Xbox) / **Triangle** (PlayStation): *(not mapped)*

### Shoulder Buttons
- **Left Bumper (LB/L1)**: Move left
- **Right Bumper (RB/R1)**: Move right

### System Buttons
- **Start/Options Button**: Pause/Resume game

## Features

### Analog Stick Support
- The left analog stick works just like the D-pad
- Built-in **deadzone** (0.3) prevents controller drift
- Smooth and responsive controls

### Repeat Actions
- Actions repeat automatically when holding buttons/stick
- **150ms delay** between repeats for precise control
- Prevents accidental double-inputs

### Hot-Plugging
- Controllers can be connected/disconnected at any time
- Automatic detection when a controller is plugged in
- Console logging for connection/disconnection events

### Multiple Control Methods
All control methods work simultaneously:
- ✅ Keyboard (Arrow keys, WASD)
- ✅ Touch/Swipe (mobile)
- ✅ USB Controller (gamepad)

## Technical Details

### Implementation
The controller support is implemented using the **Gamepad API**:
- Continuous polling using `requestAnimationFrame`
- Checks all buttons and axes every frame
- Only processes actions when the game is active (not paused/game over)

### Button Mapping
Uses the **Standard Gamepad** layout defined by the W3C:
- Buttons 0-15 for face buttons, shoulders, triggers, D-pad
- Axes 0-3 for left and right analog sticks

### Performance
- Efficient polling with RAF (no setTimeout/setInterval)
- Minimal overhead - only polls when game is active
- Cleanup on unmount to prevent memory leaks

## Linux/Ubuntu Setup

**Good news!** No additional setup is required for most controllers on Ubuntu. The Gamepad API works directly in the browser.

### What You Need
- **Modern Browser**: Chrome, Firefox, or Edge (all support Gamepad API)
- **USB Controller**: Just plug it in via USB
- **That's it!** The browser handles everything

### Verification Steps

1. **Plug in your controller** via USB
2. **Open the game** in your browser (Chrome/Firefox recommended)
3. **Check browser console** (F12) - you should see "Gamepad connected: [controller name]"
4. **Start playing** - controls should work immediately!

### Testing Your Controller

If you want to verify your controller works before playing:
1. Visit [gamepad-tester.com](https://gamepad-tester.com) in your browser
2. Press buttons and move sticks
3. You should see button presses and axis movements

### Linux-Specific Notes

**No drivers needed!** Modern Linux kernels (3.x+) have built-in support for most USB controllers:
- ✅ Xbox controllers (xpad driver)
- ✅ PlayStation controllers (hid-sony driver)
- ✅ Generic USB gamepads (usbhid driver)

The browser accesses controllers through the kernel's input subsystem - no additional software required!

### If Your Controller Doesn't Work

1. **Check kernel detection**:
   ```bash
   # See if Linux detects your controller
   lsusb

   # Check input devices
   ls /dev/input/js*
   ```

2. **Test with jstest** (optional):
   ```bash
   # Install joystick utilities
   sudo apt install joystick

   # Test controller (replace js0 with your device)
   jstest /dev/input/js0
   ```

3. **Browser permissions**: Some browsers may need permission to access gamepads (usually granted automatically)

## Troubleshooting

### Controller Not Working?

1. **Check Connection**: Make sure your controller is properly connected via USB or Bluetooth
2. **Browser Support**: Use a modern browser (Chrome, Edge, Firefox)
3. **Check Console**: Open browser DevTools (F12) to see connection messages
4. **Test Button Mapping**: Visit [gamepad-tester.com](https://gamepad-tester.com) to verify your controller works
5. **Try Different Browser**: If one browser doesn't work, try another (Chrome usually has best support)

### Button Mapping Issues?

Some controllers may have non-standard button mappings. If your controller doesn't work as expected:
- Check if it's recognized as a "standard" gamepad
- Try different buttons to see which ones work
- File an issue with your controller model for custom mapping support

### Bluetooth Controllers on Linux

If using Bluetooth instead of USB:
1. Pair controller via Bluetooth settings
2. Some controllers may need additional setup:
   ```bash
   # For PlayStation controllers
   sudo apt install ds4drv

   # For Xbox controllers (usually work out of the box)
   sudo apt install xboxdrv
   ```

## Browser Compatibility

The Gamepad API is supported in all modern browsers:
- ✅ Chrome/Edge 21+
- ✅ Firefox 29+
- ✅ Safari 10.1+
- ✅ Opera 24+

## Future Enhancements

Potential improvements for future versions:
- Custom button mapping configuration
- Multiple controller support (for multiplayer)
- Rumble/haptic feedback on line clears
- Controller battery status indicator
- Save custom control preferences

---

**Enjoy playing Blockstr with your favorite controller!** 🎮
