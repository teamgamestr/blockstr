import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useGamepadMenu } from '@/hooks/useGamepadMenu';
import { useWallet } from '@/hooks/useWallet';
import { useZaps } from '@/hooks/useZaps';
import { gameConfig } from '@/config/gameConfig';
import { Coins, Zap, Play, Wallet as WalletIcon, Copy, X, Loader2 } from 'lucide-react';
import { LoginArea } from '@/components/auth/LoginArea';
import { WalletModal } from '@/components/WalletModal';
import QRCode from 'qrcode';
import type { Event as NostrToolsEvent } from 'nostr-tools';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useIsMobile } from '@/hooks/useIsMobile';

interface PaymentGateProps {
  onPaymentComplete: () => void;
  className?: string;
}

type StatusTone = 'info' | 'success' | 'error';

interface StatusMessage {
  title: string;
  description?: string;
  tone?: StatusTone;
}

const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
  info: 'border-blue-500/60 bg-blue-900/30 text-blue-100',
  success: 'border-green-500/60 bg-green-900/25 text-green-100',
  error: 'border-red-600/60 bg-red-900/30 text-red-200',
};

function StatusBanner({ status }: { status: StatusMessage | null }) {
  if (!status) return null;
  const tone = status.tone ?? 'info';
  const toneClasses = STATUS_TONE_CLASSES[tone];

  return (
    <div className={`rounded border px-4 py-3 text-xs font-retro ${toneClasses}`}>
      <div className="font-semibold">{status.title}</div>
      {status.description && (
        <div className="text-[0.65rem] opacity-80 mt-1">{status.description}</div>
      )}
    </div>
  );
}

