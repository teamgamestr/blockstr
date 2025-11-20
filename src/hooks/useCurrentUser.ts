import { useCallback, useEffect, useMemo } from 'react';
import { useNostr } from '@nostrify/react';
import { NLogin, type NLoginType, NUser, useNostrLogin } from '@nostrify/react/login';
import { NSecSigner } from '@jsr/nostrify__nostrify';
import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

import { useAuthor } from './useAuthor.ts';

interface Nip05ReadonlyLogin {
  id: string;
  type: 'x-nip05-readonly';
  pubkey: string;
  createdAt: string;
  data: {
    identifier?: string;
    source?: string;
  };
}

interface Nip05ProxyLogin {
  id: string;
  type: 'x-nip05-proxy';
  pubkey: string;
  createdAt: string;
  data: {
    clientNsec: `nsec1${string}`;
    aliasPubkey: string;
    identifier?: string;
    source?: string;
  };
}

interface ConferenceUserExtras {
  aliasPubkey?: string;
  nip05?: string;
  loginSource?: string;
  isConferenceProxy?: boolean;
}

function isNip05ReadonlyLogin(login: NLoginType): login is Nip05ReadonlyLogin {
  return login.type === 'x-nip05-readonly';
}

function isNip05ProxyLogin(login: NLoginType): login is Nip05ProxyLogin {
  return login.type === 'x-nip05-proxy';
}

function createReadOnlyUser(login: Nip05ReadonlyLogin): NUser {
  const readOnlySigner = {
    async getPublicKey() {
      return login.pubkey;
    },
    async signEvent() {
      throw new Error('This NIP-05 session is read-only and cannot sign events.');
    },
  };

  const user = new NUser(login.type, login.pubkey, readOnlySigner) as NUser & ConferenceUserExtras;

  user.nip05 = login.data.identifier;
  user.loginSource = login.data.source;

  return user;
}

function createProxyUser(login: Nip05ProxyLogin): NUser {
  const decoded = nip19.decode(login.data.clientNsec);
  if (decoded.type !== 'nsec') {
    throw new Error('Invalid client secret stored for NIP-05 proxy login');
  }

  const signer = new NSecSigner(decoded.data);
  const user = new NUser(login.type, login.pubkey, signer) as NUser & ConferenceUserExtras;

  user.aliasPubkey = login.data.aliasPubkey;
  user.nip05 = login.data.identifier;
  user.loginSource = login.data.source;
  user.isConferenceProxy = true;

  return user;
}

const upgradedLegacyLogins = new Set<string>();

export function useCurrentUser() {
  const { nostr } = useNostr();
  const { logins, addLogin, removeLogin } = useNostrLogin();

  useEffect(() => {
    const legacyLogins = logins.filter((login): login is Nip05ReadonlyLogin =>
      isNip05ReadonlyLogin(login) && !upgradedLegacyLogins.has(login.id)
    );
    if (legacyLogins.length === 0) return;

    legacyLogins.forEach((login) => upgradedLegacyLogins.add(login.id));

    for (const legacy of legacyLogins) {
      const secretKey = generateSecretKey();
      const clientNsec = nip19.nsecEncode(secretKey);
      const clientPubkey = getPublicKey(secretKey);

      const proxyLogin = new NLogin('x-nip05-proxy', clientPubkey, {
        clientNsec,
        aliasPubkey: legacy.pubkey,
        identifier: legacy.data.identifier,
        source: legacy.data.source ?? 'nip05',
      });

      addLogin(proxyLogin);
      removeLogin(legacy.id);
    }
  }, [logins, addLogin, removeLogin]);

  const loginToUser = useCallback((login: NLoginType): NUser  => {
    switch (login.type) {
      case 'nsec': // Nostr login with secret key
        return NUser.fromNsecLogin(login);
      case 'bunker': // Nostr login with NIP-46 "bunker://" URI
        return NUser.fromBunkerLogin(login, nostr);
      case 'extension': // Nostr login with NIP-07 browser extension
        return NUser.fromExtensionLogin(login);
      default:
        if (isNip05ProxyLogin(login)) {
          return createProxyUser(login);
        }
        if (isNip05ReadonlyLogin(login)) {
          return createReadOnlyUser(login);
        }
        throw new Error(`Unsupported login type: ${login.type}`);
    }
  }, [nostr]);

  const users = useMemo(() => {
    const users: NUser[] = [];

    for (const login of logins) {
      try {
        const user = loginToUser(login);
        users.push(user);
      } catch (error) {
        console.warn('Skipped invalid login', login.id, error);
      }
    }

    return users;
  }, [logins, loginToUser]);

  const user = users[0] as (NUser & ConferenceUserExtras) | undefined;
  const effectivePubkey = user?.aliasPubkey ?? user?.pubkey;
  const author = useAuthor(effectivePubkey);

  return {
    user,
    users,
    effectivePubkey,
    aliasPubkey: user?.aliasPubkey,
    signingPubkey: user?.pubkey,
    ...author.data,
  };
}
