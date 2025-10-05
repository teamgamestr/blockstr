import { useState } from 'react';
import { Heart, Repeat2, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useReactionStats, useUserReaction } from '@/hooks/useReactions';
import { useRepostStats, useUserRepost } from '@/hooks/useReposts';
import { useToast } from '@/hooks/useToast';
import { nip19 } from 'nostr-tools';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface SocialActionsProps {
  eventId: string;
  className?: string;
}

export function SocialActions({ eventId, className }: SocialActionsProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();
  const { toast } = useToast();
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');

  const { likes } = useReactionStats(eventId);
  const { count: repostCount } = useRepostStats(eventId);
  const userReaction = useUserReaction(eventId, user?.pubkey);
  const userRepost = useUserRepost(eventId, user?.pubkey);

  const hasLiked = !!userReaction && userReaction.content === '+';
  const hasReposted = !!userRepost;

  const handleLike = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to like this post',
        variant: 'destructive',
      });
      return;
    }

    if (hasLiked) {
      toast({
        title: 'Already Liked',
        description: 'You have already liked this post',
      });
      return;
    }

    createEvent({
      kind: 7,
      content: '+',
      tags: [['e', eventId]],
    });

    toast({
      title: 'Liked!',
      description: 'Your reaction has been published',
    });
  };

  const handleRepost = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to repost',
        variant: 'destructive',
      });
      return;
    }

    if (hasReposted) {
      toast({
        title: 'Already Reposted',
        description: 'You have already reposted this',
      });
      return;
    }

    createEvent({
      kind: 6,
      content: '',
      tags: [['e', eventId]],
    });

    toast({
      title: 'Reposted!',
      description: 'Your repost has been published',
    });
  };

  const handleQuote = () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to quote',
        variant: 'destructive',
      });
      return;
    }

    setQuoteDialogOpen(true);
  };

  const submitQuote = () => {
    if (!quoteContent.trim()) {
      toast({
        title: 'Empty Quote',
        description: 'Please add some text to your quote',
        variant: 'destructive',
      });
      return;
    }

    createEvent({
      kind: 1,
      content: quoteContent,
      tags: [
        ['e', eventId],
        ['q', eventId],
      ],
    });

    toast({
      title: 'Quote Posted!',
      description: 'Your quote has been published',
    });

    setQuoteContent('');
    setQuoteDialogOpen(false);
  };

  const handleShare = () => {
    const nevent = nip19.neventEncode({ id: eventId });
    const url = `${window.location.origin}/${nevent}`;

    if (navigator.share) {
      navigator.share({
        title: 'Check out this Blockstr score!',
        url,
      }).catch(() => {
        // User cancelled share
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({
        title: 'Link Copied!',
        description: 'Event link copied to clipboard',
      });
    }
  };

  return (
    <>
      <div className={className}>
        <div className="flex gap-2">
          <Button
            variant={hasLiked ? 'default' : 'outline'}
            size="sm"
            onClick={handleLike}
            disabled={hasLiked}
          >
            <Heart className={`h-4 w-4 mr-2 ${hasLiked ? 'fill-current' : ''}`} />
            {likes > 0 && <span>{likes}</span>}
          </Button>

          <Button
            variant={hasReposted ? 'default' : 'outline'}
            size="sm"
            onClick={handleRepost}
            disabled={hasReposted}
          >
            <Repeat2 className="h-4 w-4 mr-2" />
            {repostCount > 0 && <span>{repostCount}</span>}
          </Button>

          <Button variant="outline" size="sm" onClick={handleQuote}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Quote
          </Button>

          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quote Post</DialogTitle>
            <DialogDescription>
              Add your thoughts about this post
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What do you think?"
              value={quoteContent}
              onChange={(e) => setQuoteContent(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setQuoteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitQuote}>Post Quote</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
