import { useSeoMeta } from '@unhead/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useAppContext } from '@/hooks/useAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Mail, UserX, Zap } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { generateSecretKey, getPublicKey, nip44, nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { NLogin } from '@nostrify/react/login';
import { useNostrLogin } from '@nostrify/react/login';

const Conference = () => {
  const { config } = useAppContext();
  const login = useLoginActions();
  const { nostr } = useNostr();
  const { addLogin } = useNostrLogin();

  const [nip05Input, setNip05Input] = useState('');
  const [isLoadingNip05, setIsLoadingNip05] = useState(false);
  const [error, setError] = useState<string>('');
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const subscriptionRef = useRef<(() => void) | null>(null);

  useSeoMeta({
    title: 'Conference Mode - Blockstr',
    description: 'Quick login options for conference and kiosk displays',
  });

  const generateQrCode = useCallback(async () => {
    setIsGeneratingQr(true);
    setError('');

    try {
      // Generate a temporary client keypair for this connection
      const secretKey = generateSecretKey();
      const pubkey = getPublicKey(secretKey);

      // Generate a random secret for connection verification
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Get relay URL from app config
      const relayUrl = config.relayUrl;

      // Build nostrconnect:// URI according to NIP-46
      const params = new URLSearchParams({
        relay: relayUrl,
        secret: secret,
        perms: 'sign_event,nip04_encrypt,nip04_decrypt,nip44_encrypt,nip44_decrypt',
        name: 'Blockstr',
        url: window.location.origin,
      });

      const nostrConnectUri = `nostrconnect://${pubkey}?${params.toString()}`;

      // Generate QR code
      const qrDataUrl = await QRCodeLib.toDataURL(nostrConnectUri, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrCodeDataUrl(qrDataUrl);

      // Listen for connection response from remote signer
      const controller = new AbortController();
      subscriptionRef.current = () => controller.abort();

      console.log('[Conference] Setting up subscription for pubkey:', pubkey);

      // Subscribe to kind:24133 events p-tagged to our client pubkey
      const sub = nostr.req(
        [{ kinds: [24133], '#p': [pubkey], since: Math.floor(Date.now() / 1000) }],
        { signal: controller.signal }
      );

      // Process incoming events
      (async () => {
        try {
          for await (const msg of sub) {
            if (msg[0] === 'EVENT') {
              const event = msg[2];
              console.log('[Conference] Received NIP-46 event:', event);

              try {
                // Decrypt the content using NIP-44
                const conversationKey = nip44.getConversationKey(secretKey, event.pubkey);
                const decrypted = nip44.decrypt(event.content, conversationKey);
                const response = JSON.parse(decrypted);

                console.log('[Conference] Decrypted response:', response);

                if (response.error) {
                  console.error('[Conference] Remote signer returned error:', response.error);
                  setError(`Remote signer error: ${response.error}`);
                  controller.abort();
                  subscriptionRef.current = null;
                  return;
                }

                // Check if this is a valid connect response
                const isValidConnection =
                  response.result === secret ||
                  response.result === 'ack' ||
                  response.method === 'connect';

                if (isValidConnection) {
                  console.log('[Conference] Connection successful! Remote signer pubkey:', event.pubkey);

                  const remoteSignerPubkey = event.pubkey;

                  // Clean up subscription
                  controller.abort();
                  subscriptionRef.current = null;

                  try {
                    // Convert our client secret key to nsec format
                    const clientNsec = nip19.nsecEncode(secretKey);

                    // Create a NLoginBunker object manually
                    const bunkerLogin = new NLogin(
                      'bunker',
                      remoteSignerPubkey,
                      {
                        bunkerPubkey: remoteSignerPubkey,
                        clientNsec: clientNsec,
                        relays: [relayUrl]
                      }
                    );

                    console.log('[Conference] Created bunker login object:', {
                      type: bunkerLogin.type,
                      pubkey: bunkerLogin.pubkey,
                      bunkerPubkey: remoteSignerPubkey
                    });

                    // Add the login
                    addLogin(bunkerLogin);

                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Set session origin for logout redirect
                    sessionStorage.setItem('blockstr_session_origin', '/conference');

                    // Close dialog and redirect to game
                    setShowQrDialog(false);
                    window.location.href = '/';
                  } catch (e: unknown) {
                    const error = e as Error;
                    console.error('[Conference] Failed to create bunker login:', error);
                    setError(error.message || 'Failed to complete connection.');
                  }
                }
              } catch (decryptError) {
                console.error('[Conference] Failed to decrypt event:', decryptError);
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('[Conference] Subscription error:', error);
          }
        }
      })();

    } catch (error) {
      console.error('[Conference] Error generating QR code:', error);
      setError('Failed to generate QR code. Please try again.');
    } finally {
      setIsGeneratingQr(false);
    }
  }, [config.relayUrl, nostr, addLogin]);

  // Generate QR code when dialog opens
  useEffect(() => {
    if (showQrDialog && !qrCodeDataUrl) {
      generateQrCode();
    }
  }, [showQrDialog, qrCodeDataUrl, generateQrCode]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, []);

  const handleNip05Login = async () => {
    if (!nip05Input.trim()) {
      setError('Please enter a NIP-05 identifier');
      return;
    }

    // Validate NIP-05 format (name@domain.com)
    if (!nip05Input.includes('@')) {
      setError('Invalid NIP-05 format. Should be like: name@domain.com');
      return;
    }

    setIsLoadingNip05(true);
    setError('');

    try {
      const [name, domain] = nip05Input.split('@');

      // Fetch the .well-known/nostr.json file
      const response = await fetch(`https://${domain}/.well-known/nostr.json?name=${name}`);

      if (!response.ok) {
        throw new Error('NIP-05 identifier not found');
      }

      const data = await response.json();
      const pubkey = data.names?.[name];

      if (!pubkey) {
        throw new Error('NIP-05 identifier not found');
      }

      // Create a temporary anonymous account but with the NIP-05 verified pubkey
      login.anonymous(pubkey);

      // Set session origin for logout redirect
      sessionStorage.setItem('blockstr_session_origin', '/conference');

      // Redirect to game
      window.location.href = '/';
    } catch (e: unknown) {
      const error = e as Error;
      console.error('NIP-05 lookup failed:', error);
      setError(error.message || 'Failed to verify NIP-05 identifier. Please check and try again.');
    } finally {
      setIsLoadingNip05(false);
    }
  };

  const handleAnonymousLogin = () => {
    login.anonymous();

    // Set session origin for logout redirect
    sessionStorage.setItem('blockstr_session_origin', '/conference');

    window.location.href = '/';
  };

  const handleShowQrCode = () => {
    setShowQrDialog(true);
    setQrCodeDataUrl(''); // Reset QR code to generate fresh one
  };

  const handleCloseQrDialog = () => {
    setShowQrDialog(false);
    setQrCodeDataUrl('');
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="font-retro text-4xl text-green-400 flex items-center justify-center gap-3">
            <Zap className="w-12 h-12" />
            BLOCKSTR
          </div>
          <div className="font-retro text-sm text-gray-400">
            Conference Mode - Choose Your Login Method
          </div>
        </div>

        {/* Bunker QR Login */}
        <Card className="border-2 border-green-400 bg-black/80">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="w-5 h-5 text-green-400" />
              <h3 className="font-retro text-green-400 text-sm uppercase">Scan QR Code</h3>
            </div>

            <p className="text-xs text-gray-400">
              Use your mobile Nostr signer (Amber, nsec.app, etc.)
            </p>

            <Button
              onClick={handleShowQrCode}
              className="w-full bg-green-400 text-black hover:bg-green-500 font-retro text-xs uppercase"
            >
              Show QR Code
            </Button>
          </CardContent>
        </Card>

        {/* NIP-05 Login */}
        <Card className="border-2 border-green-400 bg-black/80">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-green-400" />
              <h3 className="font-retro text-green-400 text-sm uppercase">Enter NIP-05</h3>
            </div>

            <div className="space-y-2">
              <Input
                type="text"
                value={nip05Input}
                onChange={(e) => {
                  setNip05Input(e.target.value);
                  if (error) setError('');
                }}
                placeholder="name@domain.com"
                className="bg-black border-green-400 text-green-400 font-retro text-sm placeholder:text-gray-600"
                disabled={isLoadingNip05}
              />
              <Button
                onClick={handleNip05Login}
                disabled={isLoadingNip05 || !nip05Input.trim()}
                className="w-full bg-green-400 text-black hover:bg-green-500 font-retro text-xs uppercase"
              >
                {isLoadingNip05 ? 'Verifying...' : 'Login with NIP-05'}
              </Button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Enter your Nostr address to link scores to your identity
            </p>
          </CardContent>
        </Card>

        {/* Anonymous Play */}
        <Card className="border-2 border-gray-600 bg-black/80">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UserX className="w-5 h-5 text-gray-400" />
              <h3 className="font-retro text-gray-400 text-sm uppercase">Play Anonymously</h3>
            </div>

            <Button
              onClick={handleAnonymousLogin}
              variant="outline"
              className="w-full border-gray-600 text-gray-400 hover:bg-gray-900 hover:text-gray-300 font-retro text-xs uppercase"
            >
              Continue Without Login
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Scores won't be linked to your identity
            </p>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="border-red-500 bg-red-950/50">
            <AlertDescription className="text-red-400 text-xs">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Info */}
        <div className="text-xs text-center space-y-2 text-gray-500 border-t border-gray-700 pt-4">
          <div>🎮 Difficulty increases every 2 minutes</div>
          <div>⛏️ Mined score transfers when Bitcoin blocks are found</div>
          <div>⭐ Bonus blocks give 10x points</div>
          <div>📈 Only mined scores published to Nostr</div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={handleCloseQrDialog}>
        <DialogContent className="max-w-md bg-black border-2 border-green-400">
          <DialogHeader>
            <DialogTitle className="font-retro text-green-400 text-center text-lg">
              Scan with Mobile Signer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isGeneratingQr ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-green-400 font-retro text-xs">Generating QR Code...</div>
              </div>
            ) : qrCodeDataUrl ? (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img
                    src={qrCodeDataUrl}
                    alt="Nostr Connect QR Code"
                    className="w-80 h-80"
                  />
                </div>
              </div>
            ) : null}

            <p className="text-xs text-gray-400 text-center">
              Use Amber, nsec.app, or any NIP-46 compatible signer
            </p>

            {error && (
              <Alert variant="destructive" className="border-red-500 bg-red-950/50">
                <AlertDescription className="text-red-400 text-xs">
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Conference;
