import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { gameConfig } from '@/config/gameConfig';
import { Coins, Zap, Play } from 'lucide-react';
import { LoginArea } from '@/components/auth/LoginArea';

interface PaymentGateProps {
  onPaymentComplete: () => void;
  className?: string;
}

export function PaymentGate({ onPaymentComplete, className }: PaymentGateProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useCurrentUser();

  const handlePayment = async () => {
    if (!user) return;

    setIsProcessing(true);
    try {
      // For now, simulate payment - in a real app you'd integrate with a Lightning wallet
      // Using the gameConfig.blockstrPubkey as recipient
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate payment processing

      // Here you would integrate with a Lightning payment provider
      // For now this is a demo, so we simulate the payment

      onPaymentComplete();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreePlay = () => {
    // For demo purposes, allow free play
    onPaymentComplete();
  };

  return (
    <div className={className}>
      <Card className="bg-black border-green-500 border-2">
        <CardHeader className="text-center">
          <CardTitle className="font-retro text-2xl text-green-400 flex items-center justify-center gap-2">
            <Zap className="w-8 h-8" />
            BLOCKSTR
          </CardTitle>
          <CardDescription className="font-retro text-sm text-gray-400">
            Bitcoin-Powered Tetris
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!user ? (
            <div className="text-center space-y-4">
              <div className="text-sm text-gray-300 font-retro">
                Login to play or continue anonymously
              </div>
              <LoginArea className="max-w-60 mx-auto" />
              <Button
                onClick={handleFreePlay}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-retro"
              >
                <Play className="w-4 h-4 mr-2" />
                PLAY ANONYMOUSLY
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-lg font-retro text-white mb-2">Ready to Play!</div>
                <div className="text-sm text-gray-400">
                  Cost: {gameConfig.costToPlay} sats
                </div>
              </div>

              <div className="grid gap-3">
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-retro"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {isProcessing ? 'PROCESSING...' : `PAY ${gameConfig.costToPlay} SATS`}
                </Button>

                <Button
                  onClick={handleFreePlay}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 font-retro"
                >
                  <Play className="w-4 h-4 mr-2" />
                  PLAY FREE (DEMO)
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-center space-y-2 text-gray-500 border-t border-gray-700 pt-4">
            <div>🎮 Speed increases with Bitcoin blocks</div>
            <div>⭐ Bonus blocks give 10x points</div>
            <div>📈 Scores published to Nostr</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}