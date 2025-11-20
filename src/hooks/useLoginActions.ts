import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

// NOTE: This file should not be edited except for adding new login methods.

interface Nip05LoginOptions {
  /** Raw nip05 identifier entered by the user (e.g., alice@example.com). */
  identifier?: string;
  /** Where this read-only login originated (conference page, etc.). */
  source?: string;
}

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
    // Login anonymously with a temporary keypair (optionally with a specific pubkey for NIP-05 verified users)
    anonymous(pubkey?: string, options?: Nip05LoginOptions): void {
      const secretKey = generateSecretKey();
      const nsec = nip19.nsecEncode(secretKey);

      // If a verified pubkey is provided, create a proxy login that signs with the temporary key
      if (pubkey) {
        const clientPubkey = getPublicKey(secretKey);
        const proxyLogin = new NLogin('x-nip05-proxy', clientPubkey, {
          clientNsec: nsec,
          aliasPubkey: pubkey,
          identifier: options?.identifier,
          source: options?.source ?? 'nip05',
        });

        // Store the verified pubkey in localStorage for backward compatibility
        try {
          localStorage.setItem('blockstr_verified_pubkey', pubkey);
        } catch (error) {
          console.warn('Unable to persist verified pubkey to localStorage:', error);
        }

        addLogin(proxyLogin);
        return;
      }

      // Otherwise generate a new temporary keypair for truly anonymous play
      const login = NLogin.fromNsec(nsec);
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
