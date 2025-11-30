import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { GameBoard } from './GameBoard';
import { GameStats } from './GameStats';
import { NextPiecePreview } from './NextPiecePreview';
import { PaymentGate } from './PaymentGate';
import { GameOverModal } from './GameOverModal';
import { HowToPlayModal } from './HowToPlayModal';
import { BlockMinedAnimation } from './BlockMinedAnimation';
import { GameHeader } from '@/components/GameHeader';
import { useGameLogic } from '@/hooks/useGameLogic';
import { useBitcoinBlocks } from '@/hooks/useBitcoinBlocks';
import { useSwipeControls } from '@/hooks/useSwipeControls';
import { useGamepadControls } from '@/hooks/useGamepadControls';
import { useToast } from '@/hooks/useToast';
import { useChiptuneMusic } from '@/hooks/useChiptuneMusic';
import { cn } from '@/lib/utils';
import { gameConfig } from '@/config/gameConfig';

interface BlockstrGameProps {
  className?: string;
}

export function BlockstrGame({ className }: BlockstrGameProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [sessionId] = useState(() => `blockstr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const gameBoardRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const { currentBlock, blocksFound, resetBlocksFound, simulateBlock } = useBitcoinBlocks();

  // Refs for callbacks to avoid circular dependencies
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Set session origin if not already set (for main page sessions)
  useEffect(() => {
    if (!sessionStorage.getItem('blockstr_session_origin')) {
      sessionStorage.setItem('blockstr_session_origin', '/');
    }
  }, []);

  // Callbacks for game events
  const handleDifficultyIncrease = useCallback((newLevel: number) => {
    toastRef.current({
      title: "⚡ DIFFICULTY INCREASED!",
      description: `Level ${newLevel} - Game speed increased!`,
      duration: 3000,
    });
  }, []);

  const handleBlockMined = useCallback(() => {
    // Animation now handles the visual feedback instead of toast
  }, []);

  const {
    gameState,
    startGame,
    pauseGame,
    resetGame,
    moveLeft,
    moveRight,
    rotate,
    hardDrop,
    startSoftDrop,
    stopSoftDrop,
    handleAnimationComplete
  } = useGameLogic(blocksFound, handleDifficultyIncrease, handleBlockMined);

  const tempoMultiplier = useMemo(() => {
    const levelBoost = Math.max(0, gameState.level - 1);
    return Math.min(2.4, 1 + levelBoost * 0.12);
  }, [gameState.level]);

  const {
    isSupported: isMusicSupported,
    isPlaying: isMusicPlaying,
    play: playMusic,
    stop: stopMusic,
  } = useChiptuneMusic(0.18, tempoMultiplier);

  useEffect(() => {
    if (!isMusicSupported) {
      if (musicEnabled) {
        setMusicEnabled(false);
      }
      stopMusic();
      return;
    }

    if (!musicEnabled || !hasStarted) {
      stopMusic();
      return;
    }

    let cancelled = false;

    playMusic().catch(() => {
      if (!cancelled) {
        setMusicEnabled(false);
      }
    });

    return () => {
      cancelled = true;
      stopMusic();
    };
  }, [musicEnabled, hasStarted, playMusic, stopMusic, isMusicSupported]);

  // Keyboard controls
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (gameConfig.testMode && event.code === 'KeyB') {
      event.preventDefault();
      simulateBlock();
      toast({
        title: "🧪 TEST MODE: Block Simulated",
        description: "Mempool score transferred to mined score",
        duration: 2000,
      });
      return;
    }

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
        hardDrop();
        break;
      case 'Space':
        event.preventDefault();
        startSoftDrop();
        break;
      case 'KeyP':
      case 'Escape':
        event.preventDefault();
        pauseGame();
        break;
    }
  }, [gameState.gameStarted, gameState.gameOver, moveLeft, moveRight, rotate, hardDrop, pauseGame, simulateBlock, toast, startSoftDrop]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      stopSoftDrop();
    }
  }, [stopSoftDrop]);

  useEffect(() => {
    if (!hasStarted) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp, hasStarted]);

  // Swipe controls for mobile - on entire document for easier control
  useSwipeControls({
    onSwipeLeft: moveLeft,
    onSwipeRight: moveRight,
    onSwipeUp: rotate,
    onSwipeDown: hardDrop,
    enabled: gameState.gameStarted && !gameState.gameOver,
  });

  // Gamepad/USB controller controls
  useGamepadControls({
    onMoveLeft: moveLeft,
    onMoveRight: moveRight,
    onRotate: rotate,
    onHardDrop: hardDrop,
    onPause: pauseGame,
    enabled: gameState.gameStarted && !gameState.gameOver,
  });

  // Note: Block notifications are now handled by the handleBlockMined callback in useGameLogic

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

    if (musicEnabled) {
      playMusic().catch(() => setMusicEnabled(false));
    }
  };

  const handleNewGame = () => {
    setShowGameOverModal(false);
    setHasStarted(false);
    setShowHowToPlay(false);
    resetGame();
    setGameStartTime(0);
    resetBlocksFound();
  };

  const handleCloseModal = () => {
    setShowGameOverModal(false);
    resetGame();
    setHasStarted(false);
    setShowHowToPlay(false);
    setGameStartTime(0);
    resetBlocksFound();
  };

  const handleToggleMusic = useCallback(() => {
    setMusicEnabled((prev) => {
      const next = !prev;
      if (!next) {
        stopMusic();
        return next;
      }

      if (hasStarted) {
        playMusic().catch(() => setMusicEnabled(false));
      }

      return next;
    });
  }, [hasStarted, playMusic, stopMusic]);

  const gameDuration = gameStartTime > 0 ? Date.now() - gameStartTime : 0;

  if (!hasStarted) {
    return (
      <div className={cn("h-screen bg-black flex flex-col overflow-hidden", className)}>
        <GameHeader
          musicEnabled={musicEnabled}
          musicPlaying={isMusicPlaying}
          isMusicSupported={isMusicSupported}
          onToggleMusic={handleToggleMusic}
        />
        <div className="flex items-center justify-center flex-1 overflow-y-auto">
          <PaymentGate onPaymentComplete={handlePaymentComplete} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("h-screen bg-black text-white flex flex-col overflow-hidden", className)}>
      <GameHeader
        className="flex-shrink-0"
        musicEnabled={musicEnabled}
        musicPlaying={isMusicPlaying}
        isMusicSupported={isMusicSupported}
        onToggleMusic={handleToggleMusic}
      />

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
              <div>
                <span className="text-purple-400">DIFF:</span>{' '}
                <span className={cn(
                  "text-white font-mono",
                  gameState.timeToNextLevel < 10000 && "text-yellow-400"
                )}>
                  {gameState.gameStarted && !gameState.gameOver ? (() => {
                    const totalSeconds = Math.ceil(gameState.timeToNextLevel / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  })() : '--:--'}
                </span>
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
      <div className="hidden lg:flex max-w-7xl mx-auto px-6 flex-1 w-full overflow-hidden relative">
        <div className="grid grid-cols-[280px_1fr_280px] gap-8 items-center flex-1 py-8">
          {/* Left Panel - Stats (Desktop) */}
          <div className="flex flex-col justify-center space-y-3 min-w-0">
            <GameStats
              gameState={gameState}
              currentBlock={currentBlock}
            />
          </div>

          {/* Center - Game Board */}
          <div className="flex flex-col items-center justify-center h-full w-full px-4">
            <GameBoard
              ref={gameBoardRef}
              gameState={gameState}
              className="w-full h-full"
              style={{
                maxHeight: 'calc(100vh - 180px)',
                maxWidth: 'calc((100vh - 180px) * 0.5)',
              }}
            />
          </div>

          {/* Right Panel - Next Piece (Desktop) */}
          <div className="flex flex-col justify-center space-y-3 min-w-0">
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

      {/* Block Mined Animation */}
      <BlockMinedAnimation
        isActive={gameState.showBlockAnimation}
        onComplete={handleAnimationComplete}
      />
    </div>
  );
}
