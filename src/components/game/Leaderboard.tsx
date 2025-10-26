import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthor } from '@/hooks/useAuthor';
import { Trophy, Medal, Award } from 'lucide-react';
import { gameConfig } from '@/config/gameConfig';
import { genUserName } from '@/lib/genUserName';

interface ScoreEvent {
  id: string;
  pubkey: string;
  score: number;
  created_at: number;
  difficulty: string;
  duration: number;
  blocks: number;
}

function ScoreEntry({ scoreEvent, rank }: { scoreEvent: ScoreEvent; rank: number }) {
  const author = useAuthor(scoreEvent.pubkey);
  const displayName = author.data?.metadata?.name ?? genUserName(scoreEvent.pubkey);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-orange-600" />;
      default: return <span className="w-5 h-5 flex items-center justify-center text-gray-400 text-sm">{rank}</span>;
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-700 last:border-b-0">
      <div className="flex-shrink-0">
        {getRankIcon(rank)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-retro text-sm text-white truncate">{displayName}</div>
        <div className="text-xs text-gray-400">
          {scoreEvent.difficulty} • {Math.floor(scoreEvent.duration / 60)}:{(scoreEvent.duration % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="text-right">
        <div className="font-retro text-green-400">{scoreEvent.score.toLocaleString()}</div>
        <div className="text-xs text-orange-400">{scoreEvent.blocks} blocks</div>
      </div>
    </div>
  );
}

export function Leaderboard({ className }: { className?: string }) {
  const { nostr } = useNostr();

  const { data: scores, isLoading, error } = useQuery({
    queryKey: ['leaderboard', gameConfig.gameId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]);

      const events = await nostr.query([
        {
          kinds: [762],
          "#game": [gameConfig.gameId],
          limit: 100
        }
      ], { signal });

      const scores: ScoreEvent[] = events
        .map(event => {
          const scoreTag = event.tags.find(tag => tag[0] === 'score');
          const playerTag = event.tags.find(tag => tag[0] === 'p');
          const difficultyTag = event.tags.find(tag => tag[0] === 'difficulty');
          const durationTag = event.tags.find(tag => tag[0] === 'duration');
          const blocksTag = event.tags.find(tag => tag[0] === 'blocks');

          if (!scoreTag?.[1] || !playerTag?.[1]) return null;

          return {
            id: event.id,
            pubkey: playerTag[1],
            score: parseInt(scoreTag[1] || '0') || 0,
            created_at: event.created_at,
            difficulty: difficultyTag?.[1] || 'unknown',
            duration: parseInt(durationTag?.[1] || '0') || 0,
            blocks: parseInt(blocksTag?.[1] || '0') || 0,
          };
        })
        .filter((score): score is ScoreEvent => score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Top 20

      return scores;
    },
    staleTime: 30000,
    retry: 2,
  });

  return (
    <Card className={`bg-black border-purple-500 border-2 ${className}`}>
      <CardHeader>
        <CardTitle className="font-retro text-purple-400 text-center flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6" />
          LEADERBOARD
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading && (
          <div className="space-y-3 p-4">
            {Array(10).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 bg-gray-700" />
                <div className="flex-1">
                  <Skeleton className="w-24 h-4 bg-gray-700 mb-1" />
                  <Skeleton className="w-16 h-3 bg-gray-700" />
                </div>
                <Skeleton className="w-16 h-4 bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center p-8 text-red-400 font-retro text-sm">
            Failed to load leaderboard
          </div>
        )}

        {scores && scores.length > 0 && (
          <div>
            {scores.map((score, index) => (
              <ScoreEntry key={score.id} scoreEvent={score} rank={index + 1} />
            ))}
          </div>
        )}

        {scores && scores.length === 0 && (
          <div className="text-center p-8 text-gray-400 font-retro text-sm">
            No scores yet.<br />Be the first to play!
          </div>
        )}
      </CardContent>
    </Card>
  );
}