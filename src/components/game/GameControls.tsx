import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCw, ArrowLeft, ArrowRight, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GameControlsProps {
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRotate: () => void;
  onHardDrop: () => void;
  gameStarted: boolean;
  gameOver: boolean;
  isPaused: boolean;
  className?: string;
}

export function GameControls({
  onStart,
  onPause,
  onReset,
  onMoveLeft,
  onMoveRight,
  onRotate,
  onHardDrop,
  gameStarted,
  gameOver,
  isPaused,
  className
}: GameControlsProps) {
  return (
    <div className={cn("bg-black border-2 border-gray-600 p-4", className)}>
      {/* Main Controls */}
      <div className="space-y-4">
        <div className="text-green-400 text-xs font-retro text-center">CONTROLS</div>
        
        {/* Start/Pause/Reset */}
        <div className="flex gap-2 justify-center">
          {!gameStarted || gameOver ? (
            <Button
              onClick={gameOver ? onReset : onStart}
              className="bg-green-600 hover:bg-green-700 text-black font-retro text-xs px-4 py-2"
            >
              <Play className="w-4 h-4 mr-1" />
              {gameOver ? 'NEW GAME' : 'START'}
            </Button>
          ) : (
            <Button
              onClick={onPause}
              className="bg-yellow-600 hover:bg-yellow-700 text-black font-retro text-xs px-4 py-2"
            >
              <Pause className="w-4 h-4 mr-1" />
              {isPaused ? 'RESUME' : 'PAUSE'}
            </Button>
          )}
          
          {gameStarted && (
            <Button
              onClick={onReset}
              variant="destructive"
              className="font-retro text-xs px-4 py-2"
            >
              RESET
            </Button>
          )}
        </div>

        {/* Game Controls */}
        {gameStarted && !gameOver && (
          <div className="space-y-3">
            {/* Movement */}
            <div className="grid grid-cols-3 gap-2 max-w-[120px] mx-auto">
              <div></div>
              <Button
                onClick={onRotate}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-retro text-xs p-2"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              <div></div>
              
              <Button
                onClick={onMoveLeft}
                size="sm"
                className="bg-gray-600 hover:bg-gray-700 text-white font-retro text-xs p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={onHardDrop}
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white font-retro text-xs p-2"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={onMoveRight}
                size="sm"
                className="bg-gray-600 hover:bg-gray-700 text-white font-retro text-xs p-2"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-gray-400 text-xs space-y-1 mt-4">
          <div className="text-center text-green-400 mb-2">KEYBOARD</div>
          <div>← → : Move</div>
          <div>↑ : Rotate</div>
          <div>↓ : Drop</div>
          <div>SPACE : Hard Drop</div>
          <div>P : Pause</div>
        </div>

        {/* Game Info */}
        <div className="text-xs text-yellow-400 text-center mt-4 space-y-1">
          <div>Speed increases with</div>
          <div>each Bitcoin block!</div>
          <div className="text-gold">★ = 10x BONUS</div>
        </div>
      </div>
    </div>
  );
}