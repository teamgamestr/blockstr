# Blockstr - Quick Start Guide

## 🚀 Get Running in 3 Steps

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your private key
# BLOCKSTR_NSEC=nsec1your_private_key_here
```

**Don't have a keypair?** Generate one:
```bash
npx nostr-tools generate-keypair
```

### 3️⃣ Start Development Servers

```bash
npm run dev
```

✅ This starts **both** servers:
- Express API (port 3000) - handles score signing
- Vite Dev (port 8080) - React frontend

Open **http://localhost:8080** in your browser.

---

## ⚠️ Common Mistakes

### ❌ Don't Do This
```bash
vite              # Only starts frontend, API won't work!
npm run dev:vite  # Same problem
```

### ✅ Always Do This
```bash
npm run dev       # Starts BOTH servers
```

---

## 🔍 How to Know It's Working

### Terminal Output Should Show:

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

See both `[API]` and `[VITE]` prefixes? ✅ You're good!

**Note**: If you don't see any output, check that you're running `npm run dev` and not just `vite`.

### When You Save a Score:

**Terminal:**
```
[VITE] → Proxying: POST /api/sign-score → http://localhost:3000
[API]  Signed score event: abc123... for player: def456...
```

**Browser Console:**
```
Requesting server to sign score...
Server signed score successfully
Publishing signed event to relays...
Score published to relays successfully
```

---

## 🐛 Something Wrong?

### Error: "Server rejected score: Not Found"
**Fix:** You're only running Vite. Stop it and run `npm run dev`.

### Error: "http proxy error: /api/sign-score"
**Fix:** Express server isn't running. Run `npm run dev`.

### Error: "BLOCKSTR_NSEC environment variable not set"
**Fix:** Add your private key to `.env` file.

### Port Already in Use
**Fix:**
```bash
# Kill the process using the port
lsof -i :3000
kill -9 <PID>

# Or change the port in .env
PORT=3001
```

**More help?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 📝 Useful Commands

```bash
# Development
npm run dev          # Start both servers (API + frontend)
npm run dev:server   # Start only API server
npm run dev:vite     # Start only Vite server

# Production
npm run build        # Build for production
npm start            # Start production server

# Testing
npm test             # Run all tests

# Deployment
npm run deploy       # Build and deploy to Nostr
```

---

## 🎮 Play the Game

1. Open http://localhost:8080
2. Click "Log in with Nostr" (or play anonymously)
3. Click "Start Game" (demo mode is free)
4. Use arrow keys or WASD to play
5. After game over, click "SAVE SCORE TO NOSTR"

---

## 📚 Documentation

- **[README.md](README.md)** - Full project overview
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Detailed troubleshooting
- **[Score-NIP.md](Score-NIP.md)** - Game score protocol spec

---

## 🆘 Need Help?

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Read error messages carefully (they tell you what's wrong!)
3. Verify both servers are running: `ps aux | grep node`
4. Check logs in terminal and browser console
5. Open a GitHub issue with error details

---

## 🔐 Security Note

**Never commit `.env` file!** It contains your private key.

The `.gitignore` already excludes it, but double-check:
```bash
cat .gitignore | grep .env
```

Should show: `.env`

---

## ✨ Tips

- **Use the helper script**: `./start-dev.sh` checks everything for you
- **Watch the terminal**: Colored output shows which server is logging
- **Hot reload works**: Edit React code and see changes instantly
- **API changes need restart**: Changes to `server.js` require restarting

---

**Ready to build?** See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment.

**Found a bug?** Open an issue on GitHub.

**Want to contribute?** Pull requests welcome!

---

Made with ⚡ and 🎮 by the Blockstr team
