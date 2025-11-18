# Blockstr Payment System

## Overview

Blockstr now uses Lightning Network zaps via Nostr to enable pay-to-play functionality. Players must zap the Blockstr account to start a game.

## Configuration

All payment settings are centralized in `/src/config/gameConfig.ts`:

```typescript
{
  costToPlay: 210,              // Fee in satoshis (210 sats)
  zapMemo: "⚡ Blockstr - Bitcoin-Powered Tetris ⚡",  // Default zap message
  freePlayEnabled: true,        // Toggle free play for testing
  blockstrPubkey: "c70f..."     // Blockstr account to receive zaps
}
```

### Configuration Options

- **`costToPlay`**: Amount in satoshis required to play (default: 210 sats)
- **`zapMemo`**: Default message included with zaps (customizable by players)
- **`freePlayEnabled`**: Set to `false` in production to disable free play
- **`blockstrPubkey`**: The Nostr public key that receives gameplay payments

## Payment Flow

### For Logged-In Users

1. **Login**: User logs in with Nostr (extension or bunker)
2. **Connect Wallet**: User connects WebLN extension or NWC wallet
3. **Customize Message**: (Optional) User can customize the zap message
4. **Zap to Play**: User clicks "ZAP X SATS" button
5. **Payment Processing**: 
   - Attempts NWC payment first (if connected)
   - Falls back to WebLN (if available)
   - Shows invoice for manual payment as last resort
6. **Game Starts**: On successful payment, game begins immediately

### For Anonymous Users

1. **No Login**: User can skip login
2. **Play Anonymously**: Creates temporary throwaway keypair
3. **Free Play**: Game starts without payment (if `freePlayEnabled: true`)
4. **Scores**: Anonymous scores are not published to Nostr

## Wallet Integration

### Supported Wallets

- **WebLN**: Browser extensions (Alby, Mutiny, etc.)
- **NWC (Nostr Wallet Connect)**: Remote wallet connections
  - Alby Account
  - Mutiny Wallet
  - Any NWC-compatible wallet

### Wallet Setup

Players can connect wallets via the "CONNECT WALLET" button in the payment gate:

1. Click "Connect Wallet"
2. Choose WebLN (auto-detected) or add NWC connection
3. For NWC: Paste connection string from wallet
4. Wallet becomes active for zap payments

## Testing

### Development Mode

Set `freePlayEnabled: true` in `gameConfig.ts` to enable free play for testing without real payments.

### Production Mode

Set `freePlayEnabled: false` to require payment for all gameplay.

## Payment States

### Payment Gate States

1. **Not Logged In**: Shows login area + anonymous play button
2. **Logged In, No Wallet**: Shows wallet connection warning
3. **Logged In, Wallet Connected**: Shows zap button + optional free play
4. **Processing Payment**: Disables buttons, shows loading state
5. **Invoice Generated**: Shows QR code and copy button for manual payment

### Error Handling

- **No wallet**: Prompts user to connect wallet
- **Payment failed**: Shows error toast, allows retry
- **Invoice fallback**: If automatic payment fails, shows invoice for manual payment
- **Network errors**: Displays user-friendly error messages

## Implementation Details

### Zap Integration

The payment system uses the existing `useZaps` hook with the following flow:

```typescript
// Create mock event for Blockstr account
const blockstrEvent: NostrEvent = {
  id: 'blockstr-payment',
  pubkey: gameConfig.blockstrPubkey,
  // ...
};

// Use zaps hook
const { zap, isZapping, invoice } = useZaps(
  blockstrEvent,
  webln,
  activeNWC,
  onPaymentComplete  // Success callback
);

// Send zap
await zap(gameConfig.costToPlay, customMemo);
```

### Custom Memo

Players can customize the zap message before payment. The default message is configurable in `gameConfig.zapMemo`.

### Gamepad Support

Payment gate supports gamepad navigation:
- D-Pad/Stick: Navigate between buttons
- A Button: Confirm payment or start free play

## Future Enhancements

Potential improvements for the payment system:

- [ ] Payment verification via zap receipts
- [ ] Discount codes or promotional pricing
- [ ] Subscription model for unlimited plays
- [ ] Leaderboard entry fees for tournaments
- [ ] Refund mechanism for failed games
- [ ] Multiple payment tiers (casual vs competitive)

## Security Considerations

- Payments are processed via established Lightning protocols (WebLN, NWC)
- No private keys are stored or transmitted
- Zaps are signed by user's Nostr signer
- Payment verification happens via Nostr zap receipts (kind 9735)
- Anonymous users cannot publish scores (prevents spam)

## Troubleshooting

### "No Wallet Connected" Warning

**Solution**: Click "Connect Wallet" and set up WebLN extension or NWC connection

### Payment Fails Silently

**Solution**: Check browser console for errors, ensure wallet has sufficient balance

### Invoice Not Paying Automatically

**Solution**: Copy invoice and pay manually in Lightning wallet, or try different wallet

### Free Play Not Available

**Solution**: Check `gameConfig.freePlayEnabled` is set to `true` for testing
