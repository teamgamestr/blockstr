import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import NotFound from './NotFound';
import { ProfileView } from '@/components/ProfileView';
import { EventView } from '@/components/EventView';

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
      // For addressable events, we need to query by kind + author + d-tag
      // For now, show a placeholder - can be enhanced later for specific kinds
      return (
        <div className="container max-w-2xl mx-auto py-8">
          <div className="text-center text-muted-foreground">
            <p>Addressable event viewer coming soon</p>
            <p className="text-sm mt-2">Kind: {data.kind} • Identifier: {data.identifier}</p>
          </div>
        </div>
      );

    default:
      return <NotFound />;
  }
}