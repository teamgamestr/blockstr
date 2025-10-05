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
  const blockSize = 20; // Smaller blocks for preview

  return (
    <div className={cn("border-2 border-gray-600 bg-black p-2", className)}>
      <div className="text-center text-xs font-retro text-green-400 mb-2">NEXT</div>
      <div
        className="grid mx-auto"
        style={{
          gridTemplateColumns: `repeat(${previewSize}, ${blockSize}px)`,
          gridTemplateRows: `repeat(${previewSize}, ${blockSize}px)`,
          width: previewSize * blockSize,
          height: previewSize * blockSize,
        }}
      >
        {Array(previewSize).fill(null).map((_, y) =>
          Array(previewSize).fill(null).map((_, x) => {
            const hasBlock = piece.shape[y]?.[x] === 1;
            return (
              <div
                key={`${x}-${y}`}
                className="border border-gray-800"
                style={{
                  backgroundColor: hasBlock ? piece.color : 'transparent',
                  width: blockSize,
                  height: blockSize,
                }}
              >
                {hasBlock && piece.isBonus && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-xs text-black font-bold">★</div>
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