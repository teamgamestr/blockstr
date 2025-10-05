import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNostr } from './useNostr';

/**
 * Hook to fetch reactions (kind 7) for a specific event.
 * Reactions include likes, dislikes, and custom emoji reactions.
 */
export function useReactions(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['reactions', eventId],
    queryFn: async (c) => {
      if (!eventId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [7], '#e': [eventId], limit: 500 }],
        { signal }
      );

      return events;
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to get reaction statistics for an event.
 * Returns counts of different reaction types.
 */
export function useReactionStats(eventId: string | undefined) {
  const { data: reactions = [], isLoading } = useReactions(eventId);

  const stats = reactions.reduce((acc, reaction: NostrEvent) => {
    const content = reaction.content || '+';
    acc[content] = (acc[content] || 0) + 1;
    acc.total = (acc.total || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    stats,
    likes: stats['+'] || 0,
    dislikes: stats['-'] || 0,
    total: stats.total || 0,
    reactions,
    isLoading,
  };
}

/**
 * Hook to check if the current user has reacted to an event.
 */
export function useUserReaction(eventId: string | undefined, userPubkey: string | undefined) {
  const { data: reactions = [] } = useReactions(eventId);

  if (!userPubkey) return null;

  return reactions.find((reaction: NostrEvent) => reaction.pubkey === userPubkey) || null;
}
