import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { finalizeEvent } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { nip19 } from 'nostr-tools';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Check for required environment variables on startup
function checkEnvironment() {
  if (!process.env.BLOCKSTR_NSEC) {
    console.error('');
    console.error('❌ CRITICAL: Missing required environment variable: BLOCKSTR_NSEC');
    console.error('');
    console.error('Please set the following environment variable:');
    console.error('');
    console.error('  BLOCKSTR_NSEC=nsec1... (or hex private key)');
    console.error('');
    console.error('Score signing will not work without this configuration.');
    console.error('');

    if (process.env.NODE_ENV === 'production') {
      console.error('Production mode: Exiting...');
      process.exit(1);
    } else {
      console.error('Development mode: Continuing anyway...');
    }
  } else {
    console.log('✓ Environment variables configured correctly');
  }
}

checkEnvironment();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// API endpoint for signing scores
app.post('/api/sign-score', async (req, res) => {
  console.log('Received sign-score request:', JSON.stringify(req.body, null, 2));

  try {
    const { sessionId, playerPubkey, score, difficulty, duration, blocks } = req.body;

    // Validate request data
    if (!sessionId || !playerPubkey || typeof score !== 'number') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate score is not negative
    if (score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    // Validate pubkey format (64 character hex)
    if (!/^[0-9a-f]{64}$/i.test(playerPubkey)) {
      return res.status(400).json({ error: 'Invalid pubkey format' });
    }

    // Validate duration is reasonable
    if (duration < 0 || duration > 86400) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    // Get private key from environment variable
    const nsecOrHex = process.env.BLOCKSTR_NSEC;
    if (!nsecOrHex) {
      console.error('BLOCKSTR_NSEC environment variable not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Convert nsec to bytes if needed
    let privateKeyBytes;
    if (nsecOrHex.startsWith('nsec1')) {
      const decoded = nip19.decode(nsecOrHex);
      if (decoded.type !== 'nsec') {
        throw new Error('Invalid nsec format');
      }
      // decoded.data is already a Uint8Array
      privateKeyBytes = decoded.data;
    } else {
      // Assume it's hex, convert to bytes
      privateKeyBytes = hexToBytes(nsecOrHex);
    }

    // Create unsigned event
    const unsignedEvent = {
      kind: 30762,
      created_at: Math.floor(Date.now() / 1000),
      content: "",
      tags: [
        ["d", sessionId],
        ["p", playerPubkey],
        ["game", "blockstr"],
        ["score", score.toString()],
        ["state", "final"],
        ["difficulty", difficulty],
        ["duration", duration.toString()],
        ["blocks", blocks.toString()],
        ["version", "1.0.0"],
        ["genre", "puzzle"],
        ["genre", "retro"],
        ["genre", "arcade"],
        ["alt", `Game score: ${score} in blockstr`]
      ]
    };

    // Sign with Blockstr's private key
    const signedEvent = finalizeEvent(unsignedEvent, privateKeyBytes);

    console.log('Signed score event:', signedEvent.id, 'for player:', playerPubkey);

    res.json({ event: signedEvent });
  } catch (error) {
    console.error('Score signing error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to sign score',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Serve index.html for all other routes (SPA routing)
app.use((req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`  Local: http://localhost:${PORT}`);
});
