import { useState, useMemo, useEffect, useCallback } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthor } from '@/hooks/useAuthor';
import { useAppContext } from '@/hooks/useAppContext';
import { useNWC } from '@/hooks/useNWCContext';
import type { NWCConnection } from '@/hooks/useNWC';
import { nip57 } from 'nostr-tools';
import type { Event } from 'nostr-tools';
import type { WebLNProvider } from 'webln';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';

type ZapResult = {
  invoice: string;
  autoPaid: boolean;
};

export function useZaps(
  target: Event | Event[],
  webln: WebLNProvider | null,
  _nwcConnection: NWCConnection | null,
  onZapSuccess?: () => void,
  skipAutomaticPayment?: boolean
) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const { config } = useAppContext();
  const queryClient = useQueryClient();

  // Handle the case where an empty array is passed (from ZapButton when external data is provided)
  const actualTarget = Array.isArray(target) ? (target.length > 0 ? target[0] : null) : target;

  const author = useAuthor(actualTarget?.pubkey);
  const { sendPayment, getActiveConnection } = useNWC();
  const [isZapping, setIsZapping] = useState(false);
  const [invoice, setInvoice] = useState<string | null>(null);

  // Cleanup state when component unmounts
  useEffect(() => {
    return () => {
      setIsZapping(false);
      setInvoice(null);
    };
  }, []);

  const zapTargetKey = useMemo(() => {
    if (!actualTarget) return null;

    if (actualTarget.kind >= 30000 && actualTarget.kind < 40000) {
      const identifier = actualTarget.tags.find((tag) => tag[0] === 'd')?.[1] ?? '';
      return `a:${actualTarget.kind}:${actualTarget.pubkey}:${identifier}`;
    }

    if (actualTarget.kind === 0) {
      return `profile:${actualTarget.pubkey}`;
    }

    return `event:${actualTarget.id}`;
  }, [actualTarget]);

  const zapFilters = useMemo(() => {
    if (!actualTarget) return [];

    if (actualTarget.kind >= 30000 && actualTarget.kind < 40000) {
      const identifier = actualTarget.tags.find((tag) => tag[0] === 'd')?.[1] ?? '';
      return [
        {
          kinds: [9735],
          '#a': [`${actualTarget.kind}:${actualTarget.pubkey}:${identifier}`],
          limit: 200,
        },
      ];
    }

    if (actualTarget.kind === 0) {
      return [
        {
          kinds: [9735],
          '#p': [actualTarget.pubkey],
          limit: 200,
        },
      ];
    }

    return [
      {
        kinds: [9735],
        '#e': [actualTarget.id],
        limit: 200,
      },
    ];
  }, [actualTarget]);

  const zapQueryKey = useMemo(() => ['zaps', zapTargetKey ?? 'unknown'], [zapTargetKey]);

  const { data: zapEvents = [], ...query } = useQuery<NostrEvent[], Error>({
    queryKey: zapQueryKey,
    staleTime: 30000, // 30 seconds
    refetchInterval: (observer) => {
      // Only refetch if the query is currently being observed (component is mounted)
      return observer.getObserversCount() > 0 ? 60000 : false;
    },
    queryFn: async (c) => {
      if (!actualTarget || zapFilters.length === 0) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(5000)]);

      const events = await nostr.query(zapFilters, { signal });
      return events;
    },
    enabled: !!actualTarget?.id && zapFilters.length > 0,
  });

  useEffect(() => {
    if (!actualTarget || zapFilters.length === 0 || !zapTargetKey) {
      return undefined;
    }

    const controller = new AbortController();
    const since = Math.floor(Date.now() / 1000);
    const realtimeFilters = zapFilters.map(({ limit, ...filter }) => ({
      ...filter,
      since,
    }));
    const sub = nostr.req(realtimeFilters, { signal: controller.signal });

    (async () => {
      try {
        for await (const msg of sub) {
          if (msg[0] !== 'EVENT') continue;
          const event = msg[2] as NostrEvent;

          queryClient.setQueryData<NostrEvent[]>(zapQueryKey, (existing = []) => {
            if (existing.some((item) => item.id === event.id)) {
              return existing;
            }

            return [...existing, event].sort((a, b) => a.created_at - b.created_at);
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('[useZaps] Zap subscription error', error);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [actualTarget, zapFilters, zapTargetKey, nostr, queryClient, zapQueryKey]);

  // Process zap events into simple counts and totals
  const { zapCount, totalSats, zaps } = useMemo(() => {
    if (!Array.isArray(zapEvents) || !actualTarget) {
      console.log('[useZaps] No zap events to process');
      return { zapCount: 0, totalSats: 0, zaps: [] };
    }

    console.log('[useZaps] Processing zap events:', zapEvents.length);
    let count = 0;
    let sats = 0;

    zapEvents.forEach(zap => {
      count++;

      // Try multiple methods to extract the amount:

      // Method 1: amount tag (from zap request, sometimes copied to receipt)
      const amountTag = zap.tags.find(([name]) => name === 'amount')?.[1];
      if (amountTag) {
        const millisats = parseInt(amountTag);
        sats += Math.floor(millisats / 1000);
        return;
      }

      // Method 2: Extract from bolt11 invoice
      const bolt11Tag = zap.tags.find(([name]) => name === 'bolt11')?.[1];
      if (bolt11Tag) {
        try {
          const invoiceSats = nip57.getSatoshisAmountFromBolt11(bolt11Tag);
          sats += invoiceSats;
          return;
        } catch (error) {
          console.warn('Failed to parse bolt11 amount:', error);
        }
      }

      // Method 3: Parse from description (zap request JSON)
      const descriptionTag = zap.tags.find(([name]) => name === 'description')?.[1];
      if (descriptionTag) {
        try {
          const zapRequest = JSON.parse(descriptionTag);
          const requestAmountTag = zapRequest.tags?.find(([name]: string[]) => name === 'amount')?.[1];
          if (requestAmountTag) {
            const millisats = parseInt(requestAmountTag);
            sats += Math.floor(millisats / 1000);
            return;
          }
        } catch (error) {
          console.warn('Failed to parse description JSON:', error);
        }
      }

      console.warn('Could not extract amount from zap receipt:', zap.id);
    });


    console.log('[useZaps] Final counts:', { zapCount: count, totalSats: sats });
    return { zapCount: count, totalSats: sats, zaps: zapEvents };
  }, [zapEvents, actualTarget]);

  const zap = async (amount: number, comment: string): Promise<ZapResult | null> => {
    if (amount <= 0) {
      return null;
    }

    setIsZapping(true);
    setInvoice(null); // Clear any previous invoice at the start

    if (!user) {
      setIsZapping(false);
      return null;
    }

    if (!actualTarget) {
      setIsZapping(false);
      return null;
    }

    try {
      let authorData = author.data;

      if (!authorData || !authorData.metadata || !authorData.event) {
        try {
          const refreshed = await author.refetch({ throwOnError: false });
          authorData = refreshed.data ?? authorData;
        } catch (err) {
          console.warn('Failed to refetch author metadata before zapping:', err);
        }
      }

      if (!authorData || !authorData.metadata || !authorData.event) {
        console.error('Author data missing:', {
          hasData: !!authorData,
          hasMetadata: !!authorData?.metadata,
          hasEvent: !!authorData?.event,
          pubkey: actualTarget.pubkey,
        });
        setIsZapping(false);
        return null;
      }

      const { lud06, lud16 } = authorData.metadata;
      if (!lud06 && !lud16) {
        console.error('Lightning address missing from profile:', authorData.metadata);
        setIsZapping(false);
        return null;
      }

      // Get zap endpoint using the old reliable method
      const zapEndpoint = await nip57.getZapEndpoint(authorData.event);
      if (!zapEndpoint) {
        setIsZapping(false);
        return null;
      }

      // Create zap request - use appropriate event format based on kind
      // For addressable events (30000-39999), pass the object to get 'a' tag
      // For replaceable/profile events (kind 0), omit the event to avoid invalid 'e' tags
      let event: string | Event | null = null;
      if (actualTarget.kind >= 30000 && actualTarget.kind < 40000) {
        event = actualTarget;
      } else if (actualTarget.kind !== 0) {
        event = actualTarget.id;
      }

      const zapAmount = amount * 1000; // convert to millisats

      const zapRequest = nip57.makeZapRequest({
        profile: actualTarget.pubkey,
        event,
        amount: zapAmount,
        relays: [config.relayUrl],
        comment,
      });

      // Sign the zap request (but don't publish to relays - only send to LNURL endpoint)
      if (!user.signer) {
        throw new Error('No signer available');
      }
      const signedZapRequest = await user.signer.signEvent(zapRequest);

      try {
        const res = await fetch(`${zapEndpoint}?amount=${zapAmount}&nostr=${encodeURI(JSON.stringify(signedZapRequest))}`);
        const responseData = await res.json();

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${responseData.reason || 'Unknown error'}`);
        }

        const newInvoice = responseData.pr;
        if (!newInvoice || typeof newInvoice !== 'string') {
          throw new Error('Lightning service did not return a valid invoice');
        }

        // Skip automatic payment methods if requested (e.g., in conference mode)
        if (skipAutomaticPayment) {
          setInvoice(newInvoice);
          setIsZapping(false);
          return { invoice: newInvoice, autoPaid: false };
        }

        // Get the current active NWC connection dynamically
        const currentNWCConnection = getActiveConnection();

        // Try NWC first if available and properly connected
        if (currentNWCConnection && currentNWCConnection.connectionString && currentNWCConnection.isConnected) {
          try {
            await sendPayment(currentNWCConnection, newInvoice);

            // Clear states immediately on success
            setIsZapping(false);
            setInvoice(null);


            // Invalidate zap queries to refresh counts
            queryClient.invalidateQueries({ queryKey: ['zaps'] });

            // Close dialog last to ensure clean state
            onZapSuccess?.();
            return { invoice: newInvoice, autoPaid: true };
          } catch (nwcError) {
            console.error('NWC payment failed, falling back:', nwcError);

            // Show specific NWC error to user for debugging
          }
        }

        if (webln) {  // Try WebLN next
          try {
            await webln.sendPayment(newInvoice);

            // Clear states immediately on success
            setIsZapping(false);
            setInvoice(null);


            // Invalidate zap queries to refresh counts
            queryClient.invalidateQueries({ queryKey: ['zaps'] });

            // Close dialog last to ensure clean state
            onZapSuccess?.();
            return { invoice: newInvoice, autoPaid: true };
          } catch (weblnError) {
            console.error('webln payment failed, falling back:', weblnError);

            // Show specific WebLN error to user for debugging
          }
        }

        // Default - show QR code and manual Lightning URI
        setInvoice(newInvoice);
        setIsZapping(false);
        return { invoice: newInvoice, autoPaid: false };
      } catch (err) {
        console.error('Zap error:', err);
        setIsZapping(false);
        return null;
      }
    } catch (err) {
      console.error('Zap error:', err);
      setIsZapping(false);
      return null;
    }
  };

  const resetInvoice = useCallback(() => {
    setInvoice(null);
  }, []);

  return {
    zaps,
    zapCount,
    totalSats,
    ...query,
    zap,
    isZapping,
    invoice,
    setInvoice,
    resetInvoice,
  };
}
