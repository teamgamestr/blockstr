import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { useScorePublishing } from '@/hooks/useScorePublishing';
import { useGamepadMenu } from '@/hooks/useGamepadMenu';
import { useLoginActions } from '@/hooks/useLoginActions';
import { Trophy, Share2, Play, LogOut } from 'lucide-react';
import type { GameState } from '@/types/game';

interface GameOverModalProps {
  isOpen: boolean;
  gameState: GameState;
  sessionId: string;
  duration: number;
  onNewGame: () => void;
  onClose: () => void;
}

export function GameOverModal({
  isOpen,
  gameState,
  sessionId,
  duration,
  onNewGame,
  onClose
}: GameOverModalProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasPublishedScore, setHasPublishedScore] = useState(false);
  const [scoreEventId, setScoreEventId] = useState<string | undefined>();
  const [selectedButton, setSelectedButton] = useState(0); // 0: Publish, 1: Play Again, 2: Logout
  const { publishScore, publishGamePost, canPublish } = useScorePublishing();
  const loginActions = useLoginActions();

  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const playAgainButtonRef = useRef<HTMLButtonElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate available buttons based on state
  const availableButtons = useCallback((): number[] => {
    const buttons: number[] = [];
    if (canPublish && !hasPublishedScore) buttons.push(0); // Publish
    if (canPublish && hasPublishedScore) buttons.push(3); // Share (special case)
    buttons.push(1); // Play Again
    buttons.push(2); // Logout
    return buttons;
  }, [canPublish, hasPublishedScore]);

  // Handler functions defined first
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePublishScore = useCallback(async () => {
    if (!canPublish) return;

    setIsPublishing(true);
    try {
      const scoreEvent = await publishScore({
        sessionId,
        minedScore: gameState.minedScore,
        mempoolScore: gameState.mempoolScore,
        duration: Math.floor(duration / 1000),
        bitcoinBlocksFound: gameState.bitcoinBlocks,
        difficulty: `level-${gameState.level}`,
      });
      setHasPublishedScore(true);
      setScoreEventId(scoreEvent.id);
    } catch (error) {
      console.error('Failed to publish score:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [canPublish, publishScore, sessionId, gameState.minedScore, gameState.mempoolScore, gameState.bitcoinBlocks, gameState.level, duration]);

  const handleShareScore = useCallback(async () => {
    if (!canPublish) return;

    setIsPublishing(true);
    try {
      await publishGamePost({
        sessionId,
        minedScore: gameState.minedScore,
        mempoolScore: gameState.mempoolScore,
        duration: Math.floor(duration / 1000),
        bitcoinBlocksFound: gameState.bitcoinBlocks,
        difficulty: `level-${gameState.level}`,
        message: customMessage || undefined,
        scoreEventId, // Reference the score event
      });
    } catch (error) {
      console.error('Failed to share score:', error);
    } finally {
      setIsPublishing(false);
      onClose();
    }
  }, [canPublish, publishGamePost, sessionId, gameState.minedScore, gameState.mempoolScore, gameState.bitcoinBlocks, gameState.level, duration, customMessage, scoreEventId, onClose]);

  const handleNewGame = useCallback(() => {
    setCustomMessage('');
    setHasPublishedScore(false);
    onNewGame();
  }, [onNewGame]);

  const handleLogout = useCallback(() => {
    // Check where the session originated from
    const sessionOrigin = sessionStorage.getItem('blockstr_session_origin') || '/';

    // Logout the user
    loginActions.logout();

    // Redirect to the appropriate page
    window.location.href = sessionOrigin;
  }, [loginActions]);

  // Reset selected button when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedButton(0);
    }
  }, [isOpen]);

  // Focus the first available button when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Determine which button to focus first
    let firstButton: HTMLButtonElement | null = null;
    if (canPublish && !hasPublishedScore) {
      firstButton = publishButtonRef.current;
    } else if (canPublish && hasPublishedScore) {
      firstButton = shareButtonRef.current;
    } else {
      firstButton = playAgainButtonRef.current;
    }

    if (firstButton) {
      setTimeout(() => {
        firstButton?.focus();
      }, 100);
    }
  }, [isOpen, canPublish, hasPublishedScore]);

  // Keyboard navigation - simplified to not interfere with Tab
  useEffect(() => {
    if (!isOpen || isPublishing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keyboard events if user is typing in textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        // Allow Escape to exit textarea focus
        if (e.key === 'Escape') {
          e.preventDefault();
          target.blur();
          // Focus first available button
          if (canPublish && !hasPublishedScore) {
            publishButtonRef.current?.focus();
          } else if (canPublish && hasPublishedScore) {
            shareButtonRef.current?.focus();
          } else {
            playAgainButtonRef.current?.focus();
          }
        }
        return;
      }

      // Escape to close modal
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPublishing, canPublish, hasPublishedScore, onClose]);

  // Gamepad controls for modal
  useGamepadMenu({
    onConfirm: () => {
      const buttons = availableButtons();
      const actualButton = buttons[selectedButton % buttons.length];

      if (actualButton === 0) handlePublishScore();
      else if (actualButton === 1) handleNewGame();
      else if (actualButton === 2) handleLogout();
      else if (actualButton === 3) handleShareScore();
    },
    onCancel: onClose,
    onNavigateUp: () => {
      const buttons = availableButtons();
      const newIndex = (selectedButton - 1 + buttons.length) % buttons.length;
      setSelectedButton(newIndex);

      // Focus the button
      const buttonRefs = [publishButtonRef, playAgainButtonRef, logoutButtonRef, shareButtonRef];
      const actualButtonIndex = buttons[newIndex];
      buttonRefs[actualButtonIndex]?.current?.focus();
    },
    onNavigateDown: () => {
      const buttons = availableButtons();
      const newIndex = (selectedButton + 1) % buttons.length;
      setSelectedButton(newIndex);

      // Focus the button
      const buttonRefs = [publishButtonRef, playAgainButtonRef, logoutButtonRef, shareButtonRef];
      const actualButtonIndex = buttons[newIndex];
      buttonRefs[actualButtonIndex]?.current?.focus();
    },
    enabled: isOpen && !isPublishing,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-red-500 border-2 font-retro text-white max-w-md" data-allow-scroll>
        <DialogHeader>
          <DialogTitle className="text-center text-red-400 text-xl flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            GAME OVER
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            Final results for this session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Final Stats */}
          <div className="bg-gray-900 border border-gray-700 p-4 rounded space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-green-400">FINAL MINED SCORE</div>
                <div className="text-white text-lg">{gameState.minedScore.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-green-400">LEVEL</div>
                <div className="text-white text-lg">{gameState.level}</div>
              </div>
              <div>
                <div className="text-green-400">LINES</div>
                <div className="text-white">{gameState.linesCleared}</div>
              </div>
              <div>
                <div className="text-green-400">TIME</div>
                <div className="text-white">{formatTime(Math.floor(duration / 1000))}</div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-2 grid grid-cols-2 gap-4">
              <div>
                <div className="text-yellow-400 text-sm">UNMINED SCORE</div>
                <div className="text-white">{gameState.mempoolScore.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-orange-400 text-sm">BLOCKS SURVIVED</div>
                <div className="text-white">{gameState.bitcoinBlocks}</div>
              </div>
            </div>
          </div>

          {/* Share Achievement Section - Only after score is published */}
          {hasPublishedScore && (
            <div className="space-y-3">
              <div className="text-center text-green-400 text-sm">
                ✓ Score saved to Gamestr!
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Share your achievement:</label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder={`Just mined ${gameState.minedScore.toLocaleString()} points in Blockstr! 🎮⚡

Survived ${gameState.bitcoinBlocks} Bitcoin blocks on level ${gameState.level}.

${gameState.mempoolScore > 0 ? `Still have ${gameState.mempoolScore.toLocaleString()} points waiting to be mined!

` : ''}#blockstr #gaming #bitcoin #nostr`}
                  className="bg-gray-900 border-gray-700 text-white text-sm min-h-[100px]"
                />
                <Button
                  ref={shareButtonRef}
                  onClick={handleShareScore}
                  disabled={isPublishing}
                  className="w-full bg-green-600 hover:bg-green-700 focus:bg-green-700 text-white focus:ring-4 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {isPublishing ? 'SHARING...' : 'SHARE SCORE'}
                </Button>
              </div>
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-2">
            {canPublish && !hasPublishedScore && (
              <Button
                ref={publishButtonRef}
                onClick={handlePublishScore}
                disabled={isPublishing}
                className="w-full bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white disabled:opacity-50 focus:ring-4 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
              >
                {isPublishing ? 'PUBLISHING...' : 'SAVE SCORE TO GAMESTR'}
              </Button>
            )}

            <Button
              ref={playAgainButtonRef}
              onClick={handleNewGame}
              className="w-full bg-green-600 hover:bg-green-700 focus:bg-green-700 text-white focus:ring-4 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
            >
              <Play className="w-4 h-4 mr-2" />
              PLAY AGAIN
            </Button>

            <Button
              ref={logoutButtonRef}
              onClick={handleLogout}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 focus:bg-gray-800 hover:border-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              LOGOUT
            </Button>
          </div>

          {!canPublish && (
            <div className="text-center text-gray-500 text-sm">
              Login to save and share your scores on Nostr
            </div>
          )}

          {/* Control hints */}
          <div className="text-center text-[0.65rem] text-gray-600 font-retro space-y-1">
            <div>⌨️ Tab to navigate • Enter to select • ESC to close</div>
            <div>🎮 D-Pad/Stick + A button</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}