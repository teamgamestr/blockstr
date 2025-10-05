import { useQuery } from '@tanstack/react-query';
import type { NostrMetadata } from '@nostrify/nostrify';
import { useNostr } from './useNostr';

/**
 * Hook to fetch a user's profile metadata (kind 0).
 * This is a simplified version of useAuthor focused on metadata.
 */
export function useProfile(pubkey: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['profile', pubkey],
    queryFn: async (c) => {
      if (!pubkey) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query(
        [{ kinds: [0], authors: [pubkey], limit: 1 }],
        { signal }
      );

      const event = events[0];
      if (!event) return null;

      try {
        const metadata: NostrMetadata = JSON.parse(event.content);
        return {
          event,
          metadata,
          pubkey,
        };
      } catch {
        return {
          event,
          metadata: {} as NostrMetadata,
          pubkey,
        };
      }
    },
    enabled: !!pubkey,
    staleTime: 5 * 60 * 1000, // Consider profile data fresh for 5 minutes
  });
}
