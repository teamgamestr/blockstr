# Conference Mode

Conference mode is designed for public displays, kiosks, and conference booths where Blockstr is running on a shared device.

## Accessing Conference Mode

Navigate to `/conference` to access the conference login page with simplified login options.

**URL**: `https://your-domain.com/conference`

## Features

The conference page displays three prominent login options:

### 1. **QR Code Login (Bunker)**
- Large QR code displayed on the main screen
- **Auto-regenerates every 5 minutes** for security (configurable)
- **Regenerates after each successful login** for the next user
- Users scan with their mobile Nostr signer app (Amber, nsec.app, etc.)
- Supports NIP-46 remote signing
- Secure - private keys never leave the user's device

### 2. **NIP-05 Login**
- Users enter their Nostr address (e.g., `name@domain.com`)
- System verifies the NIP-05 identifier
- Scores are linked to the verified pubkey
- No signing capability (read-only mode)
- Perfect for quick play while maintaining identity

### 3. **Anonymous Play**
- Play without any login
- Generates a temporary keypair
- Scores not linked to any identity
- Good for casual players

## Setup for Conferences

Simply direct users to the `/conference` URL. No configuration changes needed!

## How It Works

### QR Code Bunker Login
1. A temporary client keypair is generated
2. A `nostrconnect://` URI is created with connection parameters
3. QR code is displayed on screen
4. User scans with their Nostr signer app
5. The signer sends a NIP-46 connection response
6. Game authenticates the connection
7. User can play with their identity
8. After login, QR regenerates automatically for the next user (2 second delay)
9. QR also regenerates every 5 minutes for security (configurable)

### NIP-05 Login
1. User enters their NIP-05 identifier (e.g., `alice@example.com`)
2. System fetches `https://example.com/.well-known/nostr.json?name=alice`
3. Extracts the pubkey from the response
4. Creates a temporary session with the verified pubkey
5. Scores are attributed to the verified pubkey
6. User plays without needing to sign events

### Anonymous Play
1. Generates a temporary keypair
2. User plays with no identity tracking
3. Scores are not linked to any pubkey

## Use Cases

- **Conferences**: Display at booths, let attendees play and compete
- **Kiosks**: Public installations where people can walk up and play
- **Demos**: Show off the game without complex login flows
- **Arcades**: Physical arcade cabinets with Nostr integration

## Security Considerations

- **QR Code Login**: Most secure - private keys never exposed
  - QR codes expire and regenerate every 5 minutes
  - New QR generated after each successful login
  - Prevents QR code reuse or stale connections
- **NIP-05 Login**: Medium security - read-only access, no signing
- **Anonymous**: No security - temporary identity

## QR Code Login

The "Show QR Code" button opens a dialog with a scannable QR code. This uses the same proven bunker login flow as the standard login, ensuring reliability.

## UI/UX

In conference mode:
- Login options are displayed prominently on the main screen
- Large, easy-to-scan QR code (auto-refreshes periodically)
- Clear instructions for each login method
- Retro gaming aesthetic maintained throughout
- Mobile-friendly for QR scanning
- Clean, distraction-free interface

## Standard vs Conference Mode

- **Standard mode** (`/`): Compact login area integrated into the payment gate
- **Conference mode** (`/conference`): Full-screen login options optimized for kiosks and public displays

Both modes use the same underlying authentication system, ensuring consistent reliability.
