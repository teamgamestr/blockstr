import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, GamePiece, GameBlock, Position } from '@/types/game';
import { TETROMINOES, BONUS_BLOCK_COLOR } from '@/types/game';
import { gameConfig } from '@/config/gameConfig';

function createEmptyBoard(): (GameBlock | null)[][] {
  return Array(gameConfig.boardHeight).fill(null).map(() =>
    Array(gameConfig.boardWidth).fill(null)
  );
}

function getRandomTetromino(isBonus = false): GamePiece {
  const pieces = Object.values(TETROMINOES);
  const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];

  return {
    shape: randomPiece.shape,
    color: isBonus ? BONUS_BLOCK_COLOR : randomPiece.color,
    position: {
      x: Math.floor(gameConfig.boardWidth / 2) - Math.floor(randomPiece.shape[0].length / 2),
      y: 0
    },
    isBonus
  };
}

function isValidPosition(board: (GameBlock | null)[][], piece: GamePiece, newPosition: Position): boolean {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const newX = newPosition.x + x;
        const newY = newPosition.y + y;

        if (
          newX < 0 ||
          newX >= gameConfig.boardWidth ||
          newY >= gameConfig.boardHeight ||
          (newY >= 0 && board[newY][newX])
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

function rotatePiece(piece: GamePiece): GamePiece {
  const rotated = piece.shape[0].map((_, index) =>
    piece.shape.map(row => row[index]).reverse()
  );

  return {
    ...piece,
    shape: rotated
  };
}

function placePiece(board: (GameBlock | null)[][], piece: GamePiece): (GameBlock | null)[][] {
  const newBoard = board.map(row => [...row]);

  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.position.y + y;
        const boardX = piece.position.x + x;
        if (boardY >= 0) {
          newBoard[boardY][boardX] = {
            x: boardX,
            y: boardY,
            color: piece.color,
            isBonus: piece.isBonus
          };
        }
      }
    }
  }

  return newBoard;
}

function clearLines(board: (GameBlock | null)[][]): { newBoard: (GameBlock | null)[][], clearedLines: number, bonusLinesCleared: number } {
  let clearedLines = 0;
  let bonusLinesCleared = 0;
  const newBoard = [...board];

  for (let y = gameConfig.boardHeight - 1; y >= 0; y--) {
    if (newBoard[y].every(block => block !== null)) {
      // Check if line contains bonus blocks
      const hasBonus = newBoard[y].some(block => block?.isBonus);
      if (hasBonus) {
        bonusLinesCleared++;
      }

      // Remove the line
      newBoard.splice(y, 1);
      // Add new empty line at top
      newBoard.unshift(Array(gameConfig.boardWidth).fill(null));
      clearedLines++;
      y++; // Check the same row again since we removed a line
    }
  }

  return { newBoard, clearedLines, bonusLinesCleared };
}

