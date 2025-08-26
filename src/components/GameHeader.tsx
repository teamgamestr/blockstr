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
    <header className={`flex items-center justify-between p-4 bg-black border-b border-gray-700 ${className}`}>
      <div>
        <h1 className="font-retro text-2xl text-green-400">BLOCKSTR</h1>
        <p className="font-retro text-xs text-gray-400">Bitcoin-Powered Tetris</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Settings Sheet for Relay Selection */}
        <Sheet open={showSettings} onOpenChange={setShowSettings}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Settings className="w-4 h-4 mr-2" />
              Settings
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
        <LoginArea className="max-w-48" />
      </div>
    </header>
  );
}