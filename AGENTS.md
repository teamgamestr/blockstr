# Blockstr Agent Notes

## Project Overview
Blockstr - Bitcoin-Powered Tetris. A React 18 + TypeScript web game that integrates with Bitcoin (mempool.space API), Lightning Network payments, and Nostr protocol for decentralized score sharing.

## Repository
- **URL:** https://github.com/teamgamestr/blockstr
- **Local Path:** `/home/ubuntu/blockstr/`
- **Domain:** https://blockstr.io (production)

## Technology Stack
- React 18 + TypeScript + Vite 6
- TailwindCSS 3 + shadcn/ui components
- Express.js API server (port 3000)
- Nostr protocol via `nostr-tools` + `@nostrify/nostrify`
- Mempool.space API for live Bitcoin block detection
- Lightning payments via WebLN + NWC

## Important Files & Locations

| File | Purpose |
|------|---------|
| `/home/ubuntu/blockstr/.env` | Production secrets (BLOCKSTR_NSEC, PORT) |
| `/home/ubuntu/blockstr/server.js` | Express API (score signing, static serving) |
| `/home/ubuntu/blockstr/src/config/gameConfig.ts` | Game balance/settings (speed, cost, etc.) |
| `/home/ubuntu/blockstr/src/config/relays.ts` | Default Nostr relay list |
| `/home/ubuntu/blockstr/DEPLOYMENT.md` | Detailed deployment guide |
| `/home/ubuntu/blockstr/PAYMENT_SYSTEM.md` | Lightning payment config details |
| `/etc/caddy/Caddyfile` | Reverse proxy config (includes blockstr.io) |
| `/etc/systemd/system/blockstr.service` | Systemd service definition |

## Production Configuration

### Environment Variables (`.env`)
`BLOCKSTR_NSEC` is stored only in `/home/ubuntu/blockstr/.env` — never commit or document the actual key.
```
PORT=3000
NODE_ENV=production
```

### Systemd Service
- **Service name:** `blockstr`
- **User:** `ubuntu`
- **WorkingDir:** `/home/ubuntu/blockstr`
- **ExecStart:** `/usr/bin/node server.js`
- Logs: `sudo journalctl -u blockstr -f`
- Commands:
  ```bash
  sudo systemctl start blockstr
  sudo systemctl stop blockstr
  sudo systemctl restart blockstr
  ```

### Caddy Reverse Proxy
Configured for `blockstr.io` and `www.blockstr.io` → `localhost:3000`.

```
blockstr.io, www.blockstr.io {
    reverse_proxy localhost:3000
    ...
}
```

## Key Operational Details

1. **Score Signing (Kind 30762):** Server signs score events using `BLOCKSTR_NSEC`. The server will **exit on startup** in production if `BLOCKSTR_NSEC` is missing.
2. **Static Serving:** The Express server serves the `dist/` folder. SPA routing is handled by falling back to `dist/index.html`.
3. **Build Prerequisite:** Must run `npm run build` before restarting the service after any frontend changes.
4. **Port Conflicts:** Runs on `PORT=3000`. Ensure nothing else binds there.
5. **Payment Receiver:** `blockstrPubkey` in `gameConfig.ts` controls where Lightning zaps go.

## Development vs Production

| Mode | Command | Details |
|------|---------|---------|
| Development | `npm run dev` | Runs API + Vite dev concurrently |
| Production Build | `npm run build` | Outputs to `dist/` (run before deploying) |
| Production Server | `npm start` / systemd | Express serves `dist/` on port 3000 |

## Changing Game Settings
Edit `/home/ubuntu/blockstr/src/config/gameConfig.ts`, then rebuild and restart:
```bash
cd /home/ubuntu/blockstr
npm run build
sudo systemctl restart blockstr
```

## Updating / Reinstalling
```bash
cd /home/ubuntu/blockstr
git pull origin master  # or desired branch
npm install
npm run build
sudo systemctl restart blockstr
sudo systemctl reload caddy
```
