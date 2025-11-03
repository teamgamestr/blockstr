# Blockstr - Bitcoin-Powered Tetris

## Overview

Blockstr is a unique twist on the classic Tetris game that integrates with the Bitcoin network and Nostr protocol. The game speed increases every time a new Bitcoin block is found, creating a dynamic gaming experience tied to the Bitcoin blockchain.

**Current Status**: Fully functional web application running on Replit

**Last Updated**: November 2, 2025

## Project Architecture

### Tech Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 6.3.5
- **Styling**: TailwindCSS with custom retro 8-bit aesthetic
- **UI Components**: Radix UI components library
- **Bitcoin Integration**: Mempool.js for real-time block detection
- **Nostr Integration**: nostr-tools and @nostrify packages for decentralized social features
- **Lightning Payments**: WebLN and Alby SDK for payment processing
- **State Management**: React hooks and TanStack React Query

### Project Structure
```
src/
├── components/       # React components (UI, game, auth, comments)
├── config/          # Game configuration (gameConfig.ts)
├── contexts/        # React contexts for state management
├── hooks/           # Custom React hooks for game logic, Nostr, Bitcoin, etc.
├── lib/            # Utility functions and polyfills
├── pages/          # Route pages (Index, NIP19Page, NotFound)
├── types/          # TypeScript type definitions
└── main.tsx        # Application entry point
```

### Key Features
- Bitcoin block integration that affects game speed
- Nostr protocol integration for decentralized score sharing
- Lightning Network payments (with demo mode)
- Retro 8-bit visual design with pixel-perfect graphics
- Progressive Web App capabilities
- Social features (comments, zaps, reactions)

## Development Environment

### Workflow Configuration
- **Name**: dev
- **Command**: `npm run dev`
- **Port**: 5000 (frontend webview)
- **Host**: 0.0.0.0 (configured for Replit proxy)

### Build Scripts
- `npm run dev` - Start development server with HMR
- `npm run build` - Production build
- `npm test` - Run TypeScript checks, linting, tests, and build
- `npm run deploy` - Build and deploy to Nostr network

### Dependencies
All dependencies are managed via npm and defined in package.json. The project includes:
- React ecosystem (react, react-dom, react-router-dom)
- Nostr tools (@nostrify/nostrify, nostr-tools)
- Bitcoin integration (mempool.js)
- Lightning payments (@getalby/sdk, webln)
- UI components (Radix UI, lucide-react)
- Form handling (react-hook-form, zod)
- Styling (tailwindcss, class-variance-authority)

## Configuration Notes

### Vite Configuration
The vite.config.ts is configured for Replit environment:
- Server host: `0.0.0.0` (allows Replit proxy access)
- Server port: `5000` (Replit webview port)
- HMR client port: `443` (for secure WebSocket connections)
- API proxy: `/api` requests forwarded to backend on port 3000
- Path aliases configured (`@` → `./src`)
- ES modules support with proper `__dirname` polyfill

### Backend Server
The server.js Express backend provides:
- **Score signing endpoint** (`POST /api/sign-score`): Signs game scores with Blockstr's private key
- **Static file serving**: Serves the built React app from the dist folder
- **SPA routing support**: Handles client-side routing for the React app
- **Environment validation**: Checks for BLOCKSTR_NSEC environment variable
- **Port**: Runs on port 3000 (localhost only, proxied by Vite in dev)

### Game Configuration
Core game settings in `/src/config/gameConfig.ts`:
- Initial speed and acceleration rates
- Scoring multipliers and bonus chances
- Payment amounts and Lightning settings
- Board dimensions and visual settings
- Game identity and versioning

## Nostr Integration Details

### Custom NIP (Nostr Improvement Proposal)
Implements **Kind 762** for game scores with tags:
- `p` (player), `game`, `score`, `difficulty`, `duration`, `version`, `genre`
- Enables decentralized leaderboards
- Cryptographic verification of game completion

### Authentication
- Anonymous play with temporary keypairs
- Nostr extension support (NIP-07)
- Nsec bunker support (NIP-46)
- Profile management and editing

## Bitcoin & Lightning Features

### Block Detection
- Real-time connection to mempool.space API
- Automatic speed increases on new blocks
- Toast notifications for block events
- Block survival statistics

### Payment System
- WebLN browser wallet integration
- Nostr Wallet Connect (NWC) support
- Pay-to-play with Lightning Network
- Free demo mode available

## Recent Changes

### November 3, 2025
- **Fixed deployment configuration**: Resolved Git merge conflict markers in vite.config.ts
- **Updated deployment settings**: Changed deployment to use `node server.js` instead of static file server
- **Configured API proxy**: Added Vite proxy for `/api` endpoints to backend server on port 3000
- **Backend integration**: Server.js provides secure score signing via `/api/sign-score` endpoint
- **Production build verified**: Build process completes successfully with all assets

### November 2, 2025
- Initial Replit environment setup
- Configured Vite for Replit hosting (port 5000, host 0.0.0.0)
- Fixed ES module configuration for `__dirname` polyfill
- Set up development workflow with webview output
- Installed all npm dependencies
- Verified application runs successfully

## User Preferences

None documented yet.

## Notes

- This is a Progressive Web App (PWA) with offline capabilities
- The project uses Press Start 2P font for authentic retro aesthetic
- Supports both desktop and mobile gameplay
- All game scores are published to the decentralized Nostr network
- No central game servers required - fully decentralized
