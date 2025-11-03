# Troubleshooting Guide

## Common Development Issues

### Error: "Server rejected score: Not Found"

**Symptom**: When trying to save a score, you see this error in the browser console.

**Cause**: The Express API server is not running. You're only running Vite.

**Solution**:
```bash
# Stop the current process (Ctrl+C)
# Run the correct command:
npm run dev
```

**How to verify both servers are running**:
```bash
# In another terminal, check running processes:
ps aux | grep node

# You should see TWO node processes:
# 1. node server.js (Express API)
# 2. node .../vite (Vite dev server)
```

**Check the terminal output**:
```
[API]  ✓ Environment variables configured correctly
[API]  ✓ Server running on port 3000
[VITE] ➜  Local:   http://localhost:8080/
```

If you only see `[VITE]` output, the API server isn't running.

---

### Error: "http proxy error: /api/sign-score"

**Symptom**: Vite shows a proxy error in the terminal.

**Cause**: Express server is not running or not accessible on port 3000.

**Solution**:
1. Make sure you ran `npm run dev` (not `npm run dev:vite`)
2. Check if port 3000 is already in use:
   ```bash
   lsof -i :3000
   ```
3. If another process is using port 3000, kill it or change the port in `.env`:
   ```bash
   PORT=3001
   ```
   Then update the proxy target in `vite.config.ts` to match.

---

### Error: "BLOCKSTR_NSEC environment variable not set"

**Symptom**: Server starts but shows this error message.

**Cause**: `.env` file is missing or doesn't have `BLOCKSTR_NSEC` configured.

**Solution**:
1. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

2. Generate a keypair (if you don't have one):
   ```bash
   npx nostr-tools generate-keypair
   ```

3. Add the private key (nsec) to `.env`:
   ```bash
   BLOCKSTR_NSEC=nsec1your_private_key_here
   PORT=3000
   ```

4. Restart the development servers:
   ```bash
   npm run dev
   ```

---

### Port Already in Use

**Symptom**: 
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause**: Another process is using port 3000 or 8080.

**Solution**:

**Option 1**: Kill the process using the port
```bash
# Find the process
lsof -i :3000
lsof -i :8080

# Kill it (replace PID with actual process ID)
kill -9 <PID>
```

**Option 2**: Change the ports
```bash
# Edit .env
PORT=3001

# Edit vite.config.ts
server: {
  port: 8081,
  proxy: {
    '/api': {
      target: 'http://localhost:3001', // Match new PORT
    }
  }
}
```

---

### Score Signing Works But Scores Don't Appear on Nostr

**Symptom**: Score is signed successfully but doesn't show up on Nostr clients.

**Possible Causes**:
1. Relay connection issues
2. Event not propagating to relays
3. Wrong relay configuration

**Solution**:

1. **Check browser console** for relay publishing logs:
   ```
   Publishing signed event to relays...
   Score published to relays successfully
   ```

2. **Verify the event was created**:
   - Copy the event ID from the console
   - Search for it on https://nostr.band

3. **Check relay configuration**:
   - Open browser DevTools → Application → Local Storage
   - Look for relay settings
   - Make sure at least one relay is configured

4. **Try different relays**:
   - Use the relay selector in the UI
   - Try well-known relays like:
     - wss://relay.damus.io
     - wss://relay.nostr.band
     - wss://nos.lol

5. **Check event structure**:
   - Open browser console
   - Look for the signed event object
   - Verify it has all required tags (d, p, game, score)

---

### TypeScript Errors in IDE

**Symptom**: VS Code shows TypeScript errors but code runs fine.

**Solution**:
```bash
# Restart TypeScript server in VS Code
# Press: Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
# Type: "TypeScript: Restart TS Server"

# Or rebuild TypeScript definitions
npm run build
```

---

### Vite HMR Not Working

**Symptom**: Changes to code don't reflect in the browser.

**Solution**:
1. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
2. **Clear cache**: DevTools → Network → Disable cache
3. **Restart Vite**: Kill the process and run `npm run dev` again
4. **Check browser console** for HMR connection errors

---

### Express Server Crashes

**Symptom**: API server stops responding, terminal shows crash.

**Common Causes**:
1. Invalid private key format
2. Missing dependencies
3. Port conflict

**Solution**:
1. **Check the error message** in terminal
2. **Verify private key format**:
   - Should be `nsec1...` (bech32) or 64-character hex
   - No extra spaces or newlines
3. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
4. **Check for port conflicts** (see "Port Already in Use" above)

---

## Getting Help

If you're still experiencing issues:

1. **Check the logs**:
   - Browser console (F12)
   - Terminal output from both servers
   
2. **Verify environment**:
   ```bash
   node --version  # Should be 18+
   npm --version
   cat .env        # Check configuration
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Search existing issues** on GitHub

5. **Open a new issue** with:
   - Error messages (from both browser and terminal)
   - Steps to reproduce
   - Your environment (OS, Node version, browser)
   - Relevant configuration files (.env contents with secrets redacted)

---

## Debug Mode

Enable verbose logging:

1. **Server-side**:
   ```javascript
   // Add to server.js
   console.log('DEBUG:', req.body);
   ```

2. **Client-side**:
   ```typescript
   // Already included in useScorePublishing.ts
   // Check browser console for detailed logs
   ```

3. **Proxy debugging**:
   - Already configured in `vite.config.ts`
   - Shows all proxied requests in terminal
