#!/bin/bash

echo "🎮 Starting Blockstr Development Servers"
echo ""
echo "This will start:"
echo "  • Express API Server (port 3000) - handles /api/sign-score"
echo "  • Vite Dev Server (port 8080) - serves React frontend"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Creating from .env.example..."
    cp .env.example .env
    echo ""
    echo "❗ Please edit .env and add your BLOCKSTR_NSEC before continuing"
    echo "   Then run: npm run dev"
    exit 1
fi

# Check if BLOCKSTR_NSEC is set
if ! grep -q "BLOCKSTR_NSEC=nsec1" .env; then
    echo "⚠️  Warning: BLOCKSTR_NSEC not configured in .env"
    echo "   Score signing will not work!"
    echo ""
    echo "   Please add your private key to .env:"
    echo "   BLOCKSTR_NSEC=nsec1..."
    echo ""
fi

echo "✓ Starting servers..."
echo ""

npm run dev
