import { nip19 } from 'nostr-tools';
import { useProfile } from '@/hooks/useProfile';
import { useNostr } from '@/hooks/useNostr';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { genUserName } from '@/lib/genUserName';
import { ExternalLink, Calendar, Trophy } from 'lucide-react';

interface ProfileViewProps {
  pubkey: string;
}

export function ProfileView({ pubkey }: ProfileViewProps) {
  const { data: profile, isLoading: profileLoading } = useProfile(pubkey);
  const { nostr } = useNostr();

  // Fetch user's game scores (kind 1001)
  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ['user-scores', pubkey],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      const events = await nostr.query(
        [{ kinds: [1001], authors: [pubkey], limit: 50 }],
        { signal }
      );
      return events.sort((a, b) => {
        const scoreA = parseInt(a.tags.find(([name]) => name === 'score')?.[1] || '0');
        const scoreB = parseInt(b.tags.find(([name]) => name === 'score')?.[1] || '0');
        return scoreB - scoreA;
      });
    },
  });

  const metadata = profile?.metadata;
  const displayName = metadata?.display_name || metadata?.name || genUserName(pubkey);
  const npub = nip19.npubEncode(pubkey);

  // Calculate stats
  const totalGames = scores.length;
  const highScore = scores.length > 0 
    ? parseInt(scores[0].tags.find(([name]) => name === 'score')?.[1] || '0')
    : 0;
  const totalBlocksSurvived = scores.reduce((sum, score) => {
    const difficulty = parseInt(score.tags.find(([name]) => name === 'difficulty')?.[1] || '0');
    return sum + difficulty;
  }, 0);

  if (profileLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <h1 className="text-3xl font-bold">{displayName}</h1>
                {metadata?.nip05 && (
                  <p className="text-sm text-muted-foreground">{metadata.nip05}</p>
                )}
              </div>
              {metadata?.about && (
                <p className="text-muted-foreground">{metadata.about}</p>
              )}
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                <code className="text-xs bg-muted px-2 py-1 rounded">{npub.slice(0, 16)}...</code>
                {metadata?.website && (
                  <a 
                    href={metadata.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Game Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-3xl font-bold font-['Press_Start_2P']">{highScore.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-1">High Score</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-3xl font-bold font-['Press_Start_2P']">{totalGames}</div>
              <div className="text-sm text-muted-foreground mt-1">Games Played</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl mx-auto mb-2">⛓️</div>
              <div className="text-3xl font-bold font-['Press_Start_2P']">{totalBlocksSurvived}</div>
              <div className="text-sm text-muted-foreground mt-1">Blocks Survived</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scores */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">Recent Scores</h2>
        </CardHeader>
        <CardContent>
          {scoresLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : scores.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No games played yet</p>
          ) : (
            <div className="space-y-2">
              {scores.slice(0, 10).map((score, index) => {
                const scoreValue = parseInt(score.tags.find(([name]) => name === 'score')?.[1] || '0');
                const difficulty = parseInt(score.tags.find(([name]) => name === 'difficulty')?.[1] || '0');
                const duration = parseInt(score.tags.find(([name]) => name === 'duration')?.[1] || '0');
                const date = new Date(score.created_at * 1000);

                return (
                  <div key={score.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-['Press_Start_2P'] text-sm">{scoreValue.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {difficulty} blocks • {Math.floor(duration / 60)}m {duration % 60}s
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {date.toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
