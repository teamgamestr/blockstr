import { useQuery } from '@tanstack/react-query';
import { useNostr } from './useNostr';

/**
 * Hook to fetch a single event by its ID.
 */
export function useEvent(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['event', eventId],
    queryFn: async (c) => {
      if (!eventId) return null;

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const events = await nostr.query(
        [{ ids: [eventId] }],
        { signal }
      );

      return events[0] || null;
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to fetch multiple events by their IDs.
 */
export function useEvents(eventIds: string[] | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['events', eventIds],
    queryFn: async (c) => {
      if (!eventIds || eventIds.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const events = await nostr.query(
        [{ ids: eventIds }],
        { signal }
      );

      return events;
    },
    enabled: !!eventIds && eventIds.length > 0,
  });
}
