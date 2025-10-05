import React, { useState } from 'react';
import { LoginArea } from '@/components/auth/LoginArea';
import { RelaySelector } from '@/components/RelaySelector';
import { Button } from '@/components/ui/button';
import { Settings, Wifi } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';

interface GameHeaderProps {
  className?: string;
}

export function GameHeader({ className }: GameHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { user } = useCurrentUser();
  const { logout } = useLoginActions();

  const handleLogout = () => {
    logout();
    setShowSettings(false);
  };

  return (
    <header className={`flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-black border-b border-gray-700 overflow-hidden ${className}`}>
      <div className="flex-shrink min-w-0">
        <h1 className="font-retro text-base sm:text-lg lg:text-2xl text-green-400">BLOCKSTR</h1>
        <p className="font-retro text-[0.55rem] sm:text-xs text-gray-400 hidden xs:block">Bitcoin-Powered Tetris</p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        {/* Settings Sheet for Relay Selection */}
        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetTrigger asChild>
            <Button
              size="sm"
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full bg-primary text-primary-foreground font-medium transition-all hover:bg-primary/90 h-8 sm:h-9 text-xs sm:text-sm"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-black border-gray-700 text-white">
            <SheetHeader>
              <SheetTitle className="text-white font-retro">Game Settings</SheetTitle>
              <SheetDescription className="text-gray-400">
                Configure your Nostr relay and publishing preferences
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Relay Selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <h3 className="font-retro text-sm text-green-400">NOSTR RELAY</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Choose which relay to connect to for reading events and publishing scores
                </p>
                <RelaySelector className="w-full" />
              </div>

              {/* Account Actions */}
              {user && (
                <div className="border-t border-gray-700 pt-6">
                  <h3 className="font-retro text-sm text-red-400 mb-3">ACCOUNT</h3>
                  <Button
                    onClick={handleLogout}
                    variant="destructive"
                    className="w-full"
                  >
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Login/Account Area */}
        <div className="flex-shrink-0 min-w-0">
          <LoginArea className="max-w-[140px] sm:max-w-none" />
        </div>
      </div>
    </header>
  );
}