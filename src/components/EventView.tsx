import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';
import { useEvent } from '@/hooks/useEvent';
import { useAuthor } from '@/hooks/useAuthor';
import { useReactionStats } from '@/hooks/useReactions';
import { useRepostStats } from '@/hooks/useReposts';
import { useQuoteStats } from '@/hooks/useQuotes';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NoteContent } from '@/components/NoteContent';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { genUserName } from '@/lib/genUserName';
import { Heart, Repeat2, MessageSquare, Trophy } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { Link } from 'react-router-dom';

interface EventViewProps {
  eventId: string;
}

export function EventView({ eventId }: EventViewProps) {
  const { data: event, isLoading } = useEvent(eventId);
  const author = useAuthor(event?.pubkey);
  const { likes } = useReactionStats(eventId);
  const { count: repostCount } = useRepostStats(eventId);
  const { count: quoteCount } = useQuoteStats(eventId);

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-6">
      <EventCard event={event} author={author.data} />

      {/* Social Stats */}
      <Card>
        <CardContent className="py-4">
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-semibold">{likes}</span>
              <span className="text-muted-foreground">likes</span>
            </div>
            <div className="flex items-center gap-2">
              <Repeat2 className="h-4 w-4 text-green-500" />
              <span className="font-semibold">{repostCount}</span>
              <span className="text-muted-foreground">reposts</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">{quoteCount}</span>
              <span className="text-muted-foreground">quotes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <CommentsSection root={event} />
    </div>
  );
}

function EventCard({ event, author }: { event: NostrEvent; author: { metadata?: NostrMetadata; event?: NostrEvent } | undefined }) {
  const metadata = author?.metadata;
  const displayName = metadata?.display_name || metadata?.name || genUserName(event.pubkey);
  const npub = nip19.npubEncode(event.pubkey);
  const date = new Date(event.created_at * 1000);

  // Check if this is a game score event (kind 1001)
  const isGameScore = event.kind === 1001;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Link to={`/${npub}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link to={`/${npub}`} className="font-semibold hover:underline">
                {displayName}
              </Link>
              <Badge variant="secondary">Kind {event.kind}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {date.toLocaleString()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isGameScore ? (
          <GameScoreContent event={event} />
        ) : (
          <div className="whitespace-pre-wrap break-words">
            <NoteContent event={event} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GameScoreContent({ event }: { event: NostrEvent }) {
  const score = event.tags.find(([name]) => name === 'score')?.[1];
  const difficulty = event.tags.find(([name]) => name === 'difficulty')?.[1];
  const duration = event.tags.find(([name]) => name === 'duration')?.[1];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <span className="text-2xl font-bold font-['Press_Start_2P']">
          {score ? parseInt(score).toLocaleString() : 'N/A'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Difficulty</div>
          <div className="font-semibold">{difficulty || 'N/A'} blocks</div>
        </div>
        <div>
          <div className="text-muted-foreground">Duration</div>
          <div className="font-semibold">
            {duration ? `${Math.floor(parseInt(duration) / 60)}m ${parseInt(duration) % 60}s` : 'N/A'}
          </div>
        </div>
      </div>
      {event.content && (
        <div className="pt-4 border-t">
          <NoteContent event={event} />
        </div>
      )}
    </div>
  );
}
