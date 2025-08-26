import React from 'react';
import type { GameState } from '@/types/game';
import { gameConfig } from '@/config/gameConfig';
import { cn } from '@/lib/utils';

interface GameBoardProps {
  gameState: GameState;
  className?: string;
}

export function GameBoard({ gameState, className }: GameBoardProps) {
  const { board, currentPiece } = gameState;

  // Create a display board that includes the current falling piece
  const displayBoard = board.map(row => [...row]);

  // Add current piece to display board
  if (currentPiece) {
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const boardY = currentPiece.position.y + y;
          const boardX = currentPiece.position.x + x;
          if (boardY >= 0 && boardY < gameConfig.boardHeight && 
              boardX >= 0 && boardX < gameConfig.boardWidth) {
            displayBoard[boardY][boardX] = {
              x: boardX,
              y: boardY,
              color: currentPiece.color,
              isBonus: currentPiece.isBonus
            };
          }
        }
      }
    }
  }

  return (
    <div 
      className={cn(
        "grid border-4 border-gray-800 bg-black relative",
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${gameConfig.boardWidth}, 1fr)`,
        gridTemplateRows: `repeat(${gameConfig.boardHeight}, 1fr)`,
        width: gameConfig.boardWidth * gameConfig.blockSize,
        height: gameConfig.boardHeight * gameConfig.blockSize,
      }}
    >
      {displayBoard.map((row, y) =>
        row.map((block, x) => (
          <div
            key={`${x}-${y}`}
            className={cn(
              "border border-gray-700 relative",
              block ? "border-gray-600" : "border-gray-900"
            )}
            style={{
              backgroundColor: block ? block.color : 'transparent',
              width: gameConfig.blockSize,
              height: gameConfig.blockSize,
            }}
          >
            {block?.isBonus && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs text-black font-bold animate-pulse">★</div>
              </div>
            )}
          </div>
        ))
      )}
      
      {/* Grid overlay for retro look */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${gameConfig.blockSize}px ${gameConfig.blockSize}px`,
        }}
      />
    </div>
  );
}