import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';

// NOTE: This file should not be edited except for adding new login methods.

export function useLoginActions() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();

  return {
    // Login with a Nostr secret key
    nsec(nsec: string): void {
      const login = NLogin.fromNsec(nsec);
      addLogin(login);
    },
    // Login with a NIP-46 "bunker://" URI
    async bunker(uri: string): Promise<void> {
      try {
        // Check if a bunker login with the same URI already exists
        // Parse the bunker URI to get the pubkey
        const uriMatch = uri.match(/^bunker:\/\/([a-f0-9]{64})/);
        const bunkerPubkey = uriMatch?.[1];

        if (bunkerPubkey) {
          const existingLogin = logins.find(
            l => l.type === 'bunker' && l.data?.bunkerPubkey === bunkerPubkey
          );

          if (existingLogin) {
            console.log('Bunker login already exists, reusing existing connection');
            // Just add the existing login to set it as current
            // This avoids creating a duplicate connection
            addLogin(existingLogin);
            return;
          }
        }

        console.log('Creating new bunker login...');
        const login = await NLogin.fromBunker(uri, nostr);
        console.log('Bunker login created, pubkey:', login.pubkey);

        addLogin(login);
        console.log('Current logins:', logins.length);
      } catch (error) {
        console.error('Bunker connection error:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to connect to bunker');
      }
    },
    // Login with a NIP-07 browser extension
    async extension(): Promise<void> {
      const login = await NLogin.fromExtension();
      addLogin(login);
    },
    // Log out the current user
    async logout(): Promise<void> {
      const login = logins[0];
      if (login) {
        removeLogin(login.id);
      }
    }
  };
}
