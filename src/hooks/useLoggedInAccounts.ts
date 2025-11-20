import { useNostr } from '@nostrify/react';
import { useNostrLogin } from '@nostrify/react/login';
import { useQuery } from '@tanstack/react-query';
import { NSchema as n, NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import type { NLoginType } from '@nostrify/react/login';

export interface Account {
  id: string;
  pubkey: string;
  event?: NostrEvent;
  metadata: NostrMetadata;
  signingPubkey?: string;
}

function getDisplayPubkey(login: NLoginType): string {
  if (login.type === 'x-nip05-proxy') {
    return (login as NLoginType & { data: { aliasPubkey?: string } }).data.aliasPubkey ?? login.pubkey;
  }
  return login.pubkey;
}

export function useLoggedInAccounts() {
  const { nostr } = useNostr();
  const { logins, setLogin, removeLogin } = useNostrLogin();

  const loginMeta = logins.map((login) => ({
    id: login.id,
    signingPubkey: login.pubkey,
    displayPubkey: getDisplayPubkey(login),
  }));

  const uniquePubkeys = Array.from(new Set(loginMeta.map((entry) => entry.displayPubkey)));

  const { data: authors = [] } = useQuery({
    queryKey: ['logins', uniquePubkeys.join(';')],
    queryFn: async ({ signal }) => {
      if (!uniquePubkeys.length) return [];

      const events = await nostr.query(
        [{ kinds: [0], authors: uniquePubkeys }],
        { signal: AbortSignal.any([signal, AbortSignal.timeout(1500)]) },
      );

      return loginMeta.map(({ id, displayPubkey, signingPubkey }): Account => {
        const event = events.find((e) => e.pubkey === displayPubkey);
        try {
          const metadata = n.json().pipe(n.metadata()).parse(event?.content);
          return { id, pubkey: displayPubkey, signingPubkey, metadata, event };
        } catch {
          return { id, pubkey: displayPubkey, signingPubkey, metadata: {}, event };
        }
      });
    },
    retry: 3,
  });

  // Current user is the first login
  const currentUser: Account | undefined = (() => {
    const login = logins[0];
    if (!login) return undefined;
    const entry = loginMeta.find((meta) => meta.id === login.id);
    if (!entry) return undefined;
    const author = authors.find((a) => a.id === login.id);
    return { metadata: {}, ...author, id: login.id, pubkey: entry.displayPubkey, signingPubkey: entry.signingPubkey };
  })();

  // Other users are all logins except the current one
  const otherUsers = (authors || []).slice(1) as Account[];

  return {
    authors,
    currentUser,
    otherUsers,
    setLogin,
    removeLogin,
  };
}
