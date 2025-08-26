import React, { useEffect, useCallback, useState } from 'react';
import { GameBoard } from './GameBoard';
import { GameStats } from './GameStats';
import { GameControls } from './GameControls';
import { NextPiecePreview } from './NextPiecePreview';
import { PaymentGate } from './PaymentGate';
import { GameOverModal } from './GameOverModal';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useBitcoinBlocks } from '@/hooks/useBitcoinBlocks';
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
      <div className={cn("flex items-center justify-center min-h-screen bg-black", className)}>
        <PaymentGate onPaymentComplete={handlePaymentComplete} />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-black text-white p-4", className)}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="font-retro text-4xl text-green-400 mb-2">BLOCKSTR</h1>
          <p className="font-retro text-sm text-gray-400">Bitcoin-Powered Tetris</p>
          {isLoading && (
            <p className="font-retro text-xs text-yellow-400 mt-2">Connecting to Bitcoin network...</p>
          )}
        </header>

        {/* Main Game Area */}
        <div className="grid lg:grid-cols-[300px_1fr_300px] gap-6 items-start">
          {/* Left Panel - Stats */}
          <div className="space-y-4">
            <GameStats 
              gameState={gameState} 
              currentBlock={currentBlock}
              className="lg:sticky lg:top-4"
            />
          </div>

          {/* Center - Game Board */}
          <div className="flex flex-col items-center gap-4">
            <GameBoard gameState={gameState} />
            
            {/* Mobile Controls */}
            <div className="lg:hidden">
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

          {/* Right Panel - Controls & Next Piece */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <NextPiecePreview piece={gameState.nextPiece} />
            
            {/* Desktop Controls */}
            <div className="hidden lg:block">
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
        </div>

        {/* Game Over Modal */}
        <GameOverModal
          isOpen={showGameOverModal}
          gameState={gameState}
          sessionId={sessionId}
          duration={gameDuration}
          onNewGame={handleNewGame}
          onClose={() => setShowGameOverModal(false)}
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