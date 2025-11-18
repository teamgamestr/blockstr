import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BitcoinBlock } from '@/types/game';
import { gameConfig } from '@/config/gameConfig';

interface BitcoinBlocksHook {
  currentBlock: BitcoinBlock | null;
  blocksFound: number;
  isLoading: boolean;
  error: string | null;
  resetBlocksFound: () => void;
  simulateBlock: () => void; // Test mode only
}

export function useBitcoinBlocks(): BitcoinBlocksHook {
  const [blocksFound, setBlocksFound] = useState(0);
  const [lastSeenHash, setLastSeenHash] = useState<string | null>(null);

  // Query latest Bitcoin block
  const { data: currentBlock, isLoading, error } = useQuery({
    queryKey: ['bitcoin-tip'],
    queryFn: async () => {
      const response = await fetch('https://mempool.space/api/blocks/tip/hash');
      if (!response.ok) {
        throw new Error('Failed to fetch Bitcoin block data');
      }
      const hash = await response.text();

      // Get block details
      const blockResponse = await fetch(`https://mempool.space/api/block/${hash}`);
      if (!blockResponse.ok) {
        throw new Error('Failed to fetch Bitcoin block details');
      }
      const blockData = await blockResponse.json();

      return {
        hash: blockData.id,
        height: blockData.height,
        timestamp: blockData.timestamp
      } as BitcoinBlock;
    },
    refetchInterval: 30000, // Check for new blocks every 30 seconds
    retry: 3,
    retryDelay: 5000,
  });

  // Detect new blocks
  useEffect(() => {
    if (currentBlock && currentBlock.hash !== lastSeenHash) {
      if (lastSeenHash !== null) {
        // New block found! (skip the first block as it's just initialization)
        setBlocksFound(prev => prev + 1);
      }
      setLastSeenHash(currentBlock.hash);
    }
  }, [currentBlock, lastSeenHash]);

  const resetBlocksFound = useCallback(() => {
    setBlocksFound(0);
    setLastSeenHash(currentBlock?.hash || null);
  }, [currentBlock?.hash]);

  // Test mode: simulate a new block being found
  const simulateBlock = useCallback(() => {
    if (gameConfig.testMode) {
      setBlocksFound(prev => prev + 1);
    }
  }, []);

  return {
    currentBlock: currentBlock || null,
    blocksFound,
    isLoading,
    error: error?.message || null,
    resetBlocksFound,
    simulateBlock
  };
}