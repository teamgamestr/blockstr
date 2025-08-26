export interface GameConfig {
  // Game mechanics
  initialSpeed: number; // milliseconds per drop
  speedIncrease: number; // speed multiplier per Bitcoin block
  maxSpeed: number; // minimum milliseconds per drop
  
  // Scoring
  lineScore: number; // base points per line
  bonusMultiplier: number; // multiplier for bonus blocks (10x)
  bonusBlockChance: number; // 1 in 100 chance
  
  // Payment
  costToPlay: number; // satoshis required to play
  zapMemo: string; // memo for zap payments
  
  // Grid dimensions
  boardWidth: number;
  boardHeight: number;
  
  // Visual
  blockSize: number; // pixels
  
  // Game identity
  gameId: string;
  gameVersion: string;
  
  // Nostr
  blockstrPubkey: string; // Official Blockstr account pubkey
}

export const gameConfig: GameConfig = {
  // Game mechanics
  initialSpeed: 1000, // 1 second per drop initially
  speedIncrease: 0.85, // 15% faster after each Bitcoin block
  maxSpeed: 100, // Maximum speed (0.1 seconds per drop)
  
  // Scoring  
  lineScore: 100, // 100 points per line
  bonusMultiplier: 10, // 10x points for bonus blocks
  bonusBlockChance: 100, // 1 in 100 chance for bonus block
  
  // Payment
  costToPlay: 21, // 21 satoshis to play
  zapMemo: "⚡ Blockstr Game Payment ⚡",
  
  // Grid dimensions
  boardWidth: 10,
  boardHeight: 20,
  
  // Visual
  blockSize: 30, // 30px blocks
  
  // Game identity
  gameId: "blockstr",
  gameVersion: "1.0.0",
  
  // Nostr (placeholder - this should be set to actual Blockstr account)
  blockstrPubkey: "0000000000000000000000000000000000000000000000000000000000000000"
};