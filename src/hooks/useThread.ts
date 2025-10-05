import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';

/**
 * Hook to fetch a thread of events (root event and all replies).
 * Useful for displaying conversation threads.
 */
export function useThread(rootEventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['thread', rootEventId],
    queryFn: async (c) => {
      if (!rootEventId) return { root: null, replies: [] };

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Fetch the root event and all replies in parallel
      const [rootEvents, replies] = await Promise.all([
        nostr.query([{ ids: [rootEventId] }], { signal }),
        nostr.query([{ kinds: [1], '#e': [rootEventId], limit: 200 }], { signal }),
      ]);

      const root = rootEvents[0] || null;

      return {
        root,
        replies,
      };
    },
    enabled: !!rootEventId,
  });
}

/**
 * Hook to fetch all ancestors of an event (parent, grandparent, etc.).
 * Useful for showing the full context of a reply.
 */
export function useAncestors(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['ancestors', eventId],
    queryFn: async (c) => {
      if (!eventId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Fetch the event first
      const events = await nostr.query([{ ids: [eventId] }], { signal });
      const event = events[0];

      if (!event) return [];

      // Extract parent event IDs from 'e' tags
      const eTags = event.tags.filter(([name]) => name === 'e');
      const parentIds = eTags.map(([, id]) => id).filter(Boolean);

      if (parentIds.length === 0) return [];

      // Fetch all parent events
      const ancestors = await nostr.query(
        [{ ids: parentIds }],
        { signal }
      );

      return ancestors;
    },
    enabled: !!eventId,
  });
}
