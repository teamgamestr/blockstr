import React from 'react';
import { LoginArea } from '@/components/auth/LoginArea';

interface GameHeaderProps {
  className?: string;
}

export function GameHeader({ className }: GameHeaderProps) {
  return (
    <header className={`flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-black border-b border-gray-700 overflow-hidden ${className}`}>
      <div className="flex-shrink min-w-0">
        <h1 className="font-retro text-base sm:text-lg lg:text-2xl text-green-400">BLOCKSTR</h1>
        <p className="font-retro text-[0.55rem] sm:text-xs text-gray-400 hidden xs:block">Bitcoin-Powered Tetris</p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        {/* Login/Account Area */}
        <div className="flex-shrink-0 min-w-0">
          <LoginArea className="max-w-[140px] sm:max-w-none" />
        </div>
      </div>
    </header>
  );
}