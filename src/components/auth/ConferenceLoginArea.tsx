import { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode, Mail, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { useAppContext } from '@/hooks/useAppContext';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { generateSecretKey, getPublicKey, nip44 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { NLogin } from '@nostrify/react/login';
import { useNostrLogin } from '@nostrify/react/login';
import { nip19 } from 'nostr-tools';

export interface ConferenceLoginAreaProps {
  className?: string;
  onLoginComplete?: () => void;
  qrCodeExpiryMinutes?: number; // How often to regenerate QR code (default: 5 minutes)
}

export function ConferenceLoginArea({
  className,
  onLoginComplete,
  qrCodeExpiryMinutes = 5
}: ConferenceLoginAreaProps) {
  const { currentUser } = useLoggedInAccounts();
  const { config } = useAppContext();
  const [nip05Input, setNip05Input] = useState('');
  const [isLoadingNip05, setIsLoadingNip05] = useState(false);
  const [error, setError] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const login = useLoginActions();
  const { nostr } = useNostr();
  const { addLogin } = useNostrLogin();
  const subscriptionRef = useRef<(() => void) | null>(null);
  const [_clientKeypair, setClientKeypair] = useState<{ secretKey: Uint8Array; pubkey: string } | null>(null);
  const [_connectionSecret, setConnectionSecret] = useState<string>('');
  const regenerateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isGeneratingRef = useRef<boolean>(false);
  const hasInitializedRef = useRef<boolean>(false);

  const generateNostrConnectQR = useCallback(async () => {
    // Prevent multiple simultaneous generations
    if (isGeneratingRef.current) {
      console.log('QR generation already in progress, skipping...');
      return;
    }

    isGeneratingRef.current = true;

    // Clean up any existing subscription before generating new QR
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }

    setIsGeneratingQR(true);
    setError(''); // Clear any previous errors

    try {
      // Generate a temporary client keypair for this connection
      const secretKey = generateSecretKey();
      const pubkey = getPublicKey(secretKey);

      setClientKeypair({ secretKey, pubkey });

      // Generate a random secret for connection verification
      const secret = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      setConnectionSecret(secret);

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
      const qrDataUrl = await QRCode.toDataURL(nostrConnectUri, {
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

      console.log('[ConferenceLoginArea] Setting up subscription for pubkey:', pubkey);
      console.log('[ConferenceLoginArea] Relay URL:', relayUrl);

      // Subscribe to kind:24133 events p-tagged to our client pubkey
      const sub = nostr.req(
        [{ kinds: [24133], '#p': [pubkey], since: Math.floor(Date.now() / 1000) }],
        { signal: controller.signal }
      );

      console.log('[ConferenceLoginArea] Subscription created, waiting for events...');

      // Process incoming events
      (async () => {
        try {
          for await (const msg of sub) {
            console.log('[ConferenceLoginArea] Received message:', msg[0]);
            if (msg[0] === 'EVENT') {
              const event = msg[2];
              console.log('[ConferenceLoginArea] Received NIP-46 event:', event);

              try {
                // Decrypt the content using NIP-44
                const conversationKey = nip44.getConversationKey(secretKey, event.pubkey);
                const decrypted = nip44.decrypt(event.content, conversationKey);
                const response = JSON.parse(decrypted);

                console.log('[ConferenceLoginArea] Decrypted response:', response);
                console.log('[ConferenceLoginArea] Expected secret:', secret);

                if (response.error) {
                  console.error('Remote signer returned error:', response.error);
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
                  console.log('[ConferenceLoginArea] Connection successful! Remote signer pubkey:', event.pubkey);

                  const remoteSignerPubkey = event.pubkey;

                  // Clean up subscription
                  controller.abort();
                  subscriptionRef.current = null;

                  try {
                    // Convert our client secret key to nsec format
                    const clientNsec = nip19.nsecEncode(secretKey);

                    console.log('[ConferenceLoginArea] Creating bunker login with:', {
                      remoteSignerPubkey,
                      relayUrl
                    });

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

                    console.log('[ConferenceLoginArea] Created bunker login object:', {
                      type: bunkerLogin.type,
                      pubkey: bunkerLogin.pubkey,
                      bunkerPubkey: remoteSignerPubkey
                    });

                    // Add the login
                    console.log('[ConferenceLoginArea] Adding login...');
                    addLogin(bunkerLogin);
                    console.log('[ConferenceLoginArea] Login added');

                    await new Promise(resolve => setTimeout(resolve, 100));

                    console.log('[ConferenceLoginArea] Calling onLoginComplete...');
                    if (onLoginComplete) {
                      onLoginComplete();
                    }
                    console.log('[ConferenceLoginArea] Login complete!');
                  } catch (e: unknown) {
                    const error = e as Error;
                    console.error('Failed to create bunker login:', error);
                    setError(error.message || 'Failed to complete connection.');
                  }
                }
              } catch (decryptError) {
                console.error('Failed to decrypt event:', decryptError);
              }
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name !== 'AbortError') {
            console.error('Subscription error:', error);
          }
        }
      })();

    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code. Please refresh the page.');
    } finally {
      setIsGeneratingQR(false);
      isGeneratingRef.current = false;
    }
  }, [nostr, addLogin, onLoginComplete, config.relayUrl]);

  // Generate QR code on mount and set up periodic regeneration
  useEffect(() => {
    // Only initialize once
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      generateNostrConnectQR();

      // Set up periodic QR code regeneration for security
      if (qrCodeExpiryMinutes > 0) {
        regenerateTimerRef.current = setInterval(() => {
          console.log('QR code expired, regenerating...');
          generateNostrConnectQR();
        }, qrCodeExpiryMinutes * 60 * 1000);
      }
    }

    // Cleanup subscription and timer on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
      if (regenerateTimerRef.current) {
        clearInterval(regenerateTimerRef.current);
        regenerateTimerRef.current = null;
      }
    };
  }, [generateNostrConnectQR, qrCodeExpiryMinutes]);

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
      // This allows us to associate scores with the user's identity
      login.anonymous(pubkey);

      if (onLoginComplete) {
        onLoginComplete();
      }
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
    if (onLoginComplete) {
      onLoginComplete();
    }
  };

  // If already logged in, show a simple logged-in state
  if (currentUser) {
    return (
      <div className={cn("text-center space-y-4", className)}>
        <div className="text-green-400 font-retro text-sm">
          ✓ Logged In
        </div>
        <div className="text-xs text-gray-400">
          {currentUser.pubkey.slice(0, 8)}...{currentUser.pubkey.slice(-8)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* QR Code Section */}
      <Card className="border-2 border-green-400 bg-black/80">
        <CardContent className="p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <QrCode className="w-5 h-5 text-green-400" />
            <h3 className="font-retro text-green-400 text-sm uppercase">Scan to Login</h3>
          </div>

          {isGeneratingQR ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-green-400 font-retro text-xs">Generating QR Code...</div>
            </div>
          ) : qrCodeDataUrl ? (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg inline-block">
                <img
                  src={qrCodeDataUrl}
                  alt="Nostr Connect QR Code"
                  className="w-64 h-64"
                />
              </div>
            </div>
          ) : null}

          <p className="text-xs text-gray-400">
            Use Amber, nsec.app, or any NIP-46 compatible signer
          </p>
        </CardContent>
      </Card>

      {/* NIP-05 Section */}
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

      {/* Anonymous Play Section */}
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
    </div>
  );
}
