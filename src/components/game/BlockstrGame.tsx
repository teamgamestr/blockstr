import React, { useEffect, useCallback, useState, useRef } from 'react';
import { GameBoard } from './GameBoard';
import { GameStats } from './GameStats';
import { NextPiecePreview } from './NextPiecePreview';
import { PaymentGate } from './PaymentGate';
import { GameOverModal } from './GameOverModal';
import { HowToPlayModal } from './HowToPlayModal';
import { GameHeader } from '@/components/GameHeader';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useBitcoinBlocks } from '@/hooks/useBitcoinBlocks';
import { useSwipeControls } from '@/hooks/useSwipeControls';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';

interface BlockstrGameProps {
  className?: string;
}

export function BlockstrGame({ className }: BlockstrGameProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [sessionId] = useState(() => `blockstr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const gameBoardRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { currentBlock, blocksFound, resetBlocksFound } = useBitcoinBlocks();
  const {
    gameState,
    startGame,
    resetGame,
    moveLeft,
    moveRight,
    rotate,
    hardDrop
  } = useGameLogic(blocksFound);

  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        event.preventDefault();
        moveLeft();
        break;
      case 'ArrowRight':
      case 'KeyD':
        event.preventDefault();
        moveRight();
        break;
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        rotate();
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        // Soft drop - just calls hardDrop for simplicity
        hardDrop();
        break;
      case 'Space':
        event.preventDefault();
        hardDrop();
        break;
    }
  }, [gameState.gameStarted, gameState.gameOver, moveLeft, moveRight, rotate, hardDrop]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Swipe controls for mobile - on entire document for easier control
  useSwipeControls({
    onSwipeLeft: moveLeft,
    onSwipeRight: moveRight,
    onSwipeUp: rotate,
    onSwipeDown: hardDrop,
    enabled: gameState.gameStarted && !gameState.gameOver,
  });

  // Handle new Bitcoin blocks
  useEffect(() => {
    if (blocksFound > 0 && gameState.gameStarted && !gameState.gameOver) {
      toast({
        title: "⚡ NEW BITCOIN BLOCK!",
        description: `Block #${currentBlock?.height} found! Speed increased!`,
        duration: 3000,
      });
    }
  }, [blocksFound, gameState.gameStarted, gameState.gameOver, currentBlock?.height, toast]);

  // Handle game over
  useEffect(() => {
    if (gameState.gameOver && gameState.gameStarted && !showGameOverModal) {
      setShowGameOverModal(true);
    }
  }, [gameState.gameOver, gameState.gameStarted, showGameOverModal]);

  const handlePaymentComplete = () => {
    setHasStarted(true);
    setShowHowToPlay(true);
  };

  const handleStartGame = () => {
    setShowHowToPlay(false);
    startGame();
    setGameStartTime(Date.now());
    resetBlocksFound();
  };

  const handleNewGame = () => {
    setShowGameOverModal(false);
    setShowHowToPlay(true);
    resetGame();
    setGameStartTime(0);
  };

  const handleCloseModal = () => {
    setShowGameOverModal(false);
    resetGame();
    setHasStarted(false);
    setShowHowToPlay(false);
    setGameStartTime(0);
    resetBlocksFound();
  };

  const gameDuration = gameStartTime > 0 ? Date.now() - gameStartTime : 0;

  if (!hasStarted) {
    return (
      <div className={cn("h-screen bg-black flex flex-col overflow-hidden", className)}>
        <GameHeader />
        <div className="flex items-center justify-center flex-1 overflow-y-auto">
          <PaymentGate onPaymentComplete={handlePaymentComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen bg-black text-white flex flex-col overflow-hidden", className)}>
      <GameHeader className="flex-shrink-0" />

      {/* Mobile Layout */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        {/* Compact Stats Bar - Fixed height */}
        <div className="h-8 flex-shrink-0 px-2 border-b border-gray-700 flex items-center">
          <div className="flex items-center justify-between gap-2 text-[0.65rem] font-retro w-full">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-yellow-400">MEMPOOL:</span>{' '}
                <span className="text-white">{gameState.mempoolScore.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-green-400">MINED:</span>{' '}
                <span className="text-white">{gameState.minedScore.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <span className="text-orange-400">LVL:</span>{' '}
                <span className="text-white">{gameState.level}</span>
              </div>
              <div>
                <span className="text-blue-400">SPD:</span>{' '}
                <span className="text-white">{Math.round(1000 / gameState.dropSpeed * 10) / 10}x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Piece Bar - Fixed height */}
        <div className="h-14 flex-shrink-0 px-2 border-b border-gray-700 flex items-center">
          <div className="flex items-center gap-3 w-full">
            <span className="text-green-400 text-[0.65rem] font-retro">NEXT:</span>
            {gameState.nextPiece && (() => {
              const piece = gameState.nextPiece;
              const gridSize = Math.max(piece.shape.length, piece.shape[0]?.length || 0);
              return (
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    gridTemplateRows: `repeat(${gridSize}, 1fr)`,
                    width: '48px',
                    height: '48px',
                  }}
                >
                  {Array(gridSize).fill(null).map((_, y) =>
                    Array(gridSize).fill(null).map((_, x) => {
                      const hasBlock = piece.shape[y]?.[x] === 1;
                      return (
                        <div
                          key={`${x}-${y}`}
                          className="border border-gray-800"
                          style={{
                            backgroundColor: hasBlock ? piece.color : 'transparent',
                          }}
                        >
                          {hasBlock && piece.isBonus && (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-[0.4rem] text-black font-bold">★</div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}
            <div className="flex-1 flex items-center justify-end gap-3 text-[0.65rem] font-retro">
              <div>
                <span className="text-green-400">LINES:</span>{' '}
                <span className="text-white">{gameState.linesCleared}</span>
              </div>
              <div>
                <span className="text-orange-400">BLOCKS:</span>{' '}
                <span className="text-white">{gameState.bitcoinBlocks}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Board Container - Takes remaining space with padding */}
        <div className="flex-1 relative flex items-start justify-center overflow-hidden px-3 pt-2 pb-4">
          <div className="h-full w-full max-w-[280px] flex items-start justify-center">
            <GameBoard
              ref={gameBoardRef}
              gameState={gameState}
              className="max-h-full"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '100%',
              }}
            />
          </div>

          {/* Status Messages - Absolute positioned overlay */}
          {gameState.gameOver && (
            <div className="absolute bottom-2 left-0 right-0 text-red-400 text-center text-xs font-retro animate-pulse z-10">
              GAME OVER
            </div>
          )}

          {/* Swipe Hint - Absolute positioned overlay */}
          {gameState.gameStarted && !gameState.gameOver && (
            <div className="absolute bottom-2 left-0 right-0 text-center text-[0.6rem] text-gray-500 font-retro z-10">
              SWIPE TO CONTROL
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex max-w-6xl mx-auto px-4 flex-1 w-full overflow-hidden">
        <div className="grid grid-cols-[260px_1fr_260px] gap-6 items-center flex-1 py-2">
          {/* Left Panel - Stats (Desktop) */}
          <div className="flex flex-col justify-center space-y-3">
            <GameStats
              gameState={gameState}
              currentBlock={currentBlock}
            />
          </div>

          {/* Center - Game Board */}
          <div className="flex flex-col items-center justify-center">
            <GameBoard ref={gameBoardRef} gameState={gameState} />
          </div>

          {/* Right Panel - Next Piece (Desktop) */}
          <div className="flex flex-col justify-center space-y-3">
            <NextPiecePreview piece={gameState.nextPiece} />
          </div>
        </div>

        {/* Desktop Footer */}
        <footer className="absolute bottom-2 left-0 right-0 text-center text-xs text-gray-500 font-retro">
          <div className="flex items-center justify-center gap-2">
            <span>Vibed with MKStack</span>
            <span>•</span>
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              soapbox.pub/mkstack
            </a>
          </div>
        </footer>
      </div>

      {/* How to Play Modal */}
      <HowToPlayModal isOpen={showHowToPlay} onStart={handleStartGame} />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOverModal}
        gameState={gameState}
        sessionId={sessionId}
        duration={gameDuration}
        onNewGame={handleNewGame}
        onClose={handleCloseModal}
      />
    </div>
  );
}