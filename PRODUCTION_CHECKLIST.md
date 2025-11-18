# Production Deployment Checklist

Before deploying Blockstr to production, ensure these settings are configured:

## Payment Configuration

### 1. Disable Free Play

In `src/config/gameConfig.ts`, set:

```typescript
freePlayEnabled: false  // Disable free play in production
```

This ensures all players must pay to play.

### 2. Verify Payment Amount

Confirm the payment amount is set correctly:

```typescript
costToPlay: 210  // 210 satoshis per game
```

### 3. Customize Zap Message

Update the default zap message if desired:

```typescript
zapMemo: "⚡ Blockstr - Bitcoin-Powered Tetris ⚡"
```

Players can customize this message before paying, but this is the default.

### 4. Verify Blockstr Pubkey

Ensure the Blockstr account pubkey is correct:

```typescript
blockstrPubkey: "c70f635895bf0cade4f4c80863fe662a1d6e72153c9be357dc5fa5064c3624de"
```

This is the account that will receive all gameplay payments.

## Server Configuration

### 1. Set Environment Variables

Create a `.env` file with:

```bash
# REQUIRED: Blockstr's private key for signing score events
BLOCKSTR_NSEC=nsec1your_actual_private_key_here

# Optional: Server port
PORT=3000

# Optional: Node environment
NODE_ENV=production
```

⚠️ **Security**: Never commit the `.env` file to version control!

### 2. Verify Server Setup

Ensure the Express server is running for score signing:

```bash
npm run dev:server  # Development
# or
node server.js      # Production
```

The server must be accessible at the configured port for score publishing to work.

## Testing Before Launch

### 1. Test Payment Flow

1. Set `freePlayEnabled: true` temporarily
2. Test the complete flow:
   - Login with Nostr
   - Connect WebLN or NWC wallet
   - Attempt to zap (should work with test wallet)
   - Verify game starts on successful payment
3. Test anonymous play flow
4. Verify error handling (no wallet, payment failure, etc.)

### 2. Test Score Publishing

1. Play a complete game
2. Verify mempool score accumulates
3. Wait for Bitcoin block (or simulate)
4. Verify mined score transfers
5. Check that score is published to Nostr
6. Verify score appears on gamestr.io

### 3. Test Wallet Integration

- **WebLN**: Test with Alby or other WebLN extension
- **NWC**: Test with at least one NWC wallet connection
- **Fallback**: Test manual invoice payment
- **Multiple Wallets**: Test switching between wallets

## Post-Deployment

### 1. Monitor Payments

- Watch for incoming zaps to the Blockstr pubkey
- Verify zap receipts (kind 9735) are being published
- Check that amounts match `costToPlay` setting

### 2. Monitor Errors

- Check server logs for payment failures
- Monitor client-side errors in browser console
- Track failed zap attempts

### 3. User Feedback

- Monitor for user reports of payment issues
- Check if users can successfully connect wallets
- Verify game starts immediately after payment

## Rollback Plan

If payment issues occur in production:

### Quick Fix: Enable Free Play

```typescript
// In src/config/gameConfig.ts
freePlayEnabled: true  // Temporarily enable free play
```

Rebuild and redeploy:

```bash
npm run build
```

### Investigation Steps

1. Check server logs for errors
2. Verify Blockstr pubkey is correct
3. Test zap flow manually
4. Check wallet connection status
5. Verify Lightning address is configured

## Configuration Quick Reference

```typescript
// src/config/gameConfig.ts
export const gameConfig: GameConfig = {
  // ... other settings ...
  
  // Payment settings for production
  costToPlay: 210,                                          // 210 sats
  zapMemo: "⚡ Blockstr - Bitcoin-Powered Tetris ⚡",      // Default message
  freePlayEnabled: false,                                   // MUST be false in production
  blockstrPubkey: "c70f635895bf0cade4f4c80863fe662a1d6e72153c9be357dc5fa5064c3624de",
};
```

## Support Resources

- **Payment System Documentation**: See `PAYMENT_SYSTEM.md`
- **Deployment Guide**: See `DEPLOYMENT.md`
- **Troubleshooting**: Check browser console and server logs
- **Testing**: Use `freePlayEnabled: true` for development/testing only
