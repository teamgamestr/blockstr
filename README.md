# Blockstr - Bitcoin-Powered Tetris

A unique twist on the classic Tetris game that integrates with the Bitcoin network and Nostr protocol.

## 🎮 Game Features

- **Bitcoin Block Integration**: Game speed increases every time a new Bitcoin block is found
- **Retro 8-bit Aesthetic**: Pixel-perfect graphics with classic arcade styling
- **Bonus Blocks**: 1-in-100 chance for golden bonus blocks that give 10x points
- **Progressive Difficulty**: Each Bitcoin block makes the game faster and more challenging
- **Pay-to-Play**: Lightning payments required to start a game (demo mode available)
- **Nostr Integration**: Scores published to the decentralized Nostr network
- **Social Sharing**: Share your achievements with the Nostr community

## 🚀 Technology Stack

- **React 18** with TypeScript
- **TailwindCSS** with custom retro styling
- **Nostr Protocol** for decentralized score sharing
- **Bitcoin Mempool API** for real-time block detection
- **Lightning Network** for payments (demo mode available)
- **Press Start 2P** retro pixel font

## 🎯 How to Play

1. **Login** with Nostr (browser extension or nsec bunker) or play anonymously
2. **Pay to Play** with Lightning Network (or use demo mode)
3. **Classic Tetris** controls:
   - Arrow keys or WASD for movement
   - Up arrow or W to rotate pieces
   - Down arrow or S to soft drop
   - Space bar for hard drop
   - P to pause
4. **Speed Increases** automatically when new Bitcoin blocks are found
5. **Bonus Points** for clearing lines containing golden bonus blocks (★)
6. **Share Your Score** on Nostr when the game ends

## 🔧 Configuration

Game settings are centralized in `/src/config/gameConfig.ts`:

- Initial game speed and acceleration
- Scoring multipliers and bonus chances
- Payment amounts and Lightning settings
- Board dimensions and visual settings
- Game identity and version

## 📊 Score System

Blockstr implements a custom Nostr Improvement Proposal (NIP) for game scores:

- **Kind 762**: Game score events
- **Tags**: p (player), game, score, difficulty, duration, version, genre
- **Leaderboards**: Query and rank scores across the network
- **Verification**: Cryptographic proof of game completion

## 🌐 Nostr Integration

- **Anonymous Play**: Temporary keypairs for guests
- **Score Publishing**: Permanent score records on Nostr
- **Social Sharing**: Post achievements to your Nostr feed
- **Leaderboards**: Query top scores from the network
- **Decentralized**: No central game servers required

## ⚡ Lightning Integration

- **Pay-to-Play**: Small Lightning payments to start games
- **WebLN Support**: Browser extension wallet integration
- **NWC Compatible**: Nostr Wallet Connect support
- **Demo Mode**: Free play option for testing

## 🎨 Visual Design

- **8-bit Retro**: Authentic arcade game appearance
- **Pixel Perfect**: Sharp, blocky graphics
- **Retro Font**: Press Start 2P for authentic feel
- **Color Coding**: Different piece colors and bonus indicators
- **Scanlines Effect**: Optional CRT monitor simulation
- **Responsive**: Works on desktop and mobile devices

## 🔗 Bitcoin Integration

- **Real-time Blocks**: Connects to mempool.space API
- **Speed Scaling**: Game difficulty scales with network activity
- **Block Notifications**: Toast alerts for new blocks
- **Statistics**: Track how many blocks survived during gameplay

## 🏆 Achievements

Track your progress with:
- **High Scores**: Personal and global leaderboards
- **Block Survival**: How many Bitcoin blocks you survived
- **Line Clearing**: Total lines cleared across all games
- **Bonus Points**: Points earned from golden bonus blocks
- **Time Played**: Total game duration and session times

## 📱 Progressive Web App

Blockstr is built as a PWA with:
- **Offline Play**: Core game works without internet
- **App Installation**: Add to home screen on mobile
- **Push Notifications**: New Bitcoin block alerts
- **Full Screen**: Immersive gaming experience

## 🛠️ Development

Built with the MKStack template:
- Modern React development environment
- TypeScript for type safety
- TailwindCSS for styling
- Vite for fast builds
- Comprehensive testing setup

## 🎵 Credits

- **Font**: Press Start 2P by CodeMan38
- **Inspiration**: Classic Tetris and Bitcoin community
- **APIs**: Mempool.space for Bitcoin data
- **Framework**: Vibed with MKStack

---

**Play Blockstr: Where Bitcoin blocks meet falling blocks!**

*Built on Nostr. Powered by Bitcoin. Played by everyone.*