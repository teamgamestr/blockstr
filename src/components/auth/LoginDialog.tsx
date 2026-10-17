// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Shield, Upload, AlertTriangle, UserPlus, KeyRound, Sparkles, Cloud, QrCode, ExternalLink, Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useNostrConnect } from '@/hooks/useNostrConnect';
import { cn } from '@/lib/utils';
import { appRelayUrls } from '@/config/relays';

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

/**
 * Hands a NIP-46 connection to a signer app. The nostrconnect:// link is claimed
 * by the OS: Opal registers the scheme on desktop, Amber on Android, so the button
 * opens whichever one is installed instead of asking the user to scan a QR code.
 */
const SignerAppPanel: React.FC<{ onConnected: () => void }> = ({ onConnected }) => {
  const { status, uri, qrCodeDataUrl, error, start, cancel } = useNostrConnect({
    relays: appRelayUrls,
    onConnected,
  });
  const [showQrCode, setShowQrCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Start a fresh connection as soon as the tab opens, so the link is ready the
  // moment the user reaches for a signer.
  useEffect(() => {
    start();
    return () => cancel();
  }, [start, cancel]);

  const copyLink = useCallback(async () => {
    if (!uri) return;
    try {
      await navigator.clipboard.writeText(uri);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [uri]);

  const waiting = status === 'waiting';

  return (
    <div className='space-y-3'>
      <div className='p-4 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-3'>
        <div className='flex items-center gap-2'>
          <Sparkles className='w-4 h-4 text-primary' />
          <p className='text-sm font-medium'>Connect a signer app</p>
        </div>
        <p className='text-xs text-muted-foreground'>
          Hands this connection straight to Opal on desktop or Amber on mobile — any NIP-46 signer.
        </p>

        <Button className='w-full rounded-full py-4' asChild disabled={!uri}>
          {uri ? (
            <a href={uri} rel='noopener noreferrer'>
              <ExternalLink className='w-4 h-4 mr-2' />
              Open signer app
            </a>
          ) : (
            <span>
              <ExternalLink className='w-4 h-4 mr-2' />
              Preparing connection…
            </span>
          )}
        </Button>

        <div className='grid grid-cols-2 gap-2'>
          <Button variant='outline' onClick={copyLink} disabled={!uri}>
            {copied ? <Check className='w-4 h-4 mr-2' /> : <Copy className='w-4 h-4 mr-2' />}
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button variant='outline' onClick={() => setShowQrCode((value) => !value)} disabled={!uri}>
            <QrCode className='w-4 h-4 mr-2' />
            {showQrCode ? 'Hide QR' : 'Show QR'}
          </Button>
        </div>

        {waiting && (
          <p className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
            <Loader2 className='w-3 h-3 animate-spin' />
            Waiting for the signer to approve…
          </p>
        )}

        {error && (
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showQrCode && qrCodeDataUrl && (
          <div className='flex justify-center'>
            <div className='bg-white p-3 rounded-lg inline-block'>
              <img
                src={qrCodeDataUrl}
                alt='Nostr Connect QR Code'
                className='w-56 h-56'
              />
            </div>
          </div>
        )}

        {uri && (
          <p className='text-[0.65rem] leading-tight text-muted-foreground break-all max-h-16 overflow-y-auto rounded border border-border/60 p-2 font-mono'>
            {uri}
          </p>
        )}
      </div>
    </div>
  );
};

const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onLogin, onSignup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [bunkerUri, setBunkerUri] = useState('');
  const [errors, setErrors] = useState<{
    nsec?: string;
    bunker?: string;
    file?: string;
    extension?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const login = useLoginActions();

  // Reset all state when dialog opens/closes
  useEffect(() => {
    setIsLoading(false);
    setIsFileLoading(false);
    setNsec('');
    setBunkerUri('');
    setErrors({});

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [isOpen]);

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
      console.error('Plugin login failed:', error);
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
      await login.bunker(bunkerUri);

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

  // Someone without a browser extension is most likely to have a signer app on
  // their phone or desktop, so send them straight to that tab.
  const defaultTab = 'nostr' in window ? 'extension' : 'bunker';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn("max-w-[95vw] sm:max-w-md max-h-[90vh] max-h-[90dvh] p-0 overflow-hidden rounded-2xl overflow-y-scroll")}
      >
        <DialogHeader className={cn('px-6 pt-6 pb-1 relative')}>

            <DialogTitle className="sr-only">Log in to Blockstr</DialogTitle>
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
                <span>Signer</span>
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

            <TabsContent value='bunker' className='space-y-4 bg-muted'>
              <SignerAppPanel
                onConnected={() => {
                  onLogin();
                  onClose();
                }}
              />

              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-muted'></div>
                </div>
                <div className='relative flex justify-center text-xs'>
                  <span className='px-2 bg-background text-muted-foreground'>
                    or paste a bunker link
                  </span>
                </div>
              </div>

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
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    );
  };

export default LoginDialog;
