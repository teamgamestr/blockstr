# Fix for Internal Server Error

## Problems Fixed

### 1. Missing dotenv Package
**Problem**: The `.env` file was not being loaded, so `BLOCKSTR_NSEC` was undefined.

**Symptom**: 
```
❌ CRITICAL: Missing required environment variable: BLOCKSTR_NSEC
```

**Solution**: Added `dotenv` package and imported it at the top of `server.js`:
```javascript
import 'dotenv/config';
```

### 2. Express 5 Wildcard Route Syntax
**Problem**: Express 5 changed how catch-all routes work. The `app.get('*', ...)` syntax is no longer supported.

**Symptom**:
```
PathError [TypeError]: Missing parameter name at index 1: *
```

**Solution**: Changed from `app.get('*', ...)` to `app.use(...)`:
```javascript
// ❌ Old (doesn't work in Express 5)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// ✅ New (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});
```

### 3. No Console Output
**Problem**: The `concurrently` command wasn't showing proper output prefixes.

**Solution**: Added explicit prefix configuration:
```json
"dev": "npm i && concurrently --kill-others --names \"API,VITE\" --prefix-colors \"blue,green\" --prefix \"[{name}]\" \"node server.js\" \"vite\""
```

### 4. Better Error Logging
**Problem**: Internal server errors didn't show enough detail for debugging.

**Solution**: Added comprehensive logging:
```javascript
// Log incoming requests
console.log('Received sign-score request:', JSON.stringify(req.body, null, 2));

// Log errors with stack traces
console.error('Score signing error:', error);
console.error('Error stack:', error.stack);

// Return stack trace in development mode
res.status(500).json({ 
  error: 'Failed to sign score',
  message: error.message,
  details: process.env.NODE_ENV === 'development' ? error.stack : undefined
});
```

## Changes Made

### Files Modified

1. **server.js**
   - Added `import 'dotenv/config'` at the top
   - Changed `app.get('*', ...)` to `app.use(...)`
   - Added request logging
   - Enhanced error logging with stack traces

2. **package.json**
   - Updated dev script with better concurrently configuration
   - Added `--kill-others` flag to stop all processes if one fails
   - Added explicit `--prefix` configuration for better output

3. **.env**
   - Changed `NODE_ENV=production` to `NODE_ENV=development`
   - This enables detailed error messages during development

4. **package.json** (dependencies)
   - Added `dotenv` package

## How to Test

### 1. Start the Development Servers

```bash
npm run dev
```

You should now see colored output:
```
[API]  ✓ Environment variables configured correctly
[API]  ✓ Server running on port 3000
[API]    Local: http://localhost:3000
[VITE] 
[VITE] VITE v6.4.1  ready in 234 ms
[VITE] 
[VITE] ➜  Local:   http://localhost:8080/
```

### 2. Play a Game and Submit a Score

1. Open `http://localhost:8080`
2. Log in with Nostr
3. Play a game
4. Click "SAVE SCORE TO NOSTR"

### 3. Check the Logs

**Terminal should show:**
```
[API] Received sign-score request: {
[API]   "sessionId": "abc123...",
[API]   "playerPubkey": "def456...",
[API]   "score": 1234,
[API]   "difficulty": "medium",
[API]   "duration": 180,
[API]   "blocks": 3
[API] }
[API] Signed score event: xyz789... for player: def456...
[VITE] → Proxying: POST /api/sign-score → http://localhost:3000
```

**Browser console should show:**
```
Requesting server to sign score...
Server signed score successfully: {id: "...", kind: 30762, ...}
Publishing signed event to relays...
Score published to relays successfully
```

## Troubleshooting

### Still Getting Internal Server Error?

1. **Check server logs** in the terminal for the actual error
2. **Check browser console** for the error response
3. **Verify .env file** has correct `BLOCKSTR_NSEC`
4. **Test the API directly**:
   ```bash
   curl -X POST http://localhost:3000/api/sign-score \
     -H "Content-Type: application/json" \
     -d '{
       "sessionId": "test123",
       "playerPubkey": "0000000000000000000000000000000000000000000000000000000000000000",
       "score": 100,
       "difficulty": "easy",
       "duration": 60,
       "blocks": 1
     }'
   ```

### Environment Variables Not Loading?

```bash
# Check if dotenv is installed
npm list dotenv

# Should show:
# blockstr@0.0.0
# └── dotenv@16.x.x

# Verify .env file exists
cat .env

# Should show your BLOCKSTR_NSEC
```

### Server Still Crashing?

```bash
# Run server directly to see full error
node server.js

# Should show:
# ✓ Environment variables configured correctly
# ✓ Server running on port 3000
```

## Production Deployment

For production, remember to:

1. **Set NODE_ENV=production** in your hosting platform's environment variables
2. **Don't commit .env file** (it's already in .gitignore)
3. **Build the frontend first**: `npm run build`
4. **Start the server**: `npm start`

The production setup should:
- Load environment variables from hosting platform (not .env file)
- Serve the built frontend from `dist/` folder
- Not show error stack traces to users

## Summary

The main issues were:
1. ✅ `.env` file not being loaded → Fixed by adding `dotenv`
2. ✅ Express 5 compatibility → Fixed by changing wildcard route syntax
3. ✅ No console output → Fixed by improving concurrently configuration
4. ✅ Poor error messages → Fixed by adding detailed logging

All tests pass ✅ and the server now starts correctly with proper logging!
