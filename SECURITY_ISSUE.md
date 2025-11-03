# 🚨 SECURITY ISSUE: Client-Side Bunker Secret

## The Problem

**Current implementation has a critical security vulnerability**: The bunker connection string with the secret token is stored in the client-side code (`gameConfig.ts`).

### Why This Is Dangerous

1. **Secret is publicly visible**: Anyone can view the source code and extract the bunker URL with secret
2. **Anyone can sign scores**: With the secret, anyone can connect to the bunker and sign fake scores
3. **No score validation**: There's no server-side validation of score legitimacy
4. **Key compromise**: If the secret leaks, you must rotate the entire bunker setup

### Example Attack

```javascript
// Attacker extracts from client code:
const bunkerUrl = "bunker://pubkey?relay=wss://relay.nsec.app&secret=2c3b19";

// Attacker creates fake score:
const fakeScore = {
  kind: 30762,
  tags: [
    ["d", "fake-session"],
    ["p", "attacker-pubkey"],
    ["score", "999999999"], // Fake high score
    // ... other tags
  ]
};

// Attacker signs with stolen bunker secret and publishes
```

## The Solution: Server-Side Signing

Move the signing logic to a backend service that validates scores before signing.

### Architecture

```
Player → Game Client → Validation API → Sign with Bunker → Publish to Nostr
                          ↓
                    Validate score is
                    legitimate before
                    signing
```

## Implementation Options

### Option 1: Serverless Function (Recommended)

Create a serverless function that validates and signs scores.

#### Setup

1. **Install dependencies**:
```bash
npm install nostr-tools @noble/hashes
```

2. **Create signing function** (`netlify/functions/sign-score.ts` or `api/sign-score.ts`):

```typescript
import { finalizeEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

interface ScoreRequest {
  sessionId: string;
  playerPubkey: string;
  score: number;
  difficulty: string;
  duration: number;
  blocks: number;
  // Include game state or replay data for validation
  gameState?: string;
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const scoreData: ScoreRequest = req.body;

    // 🔐 VALIDATION: Check if score is legitimate
    if (!validateScore(scoreData)) {
      return res.status(400).json({ error: 'Invalid score data' });
    }

    // Get private key from environment variable (NEVER in client code)
    const nsec = process.env.BLOCKSTR_NSEC;
    if (!nsec) {
      throw new Error('BLOCKSTR_NSEC not configured');
    }

    // Create unsigned event
    const event = {
      kind: 30762,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: [
        ["d", scoreData.sessionId],
        ["p", scoreData.playerPubkey],
        ["game", "blockstr"],
        ["score", scoreData.score.toString()],
        ["state", "final"],
        ["difficulty", scoreData.difficulty],
        ["duration", scoreData.duration.toString()],
        ["blocks", scoreData.blocks.toString()],
        ["version", "1.0.0"],
        ["genre", "puzzle"],
        ["genre", "retro"],
        ["genre", "arcade"],
        ["alt", `Game score: ${scoreData.score} in blockstr`]
      ]
    };

    // Sign with Blockstr's private key (server-side only)
    const privateKeyBytes = hexToBytes(nsec.replace('nsec1', '')); // or use nip19.decode
    const signedEvent = finalizeEvent(event, privateKeyBytes);

    return res.status(200).json({ event: signedEvent });
  } catch (error) {
    console.error('Score signing error:', error);
    return res.status(500).json({ error: 'Failed to sign score' });
  }
}

// Validation logic
function validateScore(data: ScoreRequest): boolean {
  // Basic validation
  if (!data.sessionId || !data.playerPubkey || data.score < 0) {
    return false;
  }

  // Check score is reasonable (not impossibly high)
  const maxPossibleScore = data.duration * 1000; // Example: 1000 points per second max
  if (data.score > maxPossibleScore) {
    console.warn('Score too high for duration:', data);
    return false;
  }

  // TODO: Add more validation:
  // - Verify game state hash
  // - Check replay data
  // - Validate timing patterns
  // - Check for suspicious patterns

  return true;
}
```

