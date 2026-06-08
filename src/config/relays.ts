export const appRelays = [
  { url: 'wss://relay.gamestr.io', name: 'Gamestr' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://nos.lol', name: 'nos.lol' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
] as const;

export const appRelayUrls = appRelays.map((relay) => relay.url);

export const profileSearchRelayUrls = ['wss://relay.ditto.pub'];
