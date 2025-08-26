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
    <div className={cn("bg-black border-2 border-gray-600 p-4 font-retro text-sm", className)}>
      <div className="space-y-3">
        {/* Mempool Score */}
        <div>
          <div className="text-yellow-400 text-xs mb-1">MEMPOOL SCORE</div>
          <div className="text-white text-lg">{formatNumber(gameState.mempoolScore)}</div>
        </div>

        {/* Mined Score */}
        <div>
          <div className="text-green-400 text-xs mb-1">MINED SCORE</div>
          <div className="text-white text-lg">{formatNumber(gameState.minedScore)}</div>
        </div>

        {/* Level */}
        <div>
          <div className="text-green-400 text-xs mb-1">LEVEL</div>
          <div className="text-white">{gameState.level}</div>
        </div>

        {/* Lines */}
        <div>
          <div className="text-green-400 text-xs mb-1">LINES</div>
          <div className="text-white">{gameState.linesCleared}</div>
        </div>

        {/* Bitcoin Blocks */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-orange-400 text-xs mb-1">BLOCKS FOUND</div>
          <div className="text-white">{gameState.bitcoinBlocks}</div>
        </div>

        {/* Current Bitcoin Block */}
        {currentBlock && (
          <div>
            <div className="text-orange-400 text-xs mb-1">CURRENT BLOCK</div>
            <div className="text-white text-xs">
              <div>#{formatNumber(currentBlock.height)}</div>
              <div className="text-gray-400">{formatTime(currentBlock.timestamp)}</div>
            </div>
          </div>
        )}

        {/* Game Speed */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-blue-400 text-xs mb-1">SPEED</div>
          <div className="text-white">{Math.round(1000 / gameState.dropSpeed * 10) / 10}x</div>
        </div>

        {/* Game Status */}
        {gameState.isPaused && (
          <div className="text-yellow-400 text-center animate-pulse">
            PAUSED
          </div>
        )}

        {gameState.gameOver && (
          <div className="text-red-400 text-center animate-pulse">
            GAME OVER
          </div>
        )}
      </div>
    </div>
  );
}