# Blockstr Deployment Guide

## Server-Side Signing Architecture

Blockstr uses server-side signing to securely sign game scores. The private key is stored as an environment variable on the server, never exposed to the client.

## Prerequisites

- Node.js 18+ installed
- Blockstr private key (nsec or hex format)
- VPS or hosting platform (Replit, DigitalOcean, etc.)

## Development Setup

### Running in Development Mode

Blockstr requires both the Express server (for API endpoints) and Vite (for frontend development) to run simultaneously.

1. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your BLOCKSTR_NSEC
   ```

2. **Run the development servers**:
   ```bash
   npm run dev
   ```

   This command starts both:
   - **Express server** on `http://localhost:3000` (API endpoints)
   - **Vite dev server** on `http://localhost:8080` (frontend)

   The Vite dev server automatically proxies `/api/*` requests to the Express server.

3. **Access the application**:
   - Open `http://localhost:8080` in your browser
   - The frontend will communicate with the API server via the proxy

### Running Servers Separately (Optional)

If you need to run the servers separately:

```bash
# Terminal 1: Start Express server
npm run dev:server

# Terminal 2: Start Vite dev server
npm run dev:vite
```

### Development Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (http://localhost:8080)                    │
└────────────────┬────────────────────────────────────┘
                 │
                 │ HTTP Requests
                 │
