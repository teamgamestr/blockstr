# Fix for "http proxy error: /api/sign-score"

## Problem

The error `http proxy error: /api/sign-score` occurs when:
1. Vite dev server is running on port 8080
2. Express API server is **NOT** running on port 3000
3. Frontend tries to call `/api/sign-score`
4. Vite proxy can't forward the request because Express isn't there

## Root Cause

You were likely running only `vite` instead of `npm run dev`, which means:
- ✅ Vite dev server was running (frontend)
- ❌ Express API server was NOT running (backend)

## Solution

### 1. Always Use `npm run dev`

```bash
# ❌ Wrong - only starts Vite
vite

# ✅ Correct - starts both servers
npm run dev
```

### 2. Verify Both Servers Are Running

When you run `npm run dev`, you should see output like this:

```
[API]  ✓ Environment variables configured correctly
[API]  ✓ Server running on port 3000
[API]    Local: http://localhost:3000
[VITE] 
[VITE] VITE v6.4.1  ready in 234 ms
[VITE] 
[VITE] ➜  Local:   http://localhost:8080/
[VITE] ➜  Network: http://[::]:8080/
```

Both `[API]` and `[VITE]` prefixes should be present.

### 3. Check Running Processes

```bash
ps aux | grep node
```

You should see at least two node processes:
1. `node server.js` - Express API server
2. `node .../vite` - Vite dev server

## Changes Made

### 1. Enhanced Proxy Configuration (`vite.config.ts`)

Added error handling and logging to the proxy:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    configure: (proxy, _options) => {
      proxy.on('error', (err, _req, _res) => {
        console.log('\n❌ Proxy Error: Express server is not running on port 3000');
        console.log('💡 Make sure to run: npm run dev (not just vite)\n');
      });
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        console.log('→ Proxying:', req.method, req.url, '→ http://localhost:3000');
      });
    },
  },
}
```

Now when the proxy fails, you get a clear error message telling you what's wrong.

### 2. Improved Dev Script (`package.json`)

Added colored output and labels:

```json
"dev": "npm i && concurrently --names \"API,VITE\" --prefix-colors \"blue,green\" \"node server.js\" \"vite\""
```

This makes it easy to see which server is logging what.

### 3. Created Helper Script (`start-dev.sh`)

A bash script that:
- Checks for `.env` file
- Validates `BLOCKSTR_NSEC` is configured
- Provides helpful error messages
- Runs `npm run dev`

Usage:
```bash
./start-dev.sh
```

### 4. Enhanced Documentation

Created three new documents:
- **TROUBLESHOOTING.md** - Comprehensive troubleshooting guide
- **DEV_SETUP_FIX.md** - Detailed explanation of the original fix
- **PROXY_ERROR_FIX.md** - This document

Updated existing docs:
- **README.md** - Added Quick Start section at the top
- **DEPLOYMENT.md** - Added Development Setup section

## How the System Works

```
┌─────────────────────────────────────────────┐
│  Developer runs: npm run dev                │
└────────────────┬────────────────────────────┘
                 │
                 ├─────────────────┬──────────────────┐
                 │                 │                  │
                 ▼                 ▼                  │
    ┌────────────────────┐  ┌──────────────────┐    │
    │  Express Server    │  │  Vite Dev Server │    │
    │  (port 3000)       │  │  (port 8080)     │    │
    │                    │  │                  │    │
    │  Routes:           │  │  Serves:         │    │
    │  POST /api/        │  │  React app       │    │
    │    sign-score      │  │  HMR updates     │    │
    └────────────────────┘  └──────────────────┘    │
             ▲                       │               │
             │                       │               │
             │    Proxy: /api/* ────┘               │
             │                                       │
             │                                       │
    ┌────────┴───────────────────────────────────────┘
    │  Both servers must be running for
    │  score signing to work
    └────────────────────────────────────────────────┘
```

## Testing the Fix

1. **Stop any running processes** (Ctrl+C)

2. **Start both servers**:
   ```bash
   npm run dev
   ```

3. **Verify output** shows both `[API]` and `[VITE]` prefixes

4. **Open browser** to `http://localhost:8080`

5. **Play a game** and finish

6. **Click "SAVE SCORE TO NOSTR"**

7. **Check terminal** - you should see:
   ```
   [VITE] → Proxying: POST /api/sign-score → http://localhost:3000
   [API]  Signed score event: abc123... for player: def456...
   ```

8. **Check browser console** - you should see:
   ```
   Requesting server to sign score...
   Server signed score successfully: {...}
   Publishing signed event to relays...
   Score published to relays successfully
   ```

## Quick Reference

### Commands

```bash
# Start development (both servers)
npm run dev

# Start only Express server
npm run dev:server

# Start only Vite server
npm run dev:vite

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

### Ports

- **3000** - Express API server (backend)
- **8080** - Vite dev server (frontend)

### Environment Variables

Required in `.env`:
```bash
BLOCKSTR_NSEC=nsec1...  # Your private key
PORT=3000                # Express server port
```

### Troubleshooting Quick Checks

```bash
# Check if both servers are running
ps aux | grep node

# Check if ports are in use
lsof -i :3000
lsof -i :8080

# Check environment variables
cat .env

# Test Express server directly
curl http://localhost:3000/api/sign-score

# Check Vite proxy configuration
cat vite.config.ts | grep -A 10 "proxy"
```

## Prevention

To avoid this issue in the future:

1. **Always use `npm run dev`** - Never run `vite` directly
2. **Check terminal output** - Make sure you see both `[API]` and `[VITE]`
3. **Use the helper script** - `./start-dev.sh` checks everything for you
4. **Read the error messages** - They now tell you exactly what's wrong

## Related Issues

- "Server rejected score: Not Found" - Same root cause
- "BLOCKSTR_NSEC environment variable not set" - Different issue (see TROUBLESHOOTING.md)
- Port conflicts - See TROUBLESHOOTING.md

## Summary

The proxy error happens when the Express API server isn't running. The fix is simple: **always use `npm run dev`** instead of running `vite` directly. The enhanced error messages and documentation now make this clear and help you diagnose the issue quickly.
