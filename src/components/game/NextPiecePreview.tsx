import React from 'react';
import type { GamePiece } from '@/types/game';

import { cn } from '@/lib/utils';

interface NextPiecePreviewProps {
  piece: GamePiece | null;
  className?: string;
}

export function NextPiecePreview({ piece, className }: NextPiecePreviewProps) {
  if (!piece) return null;

  const previewSize = Math.max(piece.shape.length, piece.shape[0]?.length || 0);

  return (
    <div className={cn("border-2 border-gray-600 bg-black p-2 sm:p-3", className)}>
      <div className="text-center text-[0.6rem] sm:text-xs font-retro text-green-400 mb-1 sm:mb-2">NEXT</div>
      <div
        className="grid mx-auto w-full max-w-[80px] sm:max-w-[100px] aspect-square"
        style={{
          gridTemplateColumns: `repeat(${previewSize}, 1fr)`,
          gridTemplateRows: `repeat(${previewSize}, 1fr)`,
        }}
      >
        {Array(previewSize).fill(null).map((_, y) =>
          Array(previewSize).fill(null).map((_, x) => {
            const hasBlock = piece.shape[y]?.[x] === 1;
            return (
              <div
                key={`${x}-${y}`}
                className="border border-gray-800 w-full h-full"
                style={{
                  backgroundColor: hasBlock ? piece.color : 'transparent',
                }}
              >
                {hasBlock && piece.isBonus && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-[0.5rem] sm:text-xs text-black font-bold">★</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}