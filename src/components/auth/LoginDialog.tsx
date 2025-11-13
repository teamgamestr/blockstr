// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import React, { useRef, useState, useEffect } from 'react';
import { Shield, Upload, AlertTriangle, UserPlus, KeyRound, Sparkles, Cloud, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoginActions } from '@/hooks/useLoginActions';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { generateSecretKey, getPublicKey, nip44, nip19 } from 'nostr-tools';
import { useNostr } from '@nostrify/react';
import { NLogin } from '@nostrify/react/login';
import { useNostrLogin } from '@nostrify/react/login';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup?: () => void;
}

const validateNsec = (nsec: string) => {
  return /^nsec1[a-zA-Z0-9]{58}$/.test(nsec);
};

const validateBunkerUri = (uri: string) => {
  return uri.startsWith('bunker://');
};

const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onLogin, onSignup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [bunkerUri, setBunkerUri] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [_nostrConnectUri, setNostrConnectUri] = useState<string>('');
  const [_clientKeypair, setClientKeypair] = useState<{ secretKey: Uint8Array; pubkey: string } | null>(null);
  const [_connectionSecret, setConnectionSecret] = useState<string>('');
  const [errors, setErrors] = useState<{
    nsec?: string;
    bunker?: string;
    file?: string;
    extension?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const login = useLoginActions();
  const { nostr } = useNostr();
  const { addLogin } = useNostrLogin();
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Reset all state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setIsLoading(false);
      setIsFileLoading(false);
      setNsec('');
      setBunkerUri('');
      setShowQrCode(false);
      setQrCodeDataUrl('');
      setNostrConnectUri('');
      setConnectionSecret('');
      setErrors({});
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      // Also clear state when dialog closes to prevent stale data
      setIsLoading(false);
      setIsFileLoading(false);
      setNsec('');
      setBunkerUri('');
      setShowQrCode(false);
      setQrCodeDataUrl('');
      setNostrConnectUri('');
      setConnectionSecret('');
      setClientKeypair(null);
      setErrors({});
      // Clean up subscription
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    }
  }, [isOpen]);

  const generateNostrConnectQR = async () => {
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

      // Get relay URL from app config (using Damus as default)
      const relayUrl = 'wss://relay.damus.io';

      // Build nostrconnect:// URI according to NIP-46
      const params = new URLSearchParams({
        relay: relayUrl,
        secret: secret,
        perms: 'sign_event,nip04_encrypt,nip04_decrypt,nip44_encrypt,nip44_decrypt',
        name: 'Blockstr',
        url: window.location.origin,
      });

      const nostrConnectUri = `nostrconnect://${pubkey}?${params.toString()}`;
      setNostrConnectUri(nostrConnectUri);

      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(nostrConnectUri, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrCodeDataUrl(qrDataUrl);
      setShowQrCode(true);

      // Listen for connection response from remote signer
      const controller = new AbortController();
      subscriptionRef.current = () => controller.abort();

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
              console.log('Received NIP-46 event:', event);

              try {
                // Decrypt the content using NIP-44
                const conversationKey = nip44.getConversationKey(secretKey, event.pubkey);
                const decrypted = nip44.decrypt(event.content, conversationKey);
                const response = JSON.parse(decrypted);

                console.log('Decrypted response:', response);
                console.log('Expected secret:', secret);
                console.log('Response result:', response.result);
                console.log('Response error:', response.error);

                // According to NIP-46, for client-initiated connections:
                // The remote signer responds with the secret as the result
                // OR with "ack" for server-initiated connections
                // Also check if there's an error field
                if (response.error) {
                  console.error('Remote signer returned error:', response.error);
                  setErrors(prev => ({
                    ...prev,
                    bunker: `Remote signer error: ${response.error}`
                  }));
                  setShowQrCode(false);
                  controller.abort();
                  subscriptionRef.current = null;
                  return;
                }

                // Check if this is a valid connect response
                // The result should match our secret, or be "ack"
                const isValidConnection =
                  response.result === secret ||
                  response.result === 'ack' ||
                  response.method === 'connect';

                if (isValidConnection) {
                  console.log('Connection successful! Remote signer pubkey:', event.pubkey);

                  // For client-initiated connections, we manually create the NLoginBunker object
                  // The remote signer pubkey is in event.pubkey
                  const remoteSignerPubkey = event.pubkey;

                  // Clean up subscription
                  controller.abort();
                  subscriptionRef.current = null;

                  setIsLoading(true);
                  try {
                    // Convert our client secret key to nsec format
                    const clientNsec = nip19.nsecEncode(secretKey);

                    // Create a NLoginBunker object manually
                    // We use the remote signer's pubkey as the user pubkey (will be updated after get_public_key)
                    const bunkerLogin = new NLogin(
                      'bunker',
                      remoteSignerPubkey, // This will be the user's pubkey
                      {
                        bunkerPubkey: remoteSignerPubkey,
                        clientNsec: clientNsec,
                        relays: [relayUrl]
                      }
                    );

                    console.log('Created bunker login object:', {
                      type: bunkerLogin.type,
                      pubkey: bunkerLogin.pubkey,
                      bunkerPubkey: remoteSignerPubkey
                    });

                    // Add the login
                    addLogin(bunkerLogin);

                    await new Promise(resolve => setTimeout(resolve, 100));
                    onLogin();
                    onClose();
                  } catch (e: unknown) {
                    const error = e as Error;
                    console.error('Failed to create bunker login:', error);
                    setErrors(prev => ({
                      ...prev,
                      bunker: error.message || 'Failed to complete connection.'
                    }));
                  } finally {
                    setIsLoading(false);
                    setShowQrCode(false);
                  }
                } else {
                  console.log('Response does not match expected format, waiting for next event...');
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
      setErrors(prev => ({
        ...prev,
        bunker: 'Failed to generate QR code. Please try again.'
      }));
    }
  };

  const handleCloseQrCode = () => {
    setShowQrCode(false);
    setQrCodeDataUrl('');
    setNostrConnectUri('');
    setConnectionSecret('');
    setClientKeypair(null);
    // Clean up subscription
    if (subscriptionRef.current) {
      subscriptionRef.current();
      subscriptionRef.current = null;
    }
  };

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setErrors(prev => ({ ...prev, extension: undefined }));

    try {
      if (!('nostr' in window)) {
        throw new Error('Nostr extension not found. Please install a NIP-07 extension.');
      }
      await login.extension();
      onLogin();
      onClose();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Bunker login failed:', error);
      console.error('Nsec login failed:', error);
      console.error('Extension login failed:', error);
      setErrors(prev => ({
        ...prev,
        extension: error instanceof Error ? error.message : 'Extension login failed'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const executeLogin = (key: string) => {
    setIsLoading(true);
    setErrors({});

    // Use a timeout to allow the UI to update before the synchronous login call
    setTimeout(() => {
      try {
        login.nsec(key);
        onLogin();
        onClose();
      } catch {
        setErrors({ nsec: "Failed to login with this key. Please check that it's correct." });
        setIsLoading(false);
      }
    }, 50);
  };

  const handleKeyLogin = () => {
    if (!nsec.trim()) {
      setErrors(prev => ({ ...prev, nsec: 'Please enter your secret key' }));
      return;
    }

    if (!validateNsec(nsec)) {
      setErrors(prev => ({ ...prev, nsec: 'Invalid secret key format. Must be a valid nsec starting with nsec1.' }));
      return;
    }
    executeLogin(nsec);
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim()) {
      setErrors(prev => ({ ...prev, bunker: 'Please enter a bunker URI' }));
      return;
    }

    if (!validateBunkerUri(bunkerUri)) {
      setErrors(prev => ({ ...prev, bunker: 'Invalid bunker URI format. Must start with bunker://' }));
      return;
    }

    setIsLoading(true);
    setErrors(prev => ({ ...prev, bunker: undefined }));

    try {
      console.log('Starting bunker login...');
      await login.bunker(bunkerUri);
      console.log('Bunker login successful');

      // Give the login state a moment to update
      await new Promise(resolve => setTimeout(resolve, 100));

      onLogin();
      onClose();
      // Clear the URI from memory
      setBunkerUri('');
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Bunker login failed:', error);

      // Provide more specific error messages
      let errorMessage = error.message || 'Failed to connect to bunker. Please check the URI.';

      if (errorMessage.includes('already connected')) {
        errorMessage = 'This bunker connection is already active. Please close other connections or use a different bunker.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Connection timed out. Please check your bunker URI and try again.';
      } else if (errorMessage.includes('No relay provided')) {
        errorMessage = 'Invalid bunker URI: No relay provided. Please check the URI format.';
      }

      setErrors(prev => ({
        ...prev,
        bunker: errorMessage
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    setErrors({});

    const reader = new FileReader();
    reader.onload = (event) => {
      setIsFileLoading(false);
      const content = event.target?.result as string;
      if (content) {
        const trimmedContent = content.trim();
        if (validateNsec(trimmedContent)) {
          executeLogin(trimmedContent);
        } else {
          setErrors({ file: 'File does not contain a valid secret key.' });
        }
      } else {
        setErrors({ file: 'Could not read file content.' });
      }
    };
    reader.onerror = () => {
      setIsFileLoading(false);
      setErrors({ file: 'Failed to read file.' });
    };
    reader.readAsText(file);
  };

  const handleSignupClick = () => {
    onClose();
    if (onSignup) {
      onSignup();
    }
  };

  const defaultTab = 'nostr' in window ? 'extension' : 'key';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn("max-w-[95vw] sm:max-w-md max-h-[90vh] max-h-[90dvh] p-0 overflow-hidden rounded-2xl overflow-y-scroll")}
      >
        <DialogHeader className={cn('px-6 pt-6 pb-1 relative')}>

            <DialogDescription className="text-center">
              Sign up or log in to continue
            </DialogDescription>
        </DialogHeader>
        <div className='px-6 pt-2 pb-4 space-y-4 overflow-y-auto flex-1'>
          {/* Prominent Sign Up Section */}
          <div className='relative p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 overflow-hidden'>
            <div className='relative z-10 text-center space-y-3'>
              <div className='flex justify-center items-center gap-2 mb-2'>
                <Sparkles className='w-5 h-5 text-blue-600' />
                <span className='font-semibold text-blue-800 dark:text-blue-200'>
                  New to Nostr?
                </span>
              </div>
              <p className='text-sm text-blue-700 dark:text-blue-300'>
                Create a new account to get started. It's free and open.
              </p>
              <Button
                onClick={handleSignupClick}
                className='w-full rounded-full py-3 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform transition-all duration-200 hover:scale-105 shadow-lg border-0'
              >
                <UserPlus className='w-4 h-4 mr-2' />
                <span>Sign Up</span>
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-gray-300 dark:border-gray-600'></div>
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='px-3 bg-background text-muted-foreground'>
                <span>Or log in</span>
              </span>
            </div>
          </div>

          {/* Login Methods */}
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/80 rounded-lg mb-4">
              <TabsTrigger value="extension" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Extension</span>
              </TabsTrigger>
              <TabsTrigger value="key" className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                <span>Key</span>
              </TabsTrigger>
              <TabsTrigger value="bunker" className="flex items-center gap-2">
                <Cloud className="w-4 h-4" />
                <span>Bunker</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value='extension' className='space-y-3 bg-muted'>
              {errors.extension && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.extension}</AlertDescription>
                </Alert>
              )}
              <div className='text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800'>
                <Shield className='w-12 h-12 mx-auto mb-3 text-primary' />
                <p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
                  Login with one click using the browser extension
                </p>
                <div className="flex justify-center">
                  <Button
                    className='w-full rounded-full py-4'
                    onClick={handleExtensionLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login with Extension'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='key' className='space-y-4'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <label htmlFor='nsec' className='text-sm font-medium'>
                    Secret Key (nsec)
                  </label>
                  <Input
                    id='nsec'
                    type="password"
                    value={nsec}
                    onChange={(e) => {
                      setNsec(e.target.value);
                      if (errors.nsec) setErrors(prev => ({ ...prev, nsec: undefined }));
                    }}
                    className={`rounded-lg ${
                      errors.nsec ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                    placeholder='nsec1...'
                    autoComplete="off"
                  />
                  {errors.nsec && (
                    <p className="text-sm text-red-500">{errors.nsec}</p>
                  )}
                </div>

                <Button
                  className='w-full rounded-full py-3'
                  onClick={handleKeyLogin}
                  disabled={isLoading || !nsec.trim()}
                >
                  {isLoading ? 'Verifying...' : 'Log In'}
                </Button>

                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-muted'></div>
                  </div>
                  <div className='relative flex justify-center text-xs'>
                    <span className='px-2 bg-background text-muted-foreground'>
                      or
                    </span>
                  </div>
                </div>

                <div className='text-center'>
                  <input
                    type='file'
                    accept='.txt'
                    className='hidden'
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isFileLoading}
                  >
                    <Upload className='w-4 h-4 mr-2' />
                    {isFileLoading ? 'Reading File...' : 'Upload Your Key File'}
                  </Button>
                  {errors.file && (
                    <p className="text-sm text-red-500 mt-2">{errors.file}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value='bunker' className='space-y-3 bg-muted'>
              {!showQrCode ? (
                <>
                  <div className='space-y-2'>
                    <label htmlFor='bunkerUri' className='text-sm font-medium text-gray-700 dark:text-gray-400'>
                      Bunker URI
                    </label>
                    <Input
                      id='bunkerUri'
                      value={bunkerUri}
                      onChange={(e) => {
                        setBunkerUri(e.target.value);
                        if (errors.bunker) setErrors(prev => ({ ...prev, bunker: undefined }));
                      }}
                      className={`rounded-lg border-gray-300 dark:border-gray-700 focus-visible:ring-primary ${
                        errors.bunker ? 'border-red-500' : ''
                      }`}
                      placeholder='bunker://'
                      autoComplete="off"
                    />
                    {errors.bunker && (
                      <p className="text-sm text-red-500">{errors.bunker}</p>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <Button
                      className='w-full rounded-full py-4'
                      onClick={handleBunkerLogin}
                      disabled={isLoading || !bunkerUri.trim()}
                    >
                      {isLoading ? 'Connecting...' : 'Login with Bunker'}
                    </Button>
                  </div>

                  <div className='relative'>
                    <div className='absolute inset-0 flex items-center'>
                      <div className='w-full border-t border-muted'></div>
                    </div>
                    <div className='relative flex justify-center text-xs'>
                      <span className='px-2 bg-background text-muted-foreground'>
                        or
                      </span>
                    </div>
                  </div>

                  <div className='text-center'>
                    <Button
                      variant='outline'
                      className='w-full'
                      onClick={generateNostrConnectQR}
                      disabled={isLoading}
                    >
                      <QrCode className='w-4 h-4 mr-2' />
                      Show QR Code
                    </Button>
                    <p className='text-xs text-muted-foreground mt-2'>
                      Scan with your remote signer app
                    </p>
                  </div>
                </>
              ) : (
                <div className='space-y-4 text-center'>
                  <div className='space-y-2'>
                    <p className='text-sm font-medium'>Scan with your remote signer</p>
                    <p className='text-xs text-muted-foreground'>
                      Use Amber, nsec.app, or another NIP-46 compatible signer
                    </p>
                  </div>

                  <div className='flex justify-center'>
                    <div className='bg-white p-4 rounded-lg inline-block'>
                      <img
                        src={qrCodeDataUrl}
                        alt='Nostr Connect QR Code'
                        className='w-64 h-64'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <p className='text-xs text-muted-foreground'>
                      Waiting for connection...
                    </p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={handleCloseQrCode}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    );
  };

export default LoginDialog;