┌────────────────▼────────────────────────────────────┐
│  Vite Dev Server (port 8080)                        │
│  - Serves React app                                 │
│  - Hot module replacement                           │
│  - Proxies /api/* to Express                        │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Proxy: /api/* requests
                 │
┌────────────────▼────────────────────────────────────┐
│  Express Server (port 3000)                         │
│  - POST /api/sign-score                             │
│  - Signs scores with BLOCKSTR_NSEC                  │
│  - Returns signed events                            │
└─────────────────────────────────────────────────────┘
```

### Troubleshooting Development Issues

**Problem**: "Error publishing score: Error: Server rejected score: Not Found"

**Cause**: Express server is not running, or Vite proxy is not configured.

**Solution**:
1. Make sure you're running `npm run dev` (not just `vite`)
2. Verify Express server started on port 3000
3. Check browser console and server logs
4. Ensure `.env` file has `BLOCKSTR_NSEC` set

**Problem**: "BLOCKSTR_NSEC environment variable not set"

**Cause**: `.env` file is missing or doesn't contain the private key.

**Solution**:
1. Create `.env` file in project root
2. Add `BLOCKSTR_NSEC=nsec1...` with your private key
3. Restart the dev servers

## Environment Setup

### 1. Generate Blockstr Keypair (One-time)

```bash
npx nostr-tools generate-keypair
```

Save the output:
- **Public key (npub)**: Share this publicly
- **Private key (nsec)**: Keep this SECRET

### 2. Set Environment Variable

Create a `.env` file (never commit this!):

```bash
BLOCKSTR_NSEC=nsec1your_private_key_here
PORT=3000
NODE_ENV=production
```

Or set environment variables directly in your hosting platform.

## Deployment Steps

### Option 1: Replit VPS

1. **Create new Repl** or import from GitHub
2. **Set Secrets** in Replit's Secrets tab:
   - Key: `BLOCKSTR_NSEC`
   - Value: `nsec1...` (your private key)
3. **Build the project**:
   ```bash
   npm run build
   ```
4. **Start the server**:
   ```bash
   npm start
   ```
5. **Configure Run Command** in Replit:
   - Run command: `npm start`
   - Build command: `npm run build`

### Option 2: DigitalOcean/Linode VPS

1. **SSH into your VPS**:
   ```bash
   ssh user@your-server-ip
   ```

2. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/blockstr.git
   cd blockstr
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set environment variable**:
   ```bash
   echo "BLOCKSTR_NSEC=nsec1your_key_here" > .env
   echo "PORT=3000" >> .env
   echo "NODE_ENV=production" >> .env
   ```

5. **Build the project**:
   ```bash
   npm run build
   ```

6. **Start with PM2** (process manager):
   ```bash
   npm install -g pm2
   pm2 start server.js --name blockstr
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx** (optional, for reverse proxy):
   ```nginx
   server {
       listen 80;
       server_name blockstr.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 3: Docker

1. **Create Dockerfile**:
   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   RUN npm ci --only=production

   COPY . .
   RUN npm run build

   EXPOSE 3000

   CMD ["npm", "start"]
   ```

2. **Build and run**:
   ```bash
   docker build -t blockstr .
   docker run -d -p 3000:3000 -e BLOCKSTR_NSEC=nsec1... blockstr
   ```

## Verification

### Check Environment Variable on Startup

When the server starts, you should see:

```
✓ Environment variables configured correctly
✓ Server running on port 3000
  Local: http://localhost:3000
```

If the environment variable is missing:

```
❌ CRITICAL: Missing required environment variable: BLOCKSTR_NSEC

Please set the following environment variable:

  BLOCKSTR_NSEC=nsec1... (or hex private key)

Score signing will not work without this configuration.
```

### Test Score Signing

1. **Play a game** and finish
2. **Click "SAVE SCORE TO NOSTR"**
3. **Check browser console** for:
   ```
   Requesting server to sign score...
   Server signed score successfully: {...}
   Publishing signed event to relays...
   Score published to relays successfully
   ```
4. **Check server logs** for:
   ```
   Signed score event: <event-id> for player: <pubkey>
   ```

## Security Checklist

- [ ] `.env` file is in `.gitignore` (already included)
- [ ] Private key is stored as environment variable, not in code
- [ ] Server validates score data before signing
- [ ] HTTPS is enabled (use Let's Encrypt or Cloudflare)
- [ ] Rate limiting is configured (optional, for production)
- [ ] Server logs are monitored
- [ ] Backup of private key is stored securely offline

## Monitoring

### Server Logs

```bash
# PM2
pm2 logs blockstr

# Docker
docker logs -f <container-id>

# Direct
tail -f /var/log/blockstr.log
```

### Score Signing Metrics

Monitor these metrics:
- Number of scores signed per hour
- Failed signing attempts
- Invalid score requests
- Server response times

## Troubleshooting

### Error: "BLOCKSTR_NSEC environment variable not set"

**Solution**: Set the environment variable in your hosting platform or `.env` file.

### Error: "Server rejected score: 400"

**Cause**: Invalid score data sent from client.

**Solution**: Check browser console for validation errors.

### Error: "Failed to sign score: Invalid nsec format"

**Cause**: Private key format is incorrect.

**Solution**: Ensure the private key is either:
- `nsec1...` format (bech32)
- 64-character hex string

### Scores not appearing on Nostr

**Cause**: Relay connection issues or event not propagating.

**Solution**:
1. Check relay connectivity
2. Verify signed event structure
3. Try publishing to different relays
4. Check Nostr clients (nostrudel, snort.social) for the score event

## Updating

### Pull Latest Changes

```bash
git pull origin main
npm install
npm run build
pm2 restart blockstr
```

### Rotate Private Key

If you need to rotate the private key:

1. Generate new keypair
2. Update environment variable
3. Restart server
4. Update `blockstrPubkey` in `gameConfig.ts`
5. Redeploy

## Production Recommendations

### 1. Use a Reverse Proxy

Use Nginx or Caddy to:
- Handle HTTPS/TLS
- Serve static files efficiently
- Add rate limiting
- Enable gzip compression

### 2. Set Up Monitoring

Use tools like:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar
- **Server monitoring**: Datadog, New Relic
- **Log aggregation**: Papertrail, Loggly

### 3. Enable Rate Limiting

Add rate limiting to prevent abuse:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 4. Add Request Validation

Enhance validation in `server.js`:
- Check score is reasonable for duration
- Verify session exists
- Rate limit per player pubkey
- Store and validate game replays

### 5. Set Up Backups

Backup critical data:
- Private key (offline, encrypted)
- Score database (if implemented)
- Server configuration
- SSL certificates

## Support

For deployment issues:
- Check server logs first
- Verify environment variables
- Test locally with `npm run dev` then `npm run build && npm start`
- Open an issue on GitHub with logs

---

**Remember**: The private key should NEVER be committed to version control or exposed in client-side code. Always use environment variables for secrets.
