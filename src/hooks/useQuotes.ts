import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { useNostr } from './useNostr';

/**
 * Hook to fetch quote reposts (kind 1 events that quote another event).
 * Quote reposts are kind 1 events with a "q" tag referencing the quoted event.
 */
export function useQuotes(eventId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['quotes', eventId],
    queryFn: async (c) => {
      if (!eventId) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      // Query kind 1 events with a "q" tag referencing this event
      const events = await nostr.query(
        [{ kinds: [1], '#q': [eventId], limit: 100 }],
        { signal }
      );

      return events;
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to get quote statistics for an event.
 */
export function useQuoteStats(eventId: string | undefined) {
  const { data: quotes = [], isLoading } = useQuotes(eventId);

  return {
    count: quotes.length,
    quotes,
    isLoading,
  };
}

/**
 * Hook to check if the current user has quoted an event.
 */
export function useUserQuote(eventId: string | undefined, userPubkey: string | undefined) {
  const { data: quotes = [] } = useQuotes(eventId);

  if (!userPubkey) return null;

  return quotes.find((quote: NostrEvent) => quote.pubkey === userPubkey) || null;
}
