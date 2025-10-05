import React from 'react';
import type { GameState, BitcoinBlock } from '@/types/game';
import { cn } from '@/lib/utils';

interface GameStatsProps {
  gameState: GameState;
  currentBlock: BitcoinBlock | null;
  className?: string;
}

export function GameStats({ gameState, currentBlock, className }: GameStatsProps) {
  const formatNumber = (num: number) => num.toLocaleString();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  return (
    <div className={cn("bg-black border-2 border-gray-600 p-2 sm:p-3 lg:p-4 font-retro", className)}>
      <div className="space-y-2 lg:space-y-3">
        {/* Mempool Score */}
        <div>
          <div className="text-yellow-400 text-[0.6rem] sm:text-xs mb-0.5 sm:mb-1">MEMPOOL</div>
          <div className="text-white text-sm sm:text-base lg:text-lg">{formatNumber(gameState.mempoolScore)}</div>
        </div>

        {/* Mined Score */}
        <div>
          <div className="text-green-400 text-[0.6rem] sm:text-xs mb-0.5 sm:mb-1">MINED</div>
          <div className="text-white text-sm sm:text-base lg:text-lg">{formatNumber(gameState.minedScore)}</div>
        </div>

        {/* Level & Lines - Compact on mobile */}
        <div className="grid grid-cols-2 gap-2 lg:block lg:space-y-3">
          <div>
            <div className="text-green-400 text-[0.6rem] sm:text-xs mb-0.5 sm:mb-1">LEVEL</div>
            <div className="text-white text-sm sm:text-base">{gameState.level}</div>
          </div>

          <div>
            <div className="text-green-400 text-[0.6rem] sm:text-xs mb-0.5 sm:mb-1">LINES</div>
            <div className="text-white text-sm sm:text-base">{gameState.linesCleared}</div>
          </div>
        </div>

        {/* Bitcoin Blocks */}
        <div className="border-t border-gray-700 pt-2 lg:pt-3">
          <div className="text-orange-400 text-[0.6rem] sm:text-xs mb-0.5 sm:mb-1">BLOCKS</div>
          <div className="text-white text-sm sm:text-base">{gameState.bitcoinBlocks}</div>
        </div>

        {/* Current Bitcoin Block - Hide on small mobile */}
        {currentBlock && (
          <div className="hidden sm:block">
            <div className="text-orange-400 text-[0.6rem] sm:text-xs mb-0.5 sm:mb-1">CURRENT</div>
            <div className="text-white text-[0.6rem] sm:text-xs">
              <div>#{formatNumber(currentBlock.height)}</div>
              <div className="text-gray-400 hidden lg:block">{formatTime(currentBlock.timestamp)}</div>
            </div>
          </div>
        )}

        {/* Game Speed */}
        <div className="border-t border-gray-700 pt-2 lg:pt-3">
          <div className="text-blue-400 text-[0.6rem] sm:text-xs mb-0.5 sm:mb-1">SPEED</div>
          <div className="text-white text-sm sm:text-base">{Math.round(1000 / gameState.dropSpeed * 10) / 10}x</div>
        </div>

        {/* Game Status */}
        {gameState.isPaused && (
          <div className="text-yellow-400 text-center text-xs sm:text-sm animate-pulse">
            PAUSED
          </div>
        )}

        {gameState.gameOver && (
          <div className="text-red-400 text-center text-xs sm:text-sm animate-pulse">
            GAME OVER
          </div>
        )}
      </div>
    </div>
  );
}