# Abstract

This NIP defines a standardized way to publish game scores on Nostr, allowing any game to record and share player achievements in a decentralized manner.

# Motivation

Gaming applications need a standardized way to publish scores that can be:
- Verified and preserved across different clients
- Queried and aggregated by leaderboard applications
- Shared by players across social networks
- Used for competitive gaming and tournaments

# Event Format

Game scores are published using kind `30762` events with the following structure:

```json
{
  "kind": 30762,
  "content": "",
  "tags": [
    ["p", "<player-pubkey-hex>"],
    ["game", "<game-identifier>"],
    ["score", "<numerical-score>"],
    ["state", "<score-state>"],
    ["difficulty", "<difficulty-level>"],
    ["duration", "<game-duration-seconds>"],
    ["version", "<game-version>"],
    ["alt", "Game score: <score> in <game-name>"]
  ]
}
```

# Required Tags

- `d`: Unique identifier for this score to enable in-game updates to the score.
- `p`: Hex-encoded public key of the player who achieved this score
- `game`: Unique identifier for the specific game (e.g., "blockstr", "tetris", "chess")
- `score`: Numerical score achieved (as string)

# Optional Tags

- `state`: The score state (i.e live, final, half-time). Clients shall interpret no state as final.
- `match`: Unique identifier for this game session / match. Can be used to reference individually published scores in a multiplayer match
- `difficulty`: Difficulty level or mode (e.g., "easy", "hard", "level-5")
- `duration`: Game duration in seconds (as string)
- `version`: Version of the game client
- `referee`: Hex-encoded public key of the person that refereed the match
- `alt`: Human-readable description per NIP-31

# Implementation Notes

## Event Signing

Score events (kind 30762) **MUST be signed by the game provider**, not the player. This provides:
- **Anti-cheat verification**: Game controls score authenticity
- **Consistent identity**: All scores from a game share the same pubkey
- **Trust model**: Players trust the game provider to accurately record scores

The player is referenced in the `p` tag. Players can then:
- Share scores in kind 1 posts (signed by player)
- Reference score events with `e` tags
- Query their own scores by filtering on the `p` tag

### Secure Key Management

Game providers should use NIP-46 (Nostr Connect) bunkers or server-side signing:
- **NIP-46 Bunker**: Remote signer holds game's private key
- **Server-side API**: Backend signs events, key stored in environment variables
- **Never expose** game's private key to client-side code

## Score Verification

Games should implement score verification mechanisms appropriate to their type:
- Cryptographic proofs for deterministic games
- Replay data for verification
- Anti-cheat measures for competitive games
- Server-side validation before signing

## Privacy

Players maintain privacy through:
- Pseudonymous pubkeys in `p` tags
- Optional anonymous play with ephemeral keys
- Player-controlled social sharing (kind 1 posts)

## Querying Scores
Applications can query scores using standard Nostr filters:

```javascript
// Get all scores for a specific game
{ kinds: [30762], "#game": ["blockstr"], limit: 100 }

// Get scores for a specific player
{ kinds: [30762], "#player": ["<pubkey-hex>"], limit: 50 }

// Get high scores with minimum threshold
{ kinds: [30762], "#game": ["blockstr"], "#score": [">1000"], limit: 10 }
```
