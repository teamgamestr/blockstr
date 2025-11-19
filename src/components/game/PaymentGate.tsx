import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Coins, Zap, Play, Wallet as WalletIcon, Copy, X } from 'lucide-react';
import { LoginArea } from '@/components/auth/LoginArea';
import { WalletModal } from '@/components/WalletModal';
import QRCode from 'qrcode';
import type { Event as NostrToolsEvent } from 'nostr-tools';

interface PaymentGateProps {
  onPaymentComplete: () => void;
  className?: string;
}

export function PaymentGate({ onPaymentComplete, className }: PaymentGateProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedButton, setSelectedButton] = useState(0); // 0: Pay, 1: Free Play
  const [customMemo, setCustomMemo] = useState(gameConfig.zapMemo);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { webln, activeNWC } = useWallet();

  // Detect conference mode
  const isConferenceMode = sessionStorage.getItem('blockstr_session_origin') === '/conference';

  // Debug logging
  useEffect(() => {
    console.log('[PaymentGate] Conference mode:', isConferenceMode);
    console.log('[PaymentGate] Session origin:', sessionStorage.getItem('blockstr_session_origin'));
  }, [isConferenceMode]);

  const payButtonRef = useRef<HTMLButtonElement>(null);
  const freePlayButtonRef = useRef<HTMLButtonElement>(null);

  // Create a mock event for the Blockstr account to zap to
  const blockstrEvent: NostrToolsEvent = {
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
      // On successful zap (WebLN/NWC)
      toast({
        title: 'Payment successful!',
        description: 'Starting game...',
      });
      onPaymentComplete();
    },
    isConferenceMode // Skip automatic payment in conference mode
  );

  // Handler functions defined first
  const handlePayment = useCallback(async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to pay with Lightning.',
        variant: 'destructive',
      });
      return;
    }

    // In conference mode, skip wallet checks and go straight to invoice
    if (!isConferenceMode && !webln && !activeNWC) {
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
  }, [user, isConferenceMode, webln, activeNWC, toast, resetInvoice, zap, customMemo, invoice]);

  // Auto-generate invoice in conference mode when user is logged in
  useEffect(() => {
    if (isConferenceMode && user && !invoice && !isProcessing && !isZapping) {
      console.log('[PaymentGate] Auto-generating invoice for conference mode');
      handlePayment();
    }
  }, [isConferenceMode, user, invoice, isProcessing, isZapping, handlePayment]);

  const handleFreePlay = useCallback(() => {
    // For anonymous users or when free play is enabled
    onPaymentComplete();
  }, [onPaymentComplete]);

  // Focus the primary button when component mounts
  useEffect(() => {
    if (!user) {
      // Focus free play button for anonymous users
      setTimeout(() => {
        freePlayButtonRef.current?.focus();
      }, 100);
    } else {
      // Focus payment button for logged-in users
      setTimeout(() => {
        payButtonRef.current?.focus();
      }, 100);
    }
  }, [user]);

  // Simplified keyboard navigation - let Tab work naturally
  useEffect(() => {
    if (isProcessing || isZapping) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard events if user is typing in input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow Escape to exit input focus
        if (e.key === 'Escape') {
          e.preventDefault();
          target.blur();
          // Focus back on primary button
          if (user) {
            payButtonRef.current?.focus();
          } else {
            freePlayButtonRef.current?.focus();
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessing, isZapping, user]);

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
      if (user && gameConfig.freePlayEnabled) {
        setSelectedButton(0);
        payButtonRef.current?.focus();
      }
    },
    onNavigateDown: () => {
      if (user && gameConfig.freePlayEnabled) {
        setSelectedButton(1);
        freePlayButtonRef.current?.focus();
      }
    },
    enabled: !isProcessing && !isZapping,
  });

  // Generate QR code when invoice changes
  useEffect(() => {
    if (invoice) {
      QRCode.toDataURL(invoice.toUpperCase(), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR code generation failed:', err));
    } else {
      setQrCodeDataUrl('');
    }
  }, [invoice]);

  // Show invoice payment UI if an invoice was generated
  if (invoice) {
    return (
      <div className={className}>
        <Card className="bg-black border-yellow-500 border-2 max-w-md mx-auto">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-retro text-xl text-yellow-400 flex-1">
                PAY INVOICE
              </CardTitle>
              <Button
                onClick={() => {
                  resetInvoice();
                  setIsProcessing(false);
                }}
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <CardDescription className="font-retro text-xs text-gray-400">
              Scan QR code or copy invoice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code */}
            {qrCodeDataUrl ? (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={qrCodeDataUrl}
                  alt="Lightning Invoice QR Code"
                  className="w-full max-w-[280px]"
                />
              </div>
            ) : (
              <div className="flex justify-center p-12 bg-white rounded-lg">
                <div className="text-sm text-gray-500">Generating QR code...</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(invoice);
                  toast({
                    title: 'Copied!',
                    description: 'Invoice copied to clipboard',
                  });
                }}
                variant="outline"
                className="font-retro text-sm border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Copy className="w-4 h-4 mr-2" />
                COPY
              </Button>
              <Button
                onClick={() => {
                  // EXACT same flow as WebLN - just call success callback
                  resetInvoice();
                  setIsProcessing(false);
                  toast({
                    title: 'Payment confirmed!',
                    description: 'Starting game...',
                  });
                  onPaymentComplete();
                }}
                className="bg-green-600 hover:bg-green-700 font-retro text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                I PAID
              </Button>
            </div>

            {/* Payment note */}
            <div className="text-center space-y-2 pt-2">
              <div className="text-xs text-gray-500 font-retro">
                Amount: {gameConfig.costToPlay} sats
              </div>
              <div className="text-[0.65rem] text-gray-600">
                Click "I PAID" after payment completes
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="bg-black border-green-500 border-2 max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="font-retro text-2xl text-green-400 flex items-center justify-center gap-2">
            <Zap className="w-8 h-8" />
            BLOCKSTR
          </CardTitle>
          <CardDescription className="font-retro text-sm text-gray-400">
            Nostr and Bitcoin Powered Tetris
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
                className="w-full bg-gray-700 hover:bg-gray-600 focus:bg-gray-600 text-white font-retro focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
              >
                <Play className="w-4 h-4 mr-2" />
                PLAY ANONYMOUSLY (Press Enter)
              </Button>
              <div className="text-center text-[0.65rem] text-gray-600 font-retro">
                ⌨️ Press Enter to start • 🎮 Press A button
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg font-retro text-white mb-2">Ready to Play!</div>
                <div className="text-sm text-gray-400">
                  {isConferenceMode
                    ? `Scan QR code to pay ${gameConfig.costToPlay} sats`
                    : `Zap ${gameConfig.costToPlay} sats to start`
                  }
                </div>
              </div>

              {/* Wallet connection status - hide in conference mode */}
              {!isConferenceMode && !webln && !activeNWC && (
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

              {/* Custom memo input - hide in conference mode */}
              {!isConferenceMode && (
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
              )}

              <div className="grid gap-3">
                <Button
                  ref={payButtonRef}
                  onClick={handlePayment}
                  disabled={isProcessing || isZapping || (!isConferenceMode && !webln && !activeNWC)}
                  className="w-full bg-orange-600 hover:bg-orange-700 focus:bg-orange-700 text-white font-retro focus:ring-4 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {isProcessing || isZapping
                    ? 'PROCESSING...'
                    : isConferenceMode
                      ? `GET INVOICE (${gameConfig.costToPlay} SATS)`
                      : `ZAP ${gameConfig.costToPlay} SATS`
                  }
                </Button>

                {gameConfig.freePlayEnabled && (
                  <Button
                    ref={freePlayButtonRef}
                    onClick={handleFreePlay}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 focus:bg-gray-800 hover:border-gray-400 focus:border-gray-400 font-retro focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    PLAY FREE (DEMO)
                  </Button>
                )}
              </div>

              <div className="text-center text-[0.65rem] text-gray-600 font-retro space-y-1">
                {isConferenceMode ? (
                  <div>📱 Scan the QR code with your Lightning wallet</div>
                ) : (
                  <>
                    <div>⌨️ Tab to navigate • Enter to select</div>
                    <div>🎮 D-Pad/Stick + A button</div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="text-xs text-center space-y-2 text-gray-500 border-t border-gray-700 pt-4">
            <div>🎮 Difficulty increases every 2 minutes</div>
            <div>⛏️ Mined score transfers when Bitcoin blocks are found</div>
            <div>⭐ Bonus blocks give 10x points</div>
            <div>📈 Only mined scores published to Nostr</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}