3. **Environment variable** (`.env` - NEVER commit this):
```bash
BLOCKSTR_NSEC=nsec1your_private_key_here
```

4. **Update client code** (`useScorePublishing.ts`):

```typescript
const publishScore = useCallback(async (options: ScorePublishingOptions) => {
  if (!user) {
    throw new Error('User must be logged in to publish scores');
  }

  const { sessionId, minedScore, duration, bitcoinBlocksFound, difficulty } = options;

  console.log('Requesting server to sign score...');

  try {
    // Send score data to backend for validation and signing
    const response = await fetch('/.netlify/functions/sign-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        playerPubkey: user.pubkey,
        score: minedScore,
        difficulty,
        duration,
        blocks: bitcoinBlocksFound,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server rejected score: ${response.statusText}`);
    }

    const { event: signedEvent } = await response.json();
    console.log('Server signed score:', signedEvent);

    // Publish to relays
    await nostr.event(signedEvent);
    console.log('Score published successfully');

    return signedEvent;
  } catch (err) {
    console.error('Error publishing score:', err);
    throw err;
  }
}, [user, nostr]);
```

### Option 2: Dedicated Backend Service

For production, consider a dedicated backend:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │─────▶│   API Server │─────▶│   Nostr     │
│  (Browser)  │      │  (Node/Deno) │      │  Relays     │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Validation  │
                     │   Database   │
                     └──────────────┘
```

Benefits:
- Stronger validation (can store game sessions)
- Rate limiting per player
- Replay verification
- Anti-cheat detection
- Audit logging

### Option 3: Hybrid Approach

Use bunker for testing, server-side for production:

```typescript
const USE_SERVER_SIGNING = import.meta.env.PROD; // true in production

if (USE_SERVER_SIGNING) {
  // Use serverless function
  const response = await fetch('/api/sign-score', { ... });
} else {
  // Use bunker for local development
  const signedEvent = await blockstrSigner.signEvent(eventTemplate);
}
```

## Migration Steps

1. **Create serverless function** with signing logic
2. **Add environment variable** with nsec (server-side only)
3. **Update client code** to call API instead of bunker
4. **Remove bunker URL** from `gameConfig.ts`
5. **Test thoroughly** with validation
6. **Deploy** and monitor

## Additional Security Measures

### 1. Rate Limiting
```typescript
// Limit scores per player per hour
const rateLimit = new Map<string, number>();

function checkRateLimit(pubkey: string): boolean {
  const count = rateLimit.get(pubkey) || 0;
  if (count > 10) { // Max 10 scores per hour
    return false;
  }
  rateLimit.set(pubkey, count + 1);
  return true;
}
```

### 2. Session Validation
```typescript
// Store active game sessions
const activeSessions = new Map<string, SessionData>();

function validateSession(sessionId: string, scoreData: ScoreRequest): boolean {
  const session = activeSessions.get(sessionId);
  if (!session) return false;
  
  // Verify timing, score progression, etc.
  return session.startTime + scoreData.duration * 1000 <= Date.now();
}
```

### 3. Replay Verification
```typescript
// Include game replay data in request
interface ScoreRequest {
  // ... other fields
  replay: GameReplay; // All moves/actions
}

function validateReplay(replay: GameReplay): boolean {
  // Replay the game server-side to verify score
  const simulatedScore = simulateGame(replay);
  return simulatedScore === replay.finalScore;
}
```

## Immediate Action Required

**🚨 The current implementation is NOT production-ready due to this security issue.**

Before deploying to production:
1. ✅ Implement server-side signing
2. ✅ Remove bunker secret from client code
3. ✅ Add score validation logic
4. ✅ Implement rate limiting
5. ✅ Test thoroughly

## Questions?

- How important is score authenticity for your use case?
- Do you want to implement full replay verification?
- Should we add a leaderboard moderation system?
- What's your preferred backend infrastructure?

---

**Bottom Line**: Client-side bunker secrets are like leaving your private key in the source code. Anyone can steal it and forge scores. Server-side signing is the only secure solution for game scoring.
