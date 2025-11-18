import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGamepadMenu } from '@/hooks/useGamepadMenu';
import { useWallet } from '@/hooks/useWallet';
import { useZaps } from '@/hooks/useZaps';
import { useToast } from '@/hooks/useToast';
import { gameConfig } from '@/config/gameConfig';
import { Coins, Zap, Play, Wallet as WalletIcon } from 'lucide-react';
import { LoginArea } from '@/components/auth/LoginArea';
import { WalletModal } from '@/components/WalletModal';
import type { Event as NostrEvent } from 'nostr-tools';

interface PaymentGateProps {
  onPaymentComplete: () => void;
  className?: string;
}

export function PaymentGate({ onPaymentComplete, className }: PaymentGateProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedButton, setSelectedButton] = useState(0); // 0: Pay, 1: Free Play
  const [customMemo, setCustomMemo] = useState(gameConfig.zapMemo);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { webln, activeNWC } = useWallet();

  const payButtonRef = useRef<HTMLButtonElement>(null);
  const freePlayButtonRef = useRef<HTMLButtonElement>(null);

  // Create a mock event for the Blockstr account to zap to
  const blockstrEvent: NostrEvent = {
    id: 'blockstr-payment',
    pubkey: gameConfig.blockstrPubkey,
    created_at: Math.floor(Date.now() / 1000),
    kind: 0,
    tags: [],
    content: '',
    sig: '',
  };

  const { zap, isZapping, invoice, resetInvoice } = useZaps(
    blockstrEvent,
    webln,
    activeNWC,
    () => {
      // On successful zap
      toast({
        title: 'Payment successful!',
        description: 'Starting game...',
      });
      onPaymentComplete();
    }
  );

  // Focus the selected button
  useEffect(() => {
    const buttons = gameConfig.freePlayEnabled ? [payButtonRef, freePlayButtonRef] : [payButtonRef];
    const currentButton = buttons[selectedButton]?.current;
    if (currentButton) {
      currentButton.focus();
    }
  }, [selectedButton]);

  // Gamepad controls for payment gate
  useGamepadMenu({
    onConfirm: () => {
      if (user) {
        if (selectedButton === 0) handlePayment();
        else if (gameConfig.freePlayEnabled) handleFreePlay();
      } else {
        handleFreePlay();
      }
    },
    onNavigateUp: () => {
      if (user && gameConfig.freePlayEnabled) setSelectedButton(0);
    },
    onNavigateDown: () => {
      if (user && gameConfig.freePlayEnabled) setSelectedButton(1);
    },
    enabled: !isProcessing && !isZapping,
  });

  const handlePayment = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to pay with Lightning.',
        variant: 'destructive',
      });
      return;
    }

    if (!webln && !activeNWC) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect a Lightning wallet to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Reset any previous invoice
      resetInvoice();

      // Send zap to Blockstr account
      await zap(gameConfig.costToPlay, customMemo);

      // If we get here and there's an invoice, it means automatic payment failed
      // The user will need to pay manually via the invoice
      if (invoice) {
        toast({
          title: 'Manual payment required',
          description: 'Please pay the invoice to continue.',
        });
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreePlay = () => {
    // For anonymous users or when free play is enabled
    onPaymentComplete();
  };

  // Show invoice payment UI if an invoice was generated
  if (invoice) {
    return (
      <div className={className}>
        <Card className="bg-black border-yellow-500 border-2">
          <CardHeader className="text-center">
            <CardTitle className="font-retro text-2xl text-yellow-400">
              PAY INVOICE
            </CardTitle>
            <CardDescription className="font-retro text-sm text-gray-400">
              Scan QR code or copy invoice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white rounded">
              {/* QR code would go here - for now just show the invoice */}
              <div className="text-xs break-all text-black font-mono">
                {invoice}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(invoice);
                  toast({
                    title: 'Copied!',
                    description: 'Invoice copied to clipboard',
                  });
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 font-retro"
              >
                COPY INVOICE
              </Button>
              <Button
                onClick={() => {
                  resetInvoice();
                  setIsProcessing(false);
                }}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 font-retro"
              >
                CANCEL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="bg-black border-green-500 border-2">
        <CardHeader className="text-center">
          <CardTitle className="font-retro text-2xl text-green-400 flex items-center justify-center gap-2">
            <Zap className="w-8 h-8" />
            BLOCKSTR
          </CardTitle>
          <CardDescription className="font-retro text-sm text-gray-400">
            Bitcoin-Powered Tetris
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!user ? (
            <div className="text-center space-y-4">
              <div className="text-sm text-gray-300 font-retro">
                Login to zap and play or continue anonymously
              </div>
              <LoginArea className="max-w-60 mx-auto" />
              <Button
                ref={freePlayButtonRef}
                onClick={handleFreePlay}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-retro focus:ring-2 focus:ring-gray-400"
              >
                <Play className="w-4 h-4 mr-2" />
                PLAY ANONYMOUSLY
              </Button>
              <div className="text-center text-xs text-gray-600 font-retro">
                🎮 Press A button to start
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg font-retro text-white mb-2">Ready to Play!</div>
                <div className="text-sm text-gray-400">
                  Zap {gameConfig.costToPlay} sats to start
                </div>
              </div>

              {/* Wallet connection status */}
              {!webln && !activeNWC && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-600 rounded text-center">
                  <p className="text-xs text-yellow-400 font-retro mb-2">
                    ⚠️ NO WALLET CONNECTED
                  </p>
                  <WalletModal>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/30 font-retro"
                    >
                      <WalletIcon className="w-3 h-3 mr-2" />
                      CONNECT WALLET
                    </Button>
                  </WalletModal>
                </div>
              )}

              {/* Custom memo input */}
              <div className="space-y-2">
                <Label htmlFor="memo" className="text-xs text-gray-400 font-retro">
                  ZAP MESSAGE (OPTIONAL)
                </Label>
                <Input
                  id="memo"
                  value={customMemo}
                  onChange={(e) => setCustomMemo(e.target.value)}
                  placeholder={gameConfig.zapMemo}
                  className="bg-gray-900 border-gray-700 text-white font-retro text-xs"
                />
              </div>

              <div className="grid gap-3">
                <Button
                  ref={payButtonRef}
                  onClick={handlePayment}
                  disabled={isProcessing || isZapping || (!webln && !activeNWC)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-retro focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {isProcessing || isZapping ? 'PROCESSING...' : `ZAP ${gameConfig.costToPlay} SATS`}
                </Button>

                {gameConfig.freePlayEnabled && (
                  <Button
                    ref={freePlayButtonRef}
                    onClick={handleFreePlay}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 font-retro focus:ring-2 focus:ring-gray-400"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    PLAY FREE (DEMO)
                  </Button>
                )}
              </div>

              <div className="text-center text-xs text-gray-600 font-retro">
                🎮 Use D-Pad/Stick + A button
              </div>
            </div>
          )}

          <div className="text-xs text-center space-y-2 text-gray-500 border-t border-gray-700 pt-4">
            <div>🎮 Speed increases with Bitcoin blocks</div>
            <div>⭐ Bonus blocks give 10x points</div>
            <div>📈 Scores published to Nostr</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}