# Abstract

This NIP defines a standardized way to publish game scores on Nostr, allowing any game to record and share player achievements in a decentralized manner.

# Motivation

Gaming applications need a standardized way to publish scores that can be:
- Verified and preserved across different clients
- Queried and aggregated by leaderboard applications
- Shared by players across social networks
- Used for competitive gaming and tournaments

# Event Format

Game scores are published using kind `762` events with the following structure:

```json
{
  "kind": 762,
  "content": "",
  "tags": [
    ["d", "<unique-game-session-id>"],
    ["game", "<game-identifier>"],
    ["score", "<numerical-score>"],
    ["player", "<player-pubkey-hex>"],
    ["difficulty", "<difficulty-level>"],
    ["duration", "<game-duration-seconds>"],
    ["version", "<game-version>"],
    ["genre", "2d-platform","retro"],
    ["alt", "Game score: <score> in <game-name>"]
  ]
}
```

# Required Tags

- `d`: Unique identifier for this game session
- `game`: Unique identifier for the specific game (e.g., "blockstr", "tetris", "chess")
- `score`: Numerical score achieved (as string)
- `player`: Hex-encoded public key of the player who achieved this score

# Optional Tags

- `difficulty`: Difficulty level or mode (e.g., "easy", "hard", "level-5")
- `duration`: Game duration in seconds (as string)
- `version`: Version of the game client
- `genre`: Game genre tags for categorization (e.g. "retro", "puzzle")
- `alt`: Human-readable description per NIP-31

# Implementation Notes

## Score Verification
Games should implement score verification mechanisms appropriate to their type:
- Cryptographic proofs for deterministic games
- Replay data for verification
- Anti-cheat measures for competitive games

## Privacy
Players can choose to publish scores from their own keys or allow games to publish on their behalf. Anonymous scores can be published using ephemeral keys.

## Querying Scores
Applications can query scores using standard Nostr filters:

```javascript
// Get all scores for a specific game
{ kinds: [762], "#game": ["blockstr"], limit: 100 }

// Get scores for a specific player
{ kinds: [762], "#player": ["<pubkey-hex>"], limit: 50 }

// Get high scores with minimum threshold
{ kinds: [762], "#game": ["blockstr"], "#score": [">1000"], limit: 10 }
```
