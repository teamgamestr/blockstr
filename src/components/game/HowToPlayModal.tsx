import React, { useEffect, useRef } from 'react';
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
  const startButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the start button when modal opens
  useEffect(() => {
    if (isOpen && startButtonRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        startButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Gamepad controls for modal
  useGamepadMenu({
    onConfirm: onStart,
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="bg-black border-2 border-green-400 text-white max-w-2xl max-h-[90vh] flex flex-col" hideClose>
        <DialogHeader>
          <DialogTitle className="font-retro text-green-400 text-xl text-center">
            HOW TO PLAY
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center font-retro text-xs">
            Classic Tetris with Bitcoin blocks
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-2 flex-1">{/* Scrollable content */}
          {/* Two Column Layout for Desktop */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Keyboard Controls */}
            <div className="border border-gray-700 rounded p-3 space-y-2">
              <h3 className="font-retro text-xs text-yellow-400">⌨️ KEYBOARD</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">
                      <ArrowLeft className="w-3 h-3" />
                    </div>
                    <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                  <span className="text-gray-300">Move</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">
                    <ArrowUp className="w-3 h-3" />
                  </div>
                  <span className="text-gray-300">Rotate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 border border-gray-600 rounded flex items-center justify-center">
                    <ArrowDown className="w-3 h-3" />
                  </div>
                  <span className="text-gray-300">Soft drop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 border border-gray-600 rounded font-retro text-[0.65rem]">
                    SPACE
                  </div>
                  <span className="text-gray-300">Hard drop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 border border-gray-600 rounded font-retro text-[0.65rem]">
                    P / ESC
                  </div>
                  <span className="text-gray-300">Pause</span>
                </div>
                {gameConfig.testMode && (
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 border border-yellow-600 rounded font-retro text-[0.65rem] bg-yellow-900/20">
                      B
                    </div>
                    <span className="text-yellow-400">🧪 Test block</span>
                  </div>
                )}
              </div>
            </div>

            {/* Touch Controls */}
            <div className="lg:hidden border border-gray-700 rounded p-3 space-y-2">
              <h3 className="font-retro text-xs text-blue-400">👆 TOUCH</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <ArrowLeft className="w-5 h-5 text-blue-400" />
                    <ArrowRight className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Swipe left/right</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUp className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300">Swipe up to rotate</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-300">Swipe down to drop</span>
                </div>
              </div>
            </div>

            {/* Controller Support */}
            <div className="border border-gray-700 rounded p-3 space-y-2">
              <h3 className="font-retro text-xs text-purple-400 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5" />
                CONTROLLER
              </h3>
              <div className="space-y-1 text-[0.65rem] text-gray-300">
                <p>• D-Pad / Stick: Move & rotate</p>
                <p>• A / X: Rotate piece</p>
                <p>• B: Hard drop</p>
                <p>• Bumpers: Move left/right</p>
                <p>• Start: Pause / Select</p>
              </div>
            </div>
          </div>

          {/* Game Rules */}
          <div className="border border-gray-700 rounded p-3 space-y-2">
            <h3 className="font-retro text-xs text-orange-400">🎮 GAME RULES</h3>
            <div className="space-y-1 text-[0.65rem] text-gray-300 leading-relaxed">
              <p>• <span className="text-purple-400">Difficulty increases every 2 minutes</span></p>
              <p>• <span className="text-yellow-400">Mempool score</span> builds during gameplay</p>
              <p>• <span className="text-green-400">Mined score</span> transfers when Bitcoin blocks are found</p>
              <p>• Golden bonus blocks (★) give 10x points</p>
              <p>• <span className="text-orange-400">Only mined scores</span> published to <span className="text-blue-400">gamestr.io</span></p>
            </div>
          </div>
        </div>

        <div className="space-y-2 flex-shrink-0 pt-2 border-t border-gray-700">
          <Button
            ref={startButtonRef}
            onClick={onStart}
            className="w-full font-retro bg-green-400 hover:bg-green-500 focus:bg-green-500 text-black text-base py-5 focus:ring-4 focus:ring-green-300 focus:ring-offset-2 focus:ring-offset-black transition-all"
          >
            START GAME (Press Enter)
          </Button>

          <div className="text-center text-[0.65rem] text-gray-500 font-retro">
            ⌨️ Tab to navigate • Enter/Space to select • ESC to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
