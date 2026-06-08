import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { useScorePublishing } from '@/hooks/useScorePublishing';
import { useGamepadMenu } from '@/hooks/useGamepadMenu';
import { useLoginActions } from '@/hooks/useLoginActions';
import { Trophy, Share2, Play, LogOut, ExternalLink } from 'lucide-react';
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [hasPublishedScore, setHasPublishedScore] = useState(false);
  const [scoreEventId, setScoreEventId] = useState<string | undefined>();
  const [hasAttemptedScoreSave, setHasAttemptedScoreSave] = useState(false);
  const [shareComplete, setShareComplete] = useState(false);
  const [selectedButton, setSelectedButton] = useState(0); // 0: Publish, 1: Play Again, 2: Logout
  const { publishScore, publishGamePost, canPublishScore, canSharePost } = useScorePublishing();
  const loginActions = useLoginActions();
  const isConferenceMode = typeof window !== 'undefined' && sessionStorage.getItem('blockstr_session_origin') === '/conference';

  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const playAgainButtonRef = useRef<HTMLButtonElement>(null);
  const logoutButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  const scoreUrl = scoreEventId
    ? `https://gamestr.io/blockstr/score/${scoreEventId}`
    : null;

  // Calculate available buttons based on state
  const availableButtons = useCallback((): number[] => {
    const buttons: number[] = [];
    if (hasPublishedScore && scoreUrl) buttons.push(0); // View score
    if (canSharePost && hasPublishedScore && !shareComplete) buttons.push(3); // Share (special case)
    buttons.push(1); // Play Again
    buttons.push(2); // Logout
    return buttons;
  }, [canSharePost, hasPublishedScore, scoreUrl, shareComplete]);

  // Handler functions defined first
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePublishScore = useCallback(async () => {
    if (!canPublishScore) return;

    setHasAttemptedScoreSave(true);
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
  }, [canPublishScore, publishScore, sessionId, gameState.minedScore, gameState.mempoolScore, gameState.bitcoinBlocks, gameState.level, duration]);

  const handleShareScore = useCallback(async () => {
    if (!canSharePost || !scoreEventId) return;

    setIsPublishing(true);
    try {
      await publishGamePost({
        sessionId,
        minedScore: gameState.minedScore,
        mempoolScore: gameState.mempoolScore,
        duration: Math.floor(duration / 1000),
        bitcoinBlocksFound: gameState.bitcoinBlocks,
        difficulty: `level-${gameState.level}`,
        scoreEventId, // Reference the score event
        scoreUrl: scoreUrl ?? undefined,
      });
      setShareComplete(true);
    } catch (error) {
      console.error('Failed to share score:', error);
    } finally {
      setIsPublishing(false);
    }
  }, [canSharePost, publishGamePost, sessionId, gameState.minedScore, gameState.mempoolScore, gameState.bitcoinBlocks, gameState.level, duration, scoreEventId, scoreUrl]);

  const handleNewGame = useCallback(() => {
    setHasPublishedScore(false);
    setScoreEventId(undefined);
    setHasAttemptedScoreSave(false);
    setShareComplete(false);
    onNewGame();
  }, [onNewGame]);

  const handleViewScore = useCallback(() => {
    if (scoreUrl) {
      window.open(scoreUrl, '_blank', 'noopener,noreferrer');
    }
  }, [scoreUrl]);

  const handleLogout = useCallback(() => {
    // Check where the session originated from
    const sessionOrigin = sessionStorage.getItem('blockstr_session_origin') || '/';

    // Logout the user
    loginActions.logout();

    // Redirect to the appropriate page
    if (window.location.pathname !== sessionOrigin) {
      window.location.href = sessionOrigin;
    }
  }, [loginActions]);

  const handleClose = useCallback(() => {
    if (isConferenceMode) {
      handleLogout();
      return;
    }

    onClose();
  }, [handleLogout, isConferenceMode, onClose]);

  const focusButtonByAction = useCallback((action: number) => {
    if (action === 0) publishButtonRef.current?.focus();
    if (action === 1) playAgainButtonRef.current?.focus();
    if (action === 2) logoutButtonRef.current?.focus();
    if (action === 3) shareButtonRef.current?.focus();
  }, []);

  const focusButtonByIndex = useCallback((index: number) => {
    const buttons = availableButtons();
    if (buttons.length === 0) return;

    const nextIndex = (index + buttons.length) % buttons.length;
    setSelectedButton(nextIndex);
    focusButtonByAction(buttons[nextIndex]);
  }, [availableButtons, focusButtonByAction]);

  const activateSelectedButton = useCallback(() => {
    const buttons = availableButtons();
    if (buttons.length === 0) return;

    const actualButton = buttons[selectedButton % buttons.length];

    if (actualButton === 0) handleViewScore();
    else if (actualButton === 1) handleNewGame();
    else if (actualButton === 2) handleLogout();
    else if (actualButton === 3) handleShareScore();
  }, [availableButtons, handleLogout, handleNewGame, handleShareScore, handleViewScore, selectedButton]);

  // Reset selected button when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedButton(0);
      setHasPublishedScore(false);
      setScoreEventId(undefined);
      setHasAttemptedScoreSave(false);
      setShareComplete(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const buttons = availableButtons();
    if (selectedButton >= buttons.length) {
      setSelectedButton(0);
    }
  }, [availableButtons, selectedButton]);

  useEffect(() => {
    if (!isOpen || !canPublishScore || hasPublishedScore || isPublishing || scoreEventId || hasAttemptedScoreSave) return;
    void handlePublishScore();
  }, [canPublishScore, handlePublishScore, hasAttemptedScoreSave, hasPublishedScore, isOpen, isPublishing, scoreEventId]);

  // Focus the first available button when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Determine which button to focus first
    let firstButton: HTMLButtonElement | null = null;
    if (hasPublishedScore && scoreUrl) {
      firstButton = publishButtonRef.current;
    } else if (canSharePost && hasPublishedScore) {
      firstButton = shareButtonRef.current;
    } else {
      firstButton = playAgainButtonRef.current;
    }

    if (firstButton) {
      setTimeout(() => {
        firstButton?.focus();
      }, 100);
    }
  }, [isOpen, canSharePost, hasPublishedScore, scoreUrl]);

  useEffect(() => {
    if (!isOpen || isPublishing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          e.preventDefault();
          target.blur();
          focusButtonByIndex(selectedButton);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        focusButtonByIndex(selectedButton - 1);
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        focusButtonByIndex(selectedButton + 1);
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateSelectedButton();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activateSelectedButton, focusButtonByIndex, handleClose, isOpen, isPublishing, selectedButton]);

  // Gamepad controls for modal
  useGamepadMenu({
    onConfirm: activateSelectedButton,
    onCancel: handleClose,
    onNavigateUp: () => focusButtonByIndex(selectedButton - 1),
    onNavigateDown: () => focusButtonByIndex(selectedButton + 1),
    onNavigateLeft: () => focusButtonByIndex(selectedButton - 1),
    onNavigateRight: () => focusButtonByIndex(selectedButton + 1),
    enabled: isOpen && !isPublishing,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="bg-black border-red-500 border-2 font-retro text-white max-w-md" data-allow-scroll>
        <DialogHeader>
          <DialogTitle className="text-center text-red-400 text-xl flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            GAME OVER
          </DialogTitle>
          <DialogDescription className="text-center text-gray-400">
            {isConferenceMode ? 'Play again as this player, or log out for the next player.' : 'Final results for this session'}
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

          {canPublishScore && (
            <div className="space-y-3">
              <div className="text-center text-sm">
                {hasPublishedScore ? (
                  <span className="text-green-400">✓ Score saved to Gamestr!</span>
                ) : isPublishing ? (
                  <span className="text-blue-400">Saving score to Gamestr...</span>
                ) : (
                  <span className="text-red-400">Score could not be saved automatically.</span>
                )}
              </div>
              {hasPublishedScore && canSharePost && (
                <Button
                ref={shareButtonRef}
                onClick={handleShareScore}
                disabled={isPublishing || !canSharePost || shareComplete}
                onFocus={() => setSelectedButton(availableButtons().indexOf(3))}
                className="w-full bg-green-600 hover:bg-green-700 focus:bg-green-700 text-white focus:ring-4 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
              >
                  <Share2 className="w-4 h-4 mr-2" />
                  {shareComplete ? 'SHARED ON NOSTR' : isPublishing ? 'SHARING...' : 'SHARE SCORE ON NOSTR'}
                </Button>
              )}
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="space-y-2">
            {hasPublishedScore && scoreUrl && (
              <Button
                ref={publishButtonRef}
                onClick={handleViewScore}
                onFocus={() => setSelectedButton(availableButtons().indexOf(0))}
                className="w-full bg-blue-600 hover:bg-blue-700 focus:bg-blue-700 text-white disabled:opacity-50 focus:ring-4 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                VIEW SCORE ON GAMESTR
              </Button>
            )}

            <Button
              ref={playAgainButtonRef}
              onClick={handleNewGame}
              onFocus={() => setSelectedButton(availableButtons().indexOf(1))}
              className="w-full bg-green-600 hover:bg-green-700 focus:bg-green-700 text-white focus:ring-4 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
            >
              <Play className="w-4 h-4 mr-2" />
              PLAY AGAIN
            </Button>

            <Button
              ref={logoutButtonRef}
              onClick={handleLogout}
              variant="outline"
              onFocus={() => setSelectedButton(availableButtons().indexOf(2))}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 focus:bg-gray-800 hover:border-gray-400 focus:border-gray-400 focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-black transition-all"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {isConferenceMode ? 'LOG OUT FOR NEXT PLAYER' : 'LOGOUT'}
            </Button>
          </div>

          {!canPublishScore && (
            <div className="text-center text-gray-500 text-sm">
              Login with Nostr to save and share your scores
            </div>
          )}

          {/* Control hints */}
          <div className="text-center text-[0.65rem] text-gray-600 font-retro space-y-1">
            <div>{isConferenceMode ? '⌨️ Tab to navigate • Enter to select • ESC logs out' : '⌨️ Tab to navigate • Enter to select • ESC to close'}</div>
            <div>🎮 D-Pad/Stick + A button</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