export function useGameLogic(bitcoinBlocks: number, onDifficultyIncrease?: (newLevel: number) => void, onBlockMined?: () => void) {
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPiece: null,
    nextPiece: null,
    mempoolScore: 0,
    minedScore: 0,
    level: 1,
    linesCleared: 0,
    gameOver: false,
    gameStarted: false,
    isPaused: false,
    dropSpeed: gameConfig.initialSpeed,
    bitcoinBlocks: 0,
    lastBlockHash: null,
    timeToNextLevel: gameConfig.levelDuration,
    showBlockAnimation: false
  });

  const dropTimerRef = useRef<NodeJS.Timeout | null>(null);
  const levelTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameStartTimeRef = useRef<number | null>(null);

  // Time-based level progression (every 2 minutes)
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.isPaused) {
      // Start the timer when game starts
      if (!gameStartTimeRef.current) {
        gameStartTimeRef.current = Date.now();
      }

      // Set interval to check level progression and update countdown every 100ms for smooth countdown
      const intervalId = setInterval(() => {
        if (!gameStartTimeRef.current) return;

        const elapsedTime = Date.now() - gameStartTimeRef.current;
        const expectedLevel = Math.floor(elapsedTime / gameConfig.levelDuration) + 1;
        const timeInCurrentLevel = elapsedTime % gameConfig.levelDuration;
        const timeToNextLevel = gameConfig.levelDuration - timeInCurrentLevel;

        setGameState(prev => {
          const updates: Partial<GameState> = {
            timeToNextLevel
          };

          if (expectedLevel > prev.level) {
            // Calculate new speed based on level
            const newSpeed = Math.max(
              gameConfig.maxSpeed,
              gameConfig.initialSpeed * Math.pow(gameConfig.speedIncrease, expectedLevel - 1)
            );

            // Trigger difficulty increase callback with new level
            if (onDifficultyIncrease) {
              onDifficultyIncrease(expectedLevel);
            }

            updates.level = expectedLevel;
            updates.dropSpeed = newSpeed;
          }

          return {
            ...prev,
            ...updates
          };
        });
      }, 100); // Update every 100ms for smooth countdown

      return () => clearInterval(intervalId);
    } else {
      // Reset game start time when game is not active
      if (!gameState.gameStarted || gameState.gameOver) {
        gameStartTimeRef.current = null;
      }
    }
  }, [gameState.gameStarted, gameState.gameOver, gameState.isPaused, onDifficultyIncrease]);

  // Transfer scores when Bitcoin blocks are found
  useEffect(() => {
    if (
      bitcoinBlocks > gameState.bitcoinBlocks &&
      gameState.gameStarted &&
      !gameState.gameOver
    ) {
      // Trigger animation
      setGameState(prev => ({
        ...prev,
        showBlockAnimation: true,
        bitcoinBlocks
      }));

      // Trigger block mined callback
      if (onBlockMined) {
        onBlockMined();
      }
    }
  }, [bitcoinBlocks, gameState.bitcoinBlocks, gameState.gameStarted, gameState.gameOver, onBlockMined]);

  // Handle animation completion - clear blocks and transfer score
  const handleAnimationComplete = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      board: createEmptyBoard(), // Clear all blocks
      currentPiece: null, // Remove current piece
      // Transfer mempool score to mined score
      minedScore: prev.minedScore + prev.mempoolScore,
      mempoolScore: 0, // Reset mempool score
      showBlockAnimation: false
    }));

    // Generate new piece after clearing
    setTimeout(() => {
      setGameState(prev => {
        const shouldBeBonus = Math.random() < (1 / gameConfig.bonusBlockChance);
        const newCurrentPiece = getRandomTetromino(shouldBeBonus);
        const newNextPiece = getRandomTetromino(Math.random() < (1 / gameConfig.bonusBlockChance));

        return {
          ...prev,
          currentPiece: newCurrentPiece,
          nextPiece: newNextPiece
        };
      });
    }, 100);
  }, []);

  const dropPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const newPosition = {
        x: prev.currentPiece.position.x,
        y: prev.currentPiece.position.y + 1
      };

      if (isValidPosition(prev.board, prev.currentPiece, newPosition)) {
        return {
          ...prev,
          currentPiece: {
            ...prev.currentPiece,
            position: newPosition
          }
        };
      } else {
        // Piece cannot move down, place it and get new piece
        const boardWithPiece = placePiece(prev.board, prev.currentPiece);
        const { newBoard, clearedLines, bonusLinesCleared } = clearLines(boardWithPiece);

        // Calculate score - add to mempool score during gameplay
        const baseScore = clearedLines * gameConfig.lineScore * prev.level;
        const bonusScore = bonusLinesCleared * gameConfig.lineScore * prev.level * gameConfig.bonusMultiplier;
        const totalNewScore = baseScore + bonusScore;

        // Generate new piece (1 in 100 chance for bonus)
        const shouldBeBonus = Math.random() < (1 / gameConfig.bonusBlockChance);
        const newCurrentPiece = prev.nextPiece || getRandomTetromino(shouldBeBonus);
        const newNextPiece = getRandomTetromino(Math.random() < (1 / gameConfig.bonusBlockChance));

        // Check game over
        const gameOver = !isValidPosition(newBoard, newCurrentPiece, newCurrentPiece.position);

        return {
          ...prev,
          board: newBoard,
          currentPiece: gameOver ? null : newCurrentPiece,
          nextPiece: gameOver ? null : newNextPiece,
          mempoolScore: prev.mempoolScore + totalNewScore,
          linesCleared: prev.linesCleared + clearedLines,
          gameOver
        };
      }
    });
  }, []);

  // Game loop - uses setInterval for continuous dropping
  useEffect(() => {
    if (gameState.gameStarted && !gameState.gameOver && !gameState.isPaused) {
      const intervalId = setInterval(dropPiece, gameState.dropSpeed);
      return () => clearInterval(intervalId);
    }
  }, [gameState.gameStarted, gameState.gameOver, gameState.isPaused, gameState.dropSpeed, dropPiece]);

  const startGame = useCallback(() => {
    const firstPiece = getRandomTetromino();
    const nextPiece = getRandomTetromino(Math.random() < (1 / gameConfig.bonusBlockChance));

    gameStartTimeRef.current = Date.now();

    setGameState({
      board: createEmptyBoard(),
      currentPiece: firstPiece,
      nextPiece: nextPiece,
      mempoolScore: 0,
      minedScore: 0,
      level: 1,
      linesCleared: 0,
      gameOver: false,
      gameStarted: true,
      isPaused: false,
      dropSpeed: gameConfig.initialSpeed,
      bitcoinBlocks: 0,
      lastBlockHash: null,
      timeToNextLevel: gameConfig.levelDuration,
      showBlockAnimation: false
    });
  }, []);

  const pauseGame = useCallback(() => {
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const resetGame = useCallback(() => {
    if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
    if (levelTimerRef.current) clearTimeout(levelTimerRef.current);
    gameStartTimeRef.current = null;

    setGameState({
      board: createEmptyBoard(),
      currentPiece: null,
      nextPiece: null,
      mempoolScore: 0,
      minedScore: 0,
      level: 1,
      linesCleared: 0,
      gameOver: false,
      gameStarted: false,
      isPaused: false,
      dropSpeed: gameConfig.initialSpeed,
      bitcoinBlocks: 0,
      lastBlockHash: null,
      timeToNextLevel: gameConfig.levelDuration,
      showBlockAnimation: false
    });
  }, []);

  const moveLeft = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const newPosition = {
        x: prev.currentPiece.position.x - 1,
        y: prev.currentPiece.position.y
      };

      if (isValidPosition(prev.board, prev.currentPiece, newPosition)) {
        return {
          ...prev,
          currentPiece: {
            ...prev.currentPiece,
            position: newPosition
          }
        };
      }
      return prev;
    });
  }, []);

  const moveRight = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const newPosition = {
        x: prev.currentPiece.position.x + 1,
        y: prev.currentPiece.position.y
      };

      if (isValidPosition(prev.board, prev.currentPiece, newPosition)) {
        return {
          ...prev,
          currentPiece: {
            ...prev.currentPiece,
            position: newPosition
          }
        };
      }
      return prev;
    });
  }, []);

  const rotate = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      const rotatedPiece = rotatePiece(prev.currentPiece);

      if (isValidPosition(prev.board, rotatedPiece, rotatedPiece.position)) {
        return {
          ...prev,
          currentPiece: rotatedPiece
        };
      }
      return prev;
    });
  }, []);

  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isPaused) return prev;

      let newY = prev.currentPiece.position.y;
      while (isValidPosition(prev.board, prev.currentPiece, {
        x: prev.currentPiece.position.x,
        y: newY + 1
      })) {
        newY++;
      }

      return {
        ...prev,
        currentPiece: {
          ...prev.currentPiece,
          position: { x: prev.currentPiece.position.x, y: newY }
        }
      };
    });
  }, []);

  return {
    gameState,
    startGame,
    pauseGame,
    resetGame,
    moveLeft,
    moveRight,
    rotate,
    hardDrop,
    handleAnimationComplete
  };
}