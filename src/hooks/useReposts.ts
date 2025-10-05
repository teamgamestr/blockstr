import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNostr } from './useNostr';

/**
 * Hook to fetch reposts for a specific event.
 * Includes both kind 6 (legacy reposts) and kind 16 (generic reposts).
 */
export function useReposts(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['reposts', eventId],
    queryFn: async (c) => {
      if (!eventId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query both kind 6 and kind 16 reposts in a single request
      const events = await nostr.query(
        [{ kinds: [6, 16], '#e': [eventId], limit: 150 }],
        { signal }
      );

      return events;
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to get repost statistics for an event.
 */
export function useRepostStats(eventId: string | undefined) {
  const { data: reposts = [], isLoading } = useReposts(eventId);

  return {
    count: reposts.length,
    reposts,
    isLoading,
  };
}

/**
 * Hook to check if the current user has reposted an event.
 */
export function useUserRepost(eventId: string | undefined, userPubkey: string | undefined) {
  const { data: reposts = [] } = useReposts(eventId);

  if (!userPubkey) return null;

  return reposts.find((repost: NostrEvent) => repost.pubkey === userPubkey) || null;
}
