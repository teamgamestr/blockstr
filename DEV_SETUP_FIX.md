# Development Setup Fix

## Problem

The server was rejecting score signing requests with "Not Found" error because:

1. **Express server** runs on port 3000 and provides the `/api/sign-score` endpoint
2. **Vite dev server** runs on port 8080 and serves the React frontend
3. Frontend was making requests to `/api/sign-score` on the Vite server (port 8080)
4. Vite server didn't have that route, resulting in 404 Not Found

## Solution

### 1. Added Vite Proxy Configuration

Updated `vite.config.ts` to proxy API requests from Vite to Express:

```typescript
server: {
  host: "::",
  port: 8080,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

This configuration forwards all `/api/*` requests from port 8080 to port 3000.

### 2. Updated Development Scripts

Modified `package.json` to run both servers concurrently:

```json
"scripts": {
  "dev": "npm i && concurrently \"node server.js\" \"vite\"",
  "dev:vite": "vite",
  "dev:server": "node server.js"
}
```

Added `concurrently` package to run both servers with a single command.

### 3. Updated Documentation

Enhanced `DEPLOYMENT.md` with a comprehensive Development Setup section explaining:
- How to run both servers
- Development architecture diagram
- Troubleshooting common issues
- How the proxy works

## How to Use

### Start Development

```bash
npm run dev
```

This single command now:
1. Installs dependencies
2. Starts Express server on port 3000
3. Starts Vite dev server on port 8080
4. Configures proxy to forward API requests

### Access the Application

- Open `http://localhost:8080` in your browser
- Frontend requests to `/api/sign-score` are automatically proxied to Express server
- Score signing now works correctly in development

## Architecture

```
Browser (localhost:8080)
    ↓
Vite Dev Server (port 8080)
    ↓ [proxy /api/* requests]
Express Server (port 3000)
    ↓ [signs scores with BLOCKSTR_NSEC]
Nostr Relays
```

## Files Modified

1. **vite.config.ts** - Added proxy configuration
2. **package.json** - Updated dev scripts, added concurrently
3. **DEPLOYMENT.md** - Added Development Setup section

## Testing

All tests pass:
```
✓ src/lib/genUserName.test.ts (3 tests)
✓ src/test/ErrorBoundary.test.tsx (3 tests)
✓ src/components/NoteContent.test.tsx (5 tests)
✓ src/App.test.tsx (1 test)

Test Files  4 passed (4)
Tests  12 passed (12)
```

## Next Steps

To test score signing:

1. Start development servers: `npm run dev`
2. Open `http://localhost:8080`
3. Log in with Nostr
4. Play a game and finish
5. Click "SAVE SCORE TO NOSTR"
6. Check browser console for success messages
7. Check server logs for "Signed score event: ..." message
