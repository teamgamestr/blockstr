import React, { useEffect, useCallback, useState, useRef } from 'react';
import { GameBoard } from './GameBoard';
import { GameStats } from './GameStats';
import { GameControls } from './GameControls';
import { NextPiecePreview } from './NextPiecePreview';
import { PaymentGate } from './PaymentGate';
import { GameOverModal } from './GameOverModal';
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
  const [gameStartTime, setGameStartTime] = useState(0);
  const [sessionId] = useState(() => `blockstr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const gameBoardRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { currentBlock, blocksFound, isLoading, resetBlocksFound } = useBitcoinBlocks();
  const {
    gameState,
    startGame,
    pauseGame,
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
      case 'KeyP':
        event.preventDefault();
        pauseGame();
        break;
    }
  }, [gameState.gameStarted, gameState.gameOver, moveLeft, moveRight, rotate, hardDrop, pauseGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Swipe controls for mobile - only on game board
  useSwipeControls({
    onSwipeLeft: moveLeft,
    onSwipeRight: moveRight,
    onSwipeUp: rotate,
    onSwipeDown: hardDrop,
    enabled: gameState.gameStarted && !gameState.gameOver && !gameState.isPaused,
    elementRef: gameBoardRef,
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
    setGameStartTime(Date.now());
    resetBlocksFound();
  };

  const handleStartGame = () => {
    startGame();
    setGameStartTime(Date.now());
  };

  const handleNewGame = () => {
    setShowGameOverModal(false);
    resetGame();
    setHasStarted(false);
    setGameStartTime(0);
    resetBlocksFound();
  };

  const handleCloseModal = () => {
    setShowGameOverModal(false);
    resetGame();
    setHasStarted(false);
    setGameStartTime(0);
    resetBlocksFound();
  };

  const handleResetGame = () => {
    resetGame();
    setHasStarted(false);
    setGameStartTime(0);
    resetBlocksFound();
  };

  const gameDuration = gameStartTime > 0 ? Date.now() - gameStartTime : 0;

  if (!hasStarted) {
    return (
      <div className={cn("min-h-screen bg-black", className)}>
        <GameHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <PaymentGate onPaymentComplete={handlePaymentComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-black text-white flex flex-col", className)}>
      <GameHeader />
      <div className="max-w-6xl mx-auto p-2 sm:p-4 flex-1 w-full">
        {/* Status */}
        {isLoading && (
          <div className="text-center mb-2 sm:mb-4">
            <p className="font-retro text-xs text-yellow-400">Connecting to Bitcoin network...</p>
          </div>
        )}

        {/* Mobile Layout - Stats at top */}
        <div className="lg:hidden mb-3">
          <div className="grid grid-cols-2 gap-2">
            <GameStats
              gameState={gameState}
              currentBlock={currentBlock}
              className="col-span-1"
            />
            <NextPiecePreview piece={gameState.nextPiece} className="col-span-1" />
          </div>
        </div>

        {/* Main Game Area */}
        <div className="grid lg:grid-cols-[280px_1fr_280px] gap-3 sm:gap-4 lg:gap-6 items-start">
          {/* Left Panel - Stats (Desktop) */}
          <div className="hidden lg:block space-y-4">
            <GameStats
              gameState={gameState}
              currentBlock={currentBlock}
              className="lg:sticky lg:top-4"
            />
          </div>

          {/* Center - Game Board */}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <GameBoard ref={gameBoardRef} gameState={gameState} />

            {/* Swipe Hint for Mobile */}
            {gameState.gameStarted && !gameState.gameOver && (
              <div className="lg:hidden text-center text-xs text-gray-500 font-retro">
                SWIPE TO MOVE • TAP BUTTONS BELOW
              </div>
            )}

            {/* Mobile Controls */}
            <div className="lg:hidden w-full max-w-[300px] sm:max-w-[360px]">
              <GameControls
                onStart={handleStartGame}
                onPause={pauseGame}
                onReset={handleResetGame}
                onMoveLeft={moveLeft}
                onMoveRight={moveRight}
                onRotate={rotate}
                onHardDrop={hardDrop}
                gameStarted={gameState.gameStarted}
                gameOver={gameState.gameOver}
                isPaused={gameState.isPaused}
              />
            </div>
          </div>

          {/* Right Panel - Controls & Next Piece (Desktop) */}
          <div className="hidden lg:block space-y-4 lg:sticky lg:top-4">
            <NextPiecePreview piece={gameState.nextPiece} />

            {/* Desktop Controls */}
            <GameControls
              onStart={handleStartGame}
              onPause={pauseGame}
              onReset={handleResetGame}
              onMoveLeft={moveLeft}
              onMoveRight={moveRight}
              onRotate={rotate}
              onHardDrop={hardDrop}
              gameStarted={gameState.gameStarted}
              gameOver={gameState.gameOver}
              isPaused={gameState.isPaused}
            />
          </div>
        </div>

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

      {/* Footer */}
      <footer className="text-center mt-8 text-xs text-gray-500 font-retro">
        <div className="space-y-1">
          <div>Vibed with MKStack</div>
          <div>
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              https://soapbox.pub/mkstack
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}