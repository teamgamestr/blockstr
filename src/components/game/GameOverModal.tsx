import React, { useState, useRef, useEffect } from 'react';
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
import { Trophy, Share2, Play } from 'lucide-react';
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
  const [selectedButton, setSelectedButton] = useState(0); // 0: New Game, 1: Close, 2: Publish, 3: Share
  const { publishScore, publishGamePost, canPublish } = useScorePublishing();

  const newGameButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const publishButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  // Calculate available buttons based on state
  const availableButtons = (): number[] => {
    const buttons: number[] = [];
    if (canPublish && !hasPublishedScore) buttons.push(2); // Publish
    if (canPublish && hasPublishedScore) buttons.push(3); // Share
    buttons.push(0); // New Game
    buttons.push(1); // Close
    return buttons;
  };

  // Reset selected button when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedButton(0);
    }
  }, [isOpen]);

  // Focus the selected button
  useEffect(() => {
    const buttons = [newGameButtonRef, closeButtonRef, publishButtonRef, shareButtonRef];
    const currentButton = buttons[selectedButton]?.current;
    if (currentButton && isOpen) {
      currentButton.focus();
    }
  }, [selectedButton, isOpen, hasPublishedScore]);

  // Gamepad controls for modal
  useGamepadMenu({
    onConfirm: () => {
      const buttons = availableButtons();
      const actualButton = buttons[selectedButton % buttons.length];

      if (actualButton === 0) handleNewGame();
      else if (actualButton === 1) onClose();
      else if (actualButton === 2) handlePublishScore();
      else if (actualButton === 3) handleShareScore();
    },
    onCancel: onClose,
    onNavigateUp: () => {
      const buttons = availableButtons();
      setSelectedButton((prev) => (prev - 1 + buttons.length) % buttons.length);
    },
    onNavigateDown: () => {
      const buttons = availableButtons();
      setSelectedButton((prev) => (prev + 1) % buttons.length);
    },
    enabled: isOpen && !isPublishing,
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePublishScore = async () => {
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
  };

  const handleShareScore = async () => {
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
  };

  const handleNewGame = () => {
    setCustomMessage('');
    setHasPublishedScore(false);
    onNewGame();
  };

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

          {/* Publishing Options */}
          {canPublish && (
            <div className="space-y-3">
              {!hasPublishedScore && (
                <Button
                  ref={publishButtonRef}
                  onClick={handlePublishScore}
                  disabled={isPublishing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 focus:ring-2 focus:ring-blue-400"
                >
                  {isPublishing ? 'PUBLISHING...' : 'SAVE SCORE TO NOSTR'}
                </Button>
              )}

              {hasPublishedScore && (
                <>
                  <div className="text-center text-green-400 text-sm">
                    ✓ Score saved to Nostr!
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Share your achievement:</label>
                    <Textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder={`Just mined ${gameState.minedScore.toLocaleString()} points in Blockstr! 🎮⚡\n\nSurvived ${gameState.bitcoinBlocks} Bitcoin blocks on level ${gameState.level}.\n\n${gameState.mempoolScore > 0 ? `Still have ${gameState.mempoolScore.toLocaleString()} points waiting to be mined!\\n\\n` : ''}#blockstr #gaming #bitcoin #nostr`}
                      className="bg-gray-900 border-gray-700 text-white text-sm min-h-[100px]"
                    />
                    <Button
                      ref={shareButtonRef}
                      onClick={handleShareScore}
                      disabled={isPublishing}
                      className="w-full bg-green-600 hover:bg-green-700 text-white focus:ring-2 focus:ring-green-400"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      {isPublishing ? 'SHARING...' : 'SHARE SCORE'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {!canPublish && (
            <div className="text-center text-gray-500 text-sm">
              Login to save and share your scores on Nostr
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              ref={newGameButtonRef}
              onClick={handleNewGame}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white focus:ring-2 focus:ring-green-400"
            >
              <Play className="w-4 h-4 mr-2" />
              NEW GAME
            </Button>
            <Button
              ref={closeButtonRef}
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 focus:ring-2 focus:ring-gray-400"
            >
              CLOSE
            </Button>
          </div>

          {/* Gamepad hint */}
          <div className="text-center text-xs text-gray-600 font-retro">
            🎮 Use D-Pad/Stick + A button
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}