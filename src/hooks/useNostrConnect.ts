import { useCallback, useEffect, useRef, useState } from 'react';

import { useNostr } from '@nostrify/react';
import { NLogin, useNostrLogin } from '@nostrify/react/login';
import { generateSecretKey, getPublicKey, nip19, nip44 } from 'nostr-tools';
import QRCode from 'qrcode';

/**
 * What Blockstr asks a remote signer for. Signatures are requested per kind,
 * not as a bare `sign_event`: Opal refuses to pre-approve a kind-less request
 * (it would be "sign anything"), so a bare entry would leave the app with no
 * signing permission at all once the connection is made.
 */
export const NOSTR_CONNECT_PERMISSIONS = [
  'get_public_key',
  'sign_event:1', // scores and notes
  'sign_event:1111', // NIP-22 comments
  'sign_event:0', // profile edits
  'sign_event:9734', // zap requests
  'nip04_encrypt',
  'nip04_decrypt',
  'nip44_encrypt',
  'nip44_decrypt',
];

export type NostrConnectStatus = 'idle' | 'waiting' | 'connected' | 'error';

export interface UseNostrConnectOptions {
  /** Relays the signer is told to answer on. Should be a stable list. */
  relays: string[];
  /** App name shown in the signer's approval prompt. */
  appName?: string;
  /** Called once the signer has approved and the login is stored. */
  onConnected?: () => void;
}

export interface UseNostrConnectResult {
  status: NostrConnectStatus;
  /** The nostrconnect:// URI — safe to use as a link, QR payload or copied text. */
  uri: string | null;
  qrCodeDataUrl: string | null;
  error: string | null;
  /** Generate a fresh connection and start waiting for the signer. */
  start: () => void;
  /** Abandon the current connection. */
  cancel: () => void;
}

const randomSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

/** Build a NIP-46 client-initiated connection URI. */
export function buildNostrConnectUri({
  clientPubkey,
  secret,
  relays,
  appName,
  appUrl,
  permissions = NOSTR_CONNECT_PERMISSIONS,
}: {
  clientPubkey: string;
  secret: string;
  relays: string[];
  appName: string;
  appUrl?: string;
  permissions?: string[];
}): string {
  const params = new URLSearchParams({
    secret,
    perms: permissions.join(','),
    name: appName,
  });
  if (appUrl) {
    params.set('url', appUrl);
  }
  relays.forEach((relay) => params.append('relay', relay));

  return `nostrconnect://${clientPubkey}?${params.toString()}`;
}

/**
 * Drives a NIP-46 client-initiated connection: mint a throwaway client keypair,
 * hand the nostrconnect:// URI to a signer app (deep link, QR or clipboard), and
 * store the resulting bunker login once the signer answers on the relay.
 */
export function useNostrConnect({
  relays,
  appName = 'Blockstr',
  onConnected,
}: UseNostrConnectOptions): UseNostrConnectResult {
  const { nostr } = useNostr();
  const { addLogin } = useNostrLogin();

  const [status, setStatus] = useState<NostrConnectStatus>('idle');
  const [uri, setUri] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const onConnectedRef = useRef(onConnected);

  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus('idle');
    setUri(null);
    setQrCodeDataUrl(null);
    setError(null);
  }, []);

  const start = useCallback(() => {
    controllerRef.current?.abort();

    const secretKey = generateSecretKey();
    const clientPubkey = getPublicKey(secretKey);
    const secret = randomSecret();
    const connectionUri = buildNostrConnectUri({
      clientPubkey,
      secret,
      relays,
      appName,
      appUrl: typeof window === 'undefined' ? undefined : window.location.origin,
    });

    setUri(connectionUri);
    setError(null);
    setStatus('waiting');

    QRCode.toDataURL(connectionUri, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then(setQrCodeDataUrl)
      .catch(() => setQrCodeDataUrl(null));

    const controller = new AbortController();
    controllerRef.current = controller;

    (async () => {
      try {
        // Signers answer client-initiated connections with a kind 24133 event
        // p-tagged to the client key we just minted.
        const sub = nostr.req(
          [{ kinds: [24133], '#p': [clientPubkey], since: Math.floor(Date.now() / 1000) }],
          { signal: controller.signal },
        );

        for await (const msg of sub) {
          if (msg[0] !== 'EVENT') continue;

          const event = msg[2];
          let response: { result?: unknown; error?: string; method?: string };

          try {
            const conversationKey = nip44.getConversationKey(secretKey, event.pubkey);
            response = JSON.parse(nip44.decrypt(event.content, conversationKey));
          } catch {
            // Not our connection (or an incompatible payload) — keep waiting.
            continue;
          }

          if (typeof response.error === 'string' && response.error) {
            setError(`The signer refused the connection: ${response.error}`);
            setStatus('error');
            controller.abort();
            controllerRef.current = null;
            return;
          }

          // Client-initiated connections echo the secret back; some signers
          // simply send ack or a bare connect method.
          const connected =
            response.result === secret || response.result === 'ack' || response.method === 'connect';

          if (!connected) continue;

          addLogin(
            new NLogin('bunker', event.pubkey, {
              bunkerPubkey: event.pubkey,
              clientNsec: nip19.nsecEncode(secretKey),
              relays,
            }),
          );

          setStatus('connected');
          controller.abort();
          controllerRef.current = null;
          // Let the login context settle before the caller closes the dialog.
          window.setTimeout(() => onConnectedRef.current?.(), 100);
          return;
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Could not complete the connection');
        setStatus('error');
      }
    })();
  }, [addLogin, appName, nostr, relays]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  return { status, uri, qrCodeDataUrl, error, start, cancel };
}
