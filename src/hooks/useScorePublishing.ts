import { useCallback } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { gameConfig } from '@/config/gameConfig';


interface ScorePublishingOptions {
  sessionId: string;
  minedScore: number;
  mempoolScore: number;
  duration: number; // in seconds
  bitcoinBlocksFound: number;
  difficulty: string;
}

export function useScorePublishing() {
  const { mutateAsync: createEvent } = useNostrPublish();
  const { user } = useCurrentUser();

  const publishScore = useCallback(async (options: ScorePublishingOptions) => {
    if (!user) return;

    const { sessionId, minedScore, mempoolScore, duration, bitcoinBlocksFound, difficulty } = options;

    // Publish score event (kind 1001) - using mined score as the final score
    const scoreEvent = {
      kind: 1001,
      content: "",
      tags: [
        ["d", sessionId],
        ["game", gameConfig.gameId],
        ["score", minedScore.toString()], // Final score is the mined score
        ["mined_score", minedScore.toString()],
        ["mempool_score", mempoolScore.toString()],
        ["player", user.pubkey],
        ["difficulty", difficulty],
        ["duration", duration.toString()],
        ["version", gameConfig.gameVersion],
        ["blocks", bitcoinBlocksFound.toString()],
        ["t", "gaming"],
        ["t", gameConfig.gameId],
        ["alt", `Game score: ${minedScore} mined (${mempoolScore} unmined) in ${gameConfig.gameId}`]
      ]
    };

    await createEvent(scoreEvent);
    return scoreEvent;
  }, [user, createEvent]);

  const publishGamePost = useCallback(async (options: ScorePublishingOptions & { message?: string }) => {
    if (!user) return;

    const { minedScore, mempoolScore, bitcoinBlocksFound, difficulty, message } = options;

    const defaultMessage = `Just mined ${minedScore} points in Blockstr! 🎮⚡\n\nPlayed through ${bitcoinBlocksFound} Bitcoin blocks on ${difficulty} difficulty.\n\n${mempoolScore > 0 ? `Still have ${mempoolScore} points waiting to be mined!\\n\\n` : ''}#blockstr #gaming #bitcoin #nostr`;

    const gamePost = {
      kind: 1,
      content: message || defaultMessage,
      tags: [
        ["t", "blockstr"],
        ["t", "gaming"],
        ["t", "bitcoin"],
        ["t", "nostr"]
      ]
    };

    await createEvent(gamePost);
    return gamePost;
  }, [user, createEvent]);

  return {
    publishScore,
    publishGamePost,
    canPublish: !!user
  };
}