import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import NotFound from './NotFound';
import { ProfileView } from '@/components/ProfileView';
import { EventView } from '@/components/EventView';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Resolve an `naddr` (kind + author + d) and render it as the event it names.
 *
 * Game scores are addressable (kind 30762, `d=<game>:<player>:<puzzle>`), so an
 * naddr is a normal way for a client to hand one over — it must not dead-end.
 */
function AddressableEventView({ kind, pubkey, identifier }: { kind: number; pubkey: string; identifier: string }) {
  const { nostr } = useNostr();

  const { data: eventId, isLoading } = useQuery({
    queryKey: ['addressable', kind, pubkey, identifier],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(4000)]);
      const events = await nostr.query(
        [{ kinds: [kind], authors: [pubkey], '#d': [identifier], limit: 1 }],
        { signal },
      );
      return events[0]?.id ?? null;
    },
  });

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <EventView eventId={eventId} />;
}

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();

  if (!identifier) {
    return <NotFound />;
  }

  let decoded;
  try {
    decoded = nip19.decode(identifier);
  } catch {
    return <NotFound />;
  }

  const { type, data } = decoded;

  switch (type) {
    case 'npub':
      return <ProfileView pubkey={data} />;

    case 'nprofile':
      return <ProfileView pubkey={data.pubkey} />;

    case 'note':
      return <EventView eventId={data} />;

    case 'nevent':
      return <EventView eventId={data.id} />;

    case 'naddr':
      return (
        <AddressableEventView
          kind={data.kind}
          pubkey={data.pubkey}
          identifier={data.identifier}
        />
      );

    default:
      return <NotFound />;
  }
}
