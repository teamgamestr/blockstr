export interface Position {
  x: number;
  y: number;
}

export interface GameBlock {
  x: number;
  y: number;
  color: string;
  isBonus?: boolean;
}

export interface TetrominoShape {
  shape: number[][];
  color: string;
}

export interface GamePiece {
  shape: number[][];
  color: string;
  position: Position;
  isBonus?: boolean;
}

export interface GameState {
  board: (GameBlock | null)[][];
  currentPiece: GamePiece | null;
  nextPiece: GamePiece | null;
  mempoolScore: number; // Score that builds up during gameplay
  minedScore: number; // Score transferred when Bitcoin blocks are mined
  level: number;
  linesCleared: number;
  gameOver: boolean;
  gameStarted: boolean;
  isPaused: boolean;
  dropSpeed: number;
  bitcoinBlocks: number; // Number of Bitcoin blocks found since game start
  lastBlockHash: string | null; // Last Bitcoin block hash seen
  timeToNextLevel: number; // Milliseconds until next difficulty adjustment
  showBlockAnimation: boolean; // Show block mined animation
  softDropActive: boolean; // Player holding soft drop key
}

export interface BitcoinBlock {
  hash: string;
  height: number;
  timestamp: number;
}

export interface GameSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  finalMempoolScore?: number;
  finalMinedScore?: number;
  bitcoinBlocksFound: number;
  paid: boolean;
}

// Tetromino shapes
export const TETROMINOES: { [key: string]: TetrominoShape } = {
  I: {
    shape: [
      [1, 1, 1, 1]
    ],
    color: '#00f0f0'
  },
  O: {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: '#f0f000'
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1]
    ],
    color: '#a000f0'
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0]
    ],
    color: '#00f000'
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1]
    ],
    color: '#f00000'
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1]
    ],
    color: '#0000f0'
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1]
    ],
    color: '#f0a000'
  }
};

export const BONUS_BLOCK_COLOR = '#ffd700'; // Gold color for bonus blocks