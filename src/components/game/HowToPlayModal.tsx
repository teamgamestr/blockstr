import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Gamepad2 } from 'lucide-react';
import { useGamepadMenu } from '@/hooks/useGamepadMenu';
import { gameConfig } from '@/config/gameConfig';

interface HowToPlayModalProps {
  isOpen: boolean;
  onStart: () => void;
}

export function HowToPlayModal({ isOpen, onStart }: HowToPlayModalProps) {
  // Gamepad controls for modal
  useGamepadMenu({
    onConfirm: onStart,
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-black border-2 border-green-400 text-white max-w-md" hideClose>
        <DialogHeader>
          <DialogTitle className="font-retro text-green-400 text-xl text-center">
            HOW TO PLAY
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center font-retro text-xs">
            Classic Tetris with Bitcoin blocks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Desktop Controls */}
          <div className="hidden lg:block space-y-4">
            <div className="border border-gray-700 rounded p-4 space-y-3">
              <h3 className="font-retro text-sm text-yellow-400">KEYBOARD CONTROLS</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-8 h-8 border border-gray-600 rounded flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 border border-gray-600 rounded flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-gray-300">Move left/right</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-gray-600 rounded flex items-center justify-center">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                  <span className="text-gray-300">Rotate piece</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-gray-600 rounded flex items-center justify-center">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                  <span className="text-gray-300">Soft drop</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 border border-gray-600 rounded font-retro text-xs">
                    SPACE
                  </div>
                  <span className="text-gray-300">Hard drop</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 border border-gray-600 rounded font-retro text-xs">
                    P / ESC
                  </div>
                  <span className="text-gray-300">Pause</span>
                </div>
                {gameConfig.testMode && (
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1.5 border border-yellow-600 rounded font-retro text-xs bg-yellow-900/20">
                      B
                    </div>
                    <span className="text-yellow-400">🧪 Simulate block (test mode)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border border-gray-700 rounded p-4 space-y-3">
              <h3 className="font-retro text-sm text-purple-400 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                CONTROLLER SUPPORT
              </h3>
              <div className="space-y-2 text-xs text-gray-300">
                <p>• D-Pad / Left Stick: Move & rotate</p>
                <p>• A / X Buttons: Rotate piece</p>
                <p>• B Button: Hard drop</p>
                <p>• Shoulder Buttons: Move left/right</p>
                <p>• Start Button: Pause / Menu select</p>
                <p>• A Button in menus: Confirm</p>
              </div>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="lg:hidden space-y-4">
            <div className="border border-gray-700 rounded p-4 space-y-3">
              <h3 className="font-retro text-sm text-yellow-400">TOUCH CONTROLS</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <ArrowLeft className="w-6 h-6 text-blue-400" />
                    <ArrowRight className="w-6 h-6 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Swipe left/right to move</span>
                </div>
                <div className="flex items-center gap-3">
                  <ArrowUp className="w-6 h-6 text-blue-400" />
                  <span className="text-gray-300">Swipe up to rotate</span>
                </div>
                <div className="flex items-center gap-3">
                  <ArrowDown className="w-6 h-6 text-blue-400" />
                  <span className="text-gray-300">Swipe down to drop</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game Rules */}
          <div className="border border-gray-700 rounded p-4 space-y-3">
            <h3 className="font-retro text-sm text-orange-400">GAME RULES</h3>
            <div className="space-y-2 text-xs text-gray-300">
              <p>• <span className="text-purple-400">Difficulty increases every 2 minutes</span></p>
              <p>• <span className="text-yellow-400">Mempool score</span> builds during gameplay</p>
              <p>• <span className="text-green-400">Mined score</span> transfers when Bitcoin blocks are found</p>
              <p>• Golden bonus blocks (★) give 10x points</p>
              <p>• <span className="text-orange-400">Only mined scores</span> count and are published to <span className="text-blue-400">gamestr.io</span></p>
            </div>
          </div>
        </div>

        <Button
          onClick={onStart}
          className="w-full font-retro bg-green-400 hover:bg-green-500 text-black text-lg py-6"
        >
          START GAME
        </Button>
      </DialogContent>
    </Dialog>
  );
}
