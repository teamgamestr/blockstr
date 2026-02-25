import { useCallback } from 'react';
import { useNostr } from '@/hooks/useNostr';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { EventTemplate } from 'nostr-tools';


interface ScorePublishingOptions {
  sessionId: string;
  minedScore: number;
  mempoolScore: number;
  duration: number; // in seconds
  bitcoinBlocksFound: number;
  difficulty: string;
}

export function useScorePublishing() {
  const { nostr } = useNostr();
  const { user, effectivePubkey } = useCurrentUser();

  const publishScore = useCallback(async (options: ScorePublishingOptions) => {
    console.log('publishScore called with options:', options);

    if (!user) {
      console.error('Cannot publish score: user not logged in');
      throw new Error('User must be logged in to publish scores');
    }

    const { sessionId, minedScore, duration, bitcoinBlocksFound, difficulty } = options;
    const playerPubkey = effectivePubkey ?? user.pubkey;

    console.log('Requesting server to sign score...');

    try {
      // Send score data to backend for signing
      const response = await fetch('/api/sign-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          playerPubkey,
          score: minedScore,
          difficulty,
          duration,
          blocks: bitcoinBlocksFound,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server rejected score: ${response.statusText}`);
      }

      const { event: signedEvent } = await response.json();
      console.log('Server signed score successfully:', signedEvent);

      // Publish to relays
      console.log('Publishing signed event to relays...');
      await nostr.event(signedEvent);
      console.log('Score published to relays successfully');

      return signedEvent;
    } catch (err) {
      console.error('Error publishing score:', err);
      throw err;
    }
  }, [user, effectivePubkey, nostr]);

  const publishGamePost = useCallback(async (options: ScorePublishingOptions & { message?: string; scoreEventId?: string }) => {
    if (!user?.signer) {
      throw new Error('User must be logged in to publish posts');
    }

    const { minedScore, mempoolScore, bitcoinBlocksFound, difficulty, message, scoreEventId } = options;

    const defaultMessage = `Just mined ${minedScore} points in Blockstr! 🎮⚡

Played through ${bitcoinBlocksFound} Bitcoin blocks on ${difficulty} difficulty.

${mempoolScore > 0 ? `Still have ${mempoolScore} points waiting to be mined!

` : ''}#blockstr #gamestr #gaming #bitcoin #nostr`;

    // Create event template (kind 1) - signed by the player
    const eventTemplate: EventTemplate = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      content: message || defaultMessage,
      tags: [
        ["t", "blockstr"],
        ["t", "gaming"],
        ["t", "bitcoin"],
        ["t", "nostr"],
        ...(scoreEventId ? [["e", scoreEventId, "", "mention"]] : [])
      ]
    };

    // Sign with player's key
    const signedPost = await user.signer.signEvent(eventTemplate);

    // Publish to relays
    await nostr.event(signedPost);

    return signedPost;
  }, [user, nostr]);

  return {
    publishScore,
    publishGamePost,
    canPublish: !!user,
  };
}