export function PaymentGate({ onPaymentComplete, className }: PaymentGateProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedButton, setSelectedButton] = useState(0); // 0: Pay, 1: Free Play
  const [customMemo, setCustomMemo] = useState(gameConfig.zapMemo);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const { user } = useCurrentUser();
  const { webln, activeNWC } = useWallet();
  const loginActions = useLoginActions();
  const isMobile = useIsMobile();
  const [isConferenceMode, setIsConferenceMode] = useState(false);
  const [trackedInvoice, setTrackedInvoice] = useState<string | null>(null);
  const [isAwaitingReceipt, setIsAwaitingReceipt] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const receiptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect conference mode and ensure the root route stays on the regular payment flow
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const determineMode = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const storedOrigin = sessionStorage.getItem('blockstr_session_origin');
      const cameFromConference = typeof document !== 'undefined' && !!document.referrer && document.referrer.includes('/conference');
      const queryConference = params.get('mode') === 'conference' || params.get('conference') === '1';

      if (queryConference || path === '/conference') {
        sessionStorage.setItem('blockstr_session_origin', '/conference');
        setIsConferenceMode(true);
        return;
      }

      if (path === '/' && storedOrigin === '/conference' && !cameFromConference) {
        sessionStorage.setItem('blockstr_session_origin', '/');
        setIsConferenceMode(false);
        return;
      }

      setIsConferenceMode(storedOrigin === '/conference');
    };

    determineMode();
  }, []);

  // Debug logging
  useEffect(() => {
    if (typeof window === 'undefined') return;
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

  const createAnonymousSession = useCallback(() => {
    loginActions.anonymous();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('blockstr_session_origin', '/');
    }
  }, [loginActions]);

  const shouldSkipAutomaticPayment = isConferenceMode || (!webln && !activeNWC);

  const {
    zap,
    isZapping,
    invoice,
    resetInvoice,
    zaps = [],
    refetch,
  } = useZaps(
    blockstrEvent,
    webln,
    activeNWC,
    undefined,
    shouldSkipAutomaticPayment
  );

  const trackInvoice = useCallback((value: string | null) => {
    setTrackedInvoice(value ? value.toLowerCase() : null);
  }, []);

  const clearReceiptTimer = useCallback(() => {
    if (receiptTimerRef.current) {
      clearTimeout(receiptTimerRef.current);
      receiptTimerRef.current = null;
    }
  }, []);

  const handleReceiptTimeout = useCallback(() => {
    receiptTimerRef.current = null;
    setIsAwaitingReceipt(false);
    setStatusMessage({
      title: 'Still waiting for receipt…',
      description: 'No zap receipt was detected within 60 seconds. If you already paid, please try sending the zap again.',
      tone: 'error',
    });
  }, [setStatusMessage]);

  const stopWaiting = useCallback(() => {
    clearReceiptTimer();
    setIsAwaitingReceipt(false);
  }, [clearReceiptTimer]);

  const startReceiptWait = useCallback((invoiceValue: string, reason: 'auto' | 'manual', manualDescription?: string) => {
    if (!invoiceValue) return;
    trackInvoice(invoiceValue);
    setIsAwaitingReceipt(true);
    const isAuto = reason === 'auto';
    setStatusMessage({
      title: isAuto ? 'Payment sent' : 'Scan to pay',
      description: isAuto ? 'Waiting for zap receipt on Nostr...' : (manualDescription ?? 'Show the QR code to your wallet. Waiting for zap receipt...'),
      tone: 'info',
    });
    void refetch();
    clearReceiptTimer();
    receiptTimerRef.current = setTimeout(handleReceiptTimeout, 60_000);
  }, [trackInvoice, refetch, clearReceiptTimer, handleReceiptTimeout, setStatusMessage]);

  const finalizePayment = useCallback((receiptId?: string) => {
    stopWaiting();
    trackInvoice(null);
    resetInvoice();
    setQrCodeDataUrl('');
    setIsProcessing(false);
    const shortId = receiptId ? `${receiptId.slice(0, 8)}…` : undefined;
    setStatusMessage({
      title: 'Zap confirmed',
      description: shortId ? `Receipt ${shortId} verified. Starting game...` : 'Zap receipt verified. Starting game...',
      tone: 'success',
    });
    onPaymentComplete();
  }, [stopWaiting, trackInvoice, resetInvoice, onPaymentComplete, setStatusMessage]);

  useEffect(() => {
    return () => {
      stopWaiting();
      trackInvoice(null);
    };
  }, [stopWaiting, trackInvoice]);

  useEffect(() => {
    if (!trackedInvoice) return;
    const normalizedInvoice = trackedInvoice.toLowerCase();
    const payerKey = user?.pubkey;
    const matchingReceipt = zaps.find((event) => {
      const bolt11 = event.tags.find(([name]) => name === 'bolt11')?.[1]?.toLowerCase();
      if (!bolt11 || bolt11 !== normalizedInvoice) {
        return false;
      }
      if (payerKey) {
        const payer = event.tags.find(([name]) => name === 'P')?.[1];
        if (payer && payer !== payerKey) {
          return false;
        }
      }
      return true;
    });

    if (matchingReceipt) {
      finalizePayment(matchingReceipt.id);
    }
  }, [zaps, trackedInvoice, user, finalizePayment]);

  useEffect(() => {
    if (isAwaitingReceipt) {
      void refetch();
    }
  }, [isAwaitingReceipt, refetch]);

  // Handler functions defined first
  const handlePayment = useCallback(async () => {
    if (!user) {
      setStatusMessage({
        title: 'Profile required',
        description: 'Login or continue as guest to request a Lightning invoice.',
        tone: 'error',
      });
      return;
    }

    stopWaiting();
    trackInvoice(null);
    setStatusMessage(null);
    setIsProcessing(true);
    try {
      // Reset any previous invoice
      resetInvoice();

      // Send zap to Blockstr account
      const result = await zap(gameConfig.costToPlay, customMemo);

      if (result?.invoice) {
        if (result.autoPaid) {
          startReceiptWait(result.invoice, 'auto');
        } else if (isConferenceMode) {
          startReceiptWait(
            result.invoice,
            'manual',
            `Show this QR code to your Lightning wallet to pay ${gameConfig.costToPlay} sats. We'll monitor for the receipt automatically.`
          );
        } else {
          startReceiptWait(
            result.invoice,
            'manual',
            'Show the QR code to your wallet. We are watching for the zap receipt automatically.'
          );
        }
      }
    } catch (error) {
      console.error('Payment failed:', error);
      setStatusMessage({
        title: 'Payment failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        tone: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, isConferenceMode, stopWaiting, trackInvoice, resetInvoice, zap, customMemo, startReceiptWait, setStatusMessage]);

  // Auto-generate invoice in conference mode when user is logged in
  useEffect(() => {
    if (isConferenceMode && user && !invoice && !isProcessing && !isZapping && !trackedInvoice && !isAwaitingReceipt) {
      console.log('[PaymentGate] Auto-generating invoice for conference mode');
      handlePayment();
    }
  }, [isConferenceMode, user, invoice, isProcessing, isZapping, trackedInvoice, isAwaitingReceipt, handlePayment]);

  const handleAnonymousLogin = useCallback(() => {
    try {
      createAnonymousSession();
      setSelectedButton(0);
      setStatusMessage({
        title: 'Anonymous profile ready',
        description: 'You can now zap or request an invoice to start playing.',
        tone: 'success',
      });
    } catch (error) {
      console.error('Anonymous login failed:', error);
      setStatusMessage({
        title: 'Unable to continue',
        description: error instanceof Error ? error.message : 'Failed to create anonymous session.',
        tone: 'error',
      });
    }
  }, [createAnonymousSession, setStatusMessage]);

  const handleFreePlay = useCallback(() => {
    // For anonymous users or when free play is enabled
    onPaymentComplete();
  }, [onPaymentComplete]);

  const lightningUri = useMemo(() => {
    if (!invoice) return null;
    return invoice.toLowerCase().startsWith('lightning:') ? invoice : `lightning:${invoice}`;
  }, [invoice]);

  const openInvoiceInWallet = useCallback(() => {
    if (!lightningUri) {
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const newWindow = window.open(lightningUri, '_blank');
        if (!newWindow) {
          window.location.href = lightningUri;
        }
      } catch (error) {
        console.warn('Unable to open wallet via window.open, falling back to location.href', error);
        window.location.href = lightningUri;
      }
    }
  }, [lightningUri]);

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
    if (isProcessing || isZapping || isAwaitingReceipt) return;

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
  }, [isProcessing, isZapping, isAwaitingReceipt, user]);

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
    enabled: !isProcessing && !isZapping && !isAwaitingReceipt,
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
  if (invoice && isConferenceMode) {
    return (
      <div className={className}>
        <Card className="bg-black border-green-500 border-2 max-w-md mx-auto">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-retro text-xl text-green-400 flex-1">
                SCAN TO PLAY
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
              Hold your wallet up to pay {gameConfig.costToPlay} sats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StatusBanner status={statusMessage} />
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

            <div className="rounded border border-blue-500/60 bg-blue-900/20 px-4 py-3 text-xs text-blue-100 font-retro flex items-center justify-center gap-3">
              {isAwaitingReceipt ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Waiting for zap receipt...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Listening for payment...
                </>
              )}
            </div>

            <div className="text-center space-y-2 pt-2">
              <div className="text-xs text-gray-500 font-retro">
                Amount: {gameConfig.costToPlay} sats
              </div>
              <div className="text-[0.65rem] text-gray-400">
                We will automatically detect your zap receipt once payment completes.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <StatusBanner status={statusMessage} />
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

            <div className="space-y-3">
              {isMobile && lightningUri && (
                <Button
                  onClick={openInvoiceInWallet}
                  className="w-full bg-green-600 hover:bg-green-500 focus:bg-green-500 text-white font-retro focus:ring-4 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-black"
                >
                  <WalletIcon className="w-4 h-4 mr-2" />
                  OPEN IN WALLET
                </Button>
              )}

              <Button
                onClick={() => {
                  void navigator.clipboard.writeText(invoice);
                  setStatusMessage({
                    title: 'Invoice copied',
                    description: 'Lightning invoice copied to clipboard.',
                    tone: 'success',
                  });
                }}
                variant="outline"
                className="w-full font-retro text-sm border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Copy className="w-4 h-4 mr-2" />
                COPY INVOICE
              </Button>

              <div className="rounded border border-blue-500/60 bg-blue-900/20 px-4 py-3 text-xs text-blue-100 font-retro flex items-center justify-center gap-3">
                {isAwaitingReceipt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Waiting for zap receipt...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Listening for payment...
                  </>
                )}
              </div>
            </div>

            {/* Payment note */}
            <div className="text-center space-y-2 pt-2">
              <div className="text-xs text-gray-500 font-retro">
                Amount: {gameConfig.costToPlay} sats
              </div>
              <div className="text-[0.65rem] text-gray-600">
                Hold your wallet over the QR code. We will automatically detect the zap receipt.
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
          <StatusBanner status={statusMessage} />
          {isAwaitingReceipt && (
            <div className="rounded border border-blue-500/60 bg-blue-900/30 px-4 py-3 text-xs text-blue-100 font-retro flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              <div>
                <div>Waiting for zap receipt on Nostr...</div>
                {trackedInvoice && (
                  <div className="text-[0.6rem] text-blue-200/70">Invoice {trackedInvoice.slice(0, 8).toUpperCase()}…</div>
                )}
              </div>
            </div>
          )}
          {!user ? (
            <div className="text-center space-y-4">
              <div className="text-sm text-gray-300 font-retro">
                Login to save scores to Nostr from your profile or play anon.
              </div>
              <LoginArea className="max-w-60 mx-auto" />
              <Button
                ref={freePlayButtonRef}
                onClick={handleAnonymousLogin}
                className="mx-auto bg-gray-700 hover:bg-gray-600 focus:bg-gray-600 text-white font-retro focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-black transition-all text-left px-6 py-3"
              >
                <Play className="w-4 h-4 mr-3" />
                <span className="text-sm tracking-wide">PLAY ANONYMOUSLY</span>
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
                  <p className="text-xs text-yellow-400 font-retro mb-1">
                    ⚠️ NO WALLET CONNECTED
                  </p>
                  <p className="text-[0.7rem] text-yellow-100 font-retro mb-3">
                    We'll fall back to QR invoices. Connect a wallet for 1-tap zaps.
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
                  disabled={isProcessing || isZapping || isAwaitingReceipt}
                  className="w-full bg-orange-600 hover:bg-orange-700 focus:bg-orange-700 text-white font-retro focus:ring-4 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 transition-all"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {isProcessing || isZapping
                    ? 'PROCESSING...'
                    : shouldSkipAutomaticPayment
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