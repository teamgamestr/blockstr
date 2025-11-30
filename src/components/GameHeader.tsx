import React from 'react';
import { Music2, VolumeX } from 'lucide-react';
import { LoginArea } from '@/components/auth/LoginArea';
import { cn } from '@/lib/utils';

interface GameHeaderProps {
  className?: string;
  musicEnabled?: boolean;
  musicPlaying?: boolean;
  isMusicSupported?: boolean;
  onToggleMusic?: () => void;
}

export function GameHeader({
  className,
  musicEnabled = false,
  musicPlaying = false,
  isMusicSupported = true,
  onToggleMusic,
}: GameHeaderProps) {
  const showMusicToggle = typeof onToggleMusic === 'function';

  return (
    <header className={cn(
      'flex items-center justify-between p-2 sm:p-3 lg:p-4 bg-black border-b border-gray-700 overflow-hidden',
      className,
    )}>
      <div className="flex-shrink min-w-0">
        <h1 className="font-retro text-base sm:text-lg lg:text-2xl text-green-400">BLOCKSTR</h1>
        <p className="font-retro text-[0.55rem] sm:text-xs text-gray-400 hidden xs:block">Bitcoin-Powered Tetris</p>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
        {showMusicToggle && (
          <button
            type="button"
            onClick={onToggleMusic}
            disabled={!isMusicSupported}
            aria-pressed={musicEnabled}
            className={cn(
              'inline-flex items-center gap-1.5 rounded border border-gray-700 bg-gray-900 px-2 py-1 font-retro text-[0.55rem] uppercase tracking-wide transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400',
              !isMusicSupported && 'opacity-50 cursor-not-allowed',
            )}
            title={isMusicSupported ? 'Toggle chiptune background music' : 'Audio not supported in this browser'}
          >
            {musicEnabled ? (
              <Music2 className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            )}
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                musicPlaying ? 'bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.9)]' : 'bg-gray-500',
              )}
              aria-hidden="true"
            />
            <span>{musicEnabled ? 'BGM ON' : 'BGM OFF'}</span>
            <span className="sr-only">Background music toggle</span>
          </button>
        )}

        <div className="flex-shrink-0 min-w-0">
          <LoginArea className="max-w-[140px] sm:max-w-none" />
        </div>
      </div>
    </header>
  );
}
