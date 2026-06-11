import { appRelayUrls } from '@/config/relays';

export const PAYMENT_RELAYS = Array.from(new Set([
  'wss://relay.gamestr.io',
  'wss://relay.ditto.pub',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://purplepag.es',
  ...appRelayUrls,
]));
