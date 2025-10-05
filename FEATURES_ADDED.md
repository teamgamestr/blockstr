# New Features Added to Blockstr

This document summarizes the social and engagement features added to enhance Blockstr's viral potential and user experience.

## Social Interaction Hooks

### 1. **useReactions** (`src/hooks/useReactions.ts`)
Fetch and track reactions (kind 7 events) on any Nostr event.

**Features:**
- `useReactions(eventId)` - Fetch all reactions for an event
- `useReactionStats(eventId)` - Get aggregated stats (likes, dislikes, total)
- `useUserReaction(eventId, userPubkey)` - Check if a specific user has reacted

**Use Cases:**
- Display like counts on game scores
- Show if current user has already liked a score
- Track different reaction types (👍, 👎, ❤️, etc.)

### 2. **useReposts** (`src/hooks/useReposts.ts`)
Fetch and track reposts (kind 6 & 16 events).

**Features:**
- `useReposts(eventId)` - Fetch all reposts (combines kind 6 and 16 in one query)
- `useRepostStats(eventId)` - Get repost count
- `useUserRepost(eventId, userPubkey)` - Check if user has reposted

**Use Cases:**
- Display repost counts on high scores
- Prevent duplicate reposts
- Show viral spread of achievements

### 3. **useQuotes** (`src/hooks/useQuotes.ts`)
Fetch and track quote reposts (kind 1 events with q tag).

**Features:**
- `useQuotes(eventId)` - Fetch all quote reposts
- `useQuoteStats(eventId)` - Get quote count
- `useUserQuote(eventId, userPubkey)` - Check if user has quoted

**Use Cases:**
- Show commentary on game scores
- Display quote discussions
- Track viral quote chains

### 4. **useThread** (`src/hooks/useThread.ts`)
Fetch conversation threads and event ancestors.

**Features:**
- `useThread(rootEventId)` - Fetch root event and all replies
- `useAncestors(eventId)` - Fetch all parent events in a thread

**Use Cases:**
- Display threaded discussions on scores
- Show full conversation context
- Navigate reply chains

### 5. **useProfile** (`src/hooks/useProfile.ts`)
Simplified profile metadata fetching with caching.

**Features:**
- Fetches kind 0 metadata events
- 5-minute cache for better performance
- Returns parsed metadata object

**Use Cases:**
- Quick profile lookups
- Cached user data display
- Efficient metadata access

### 6. **useEvent** (`src/hooks/useEvent.ts`)
Fetch single or multiple events by ID.

**Features:**
- `useEvent(eventId)` - Fetch single event
- `useEvents(eventIds)` - Fetch multiple events efficiently

**Use Cases:**
- Load specific game scores
- Fetch referenced events
- Bulk event loading

## UI Components

### 1. **SocialActions** (`src/components/SocialActions.tsx`)
Complete social interaction UI with all engagement buttons.

**Features:**
- **Like Button**: Publishes kind 7 reaction with "+" content
- **Repost Button**: Publishes kind 6 repost
- **Quote Button**: Opens dialog for creating quote with commentary
- **Share Button**: Native share API or clipboard copy
- **State Management**: Shows active state for user's interactions
- **Login Prompts**: Automatically prompts login when needed

**Usage:**
```tsx
<SocialActions eventId={event.id} className="mt-4" />
```

### 2. **ProfileView** (`src/components/ProfileView.tsx`)
Comprehensive player profile display with game statistics.

**Features:**
- Profile metadata (avatar, name, bio, website, NIP-05)
- Game statistics cards:
  - High score with trophy icon
  - Total games played
  - Total blocks survived
- Recent scores list with:
  - Score ranking badges
  - Detailed stats (difficulty, duration)
  - Date played
- Responsive layout
- Loading states with skeletons

**Usage:**
```tsx
<ProfileView pubkey={userPubkey} />
```

### 3. **EventView** (`src/components/EventView.tsx`)
Universal event display with social context.

**Features:**
- Displays any Nostr event with author info
- Social statistics (likes, reposts, quotes)
- Special rendering for game scores (kind 1001):
  - Trophy icon with formatted score
  - Difficulty and duration stats
  - Optional commentary
- Integrated comments section
- Author profile links
- Responsive cards

**Usage:**
```tsx
<EventView eventId={eventId} />
```

## NIP-19 Routing Implementation

### Updated **NIP19Page** (`src/pages/NIP19Page.tsx`)
Root-level routing for all NIP-19 identifiers.

**Supported Identifiers:**
- `npub1...` → ProfileView (user profiles)
- `nprofile1...` → ProfileView (with relay hints)
- `note1...` → EventView (kind 1 text notes)
- `nevent1...` → EventView (any event with context)
- `naddr1...` → Placeholder (addressable events)

**Example URLs:**
- `/npub1abc...` - View player profile with stats
- `/nevent1xyz...` - View game score with social stats
- `/note1def...` - View text note/comment

**Features:**
- Automatic NIP-19 decoding
- Type-specific rendering
- 404 handling for invalid identifiers
- Fully integrated with social features

## Integration Points for Blockstr

### Where to Add Social Features:

1. **Game Over Modal** (`src/components/game/GameOverModal.tsx`)
   - Add `<SocialActions eventId={scoreEventId} />` after score is published
   - Allow players to like/share immediately after game ends

2. **Leaderboard** (`src/components/game/Leaderboard.tsx`)
   - Add social stats to each leaderboard entry
   - Show like counts and repost counts
   - Make scores clickable to view full EventView

3. **Score Sharing**
   - When publishing scores, automatically generate nevent link
   - Include in share dialogs
   - Add "View Score" button that links to `/nevent1...`

4. **Player Profiles**
   - Add profile links in leaderboards
   - Link player names to `/npub1...` URLs
   - Show mini profile cards on hover

## Benefits for Blockstr

### Viral Growth:
- **Easy Sharing**: One-click share to social media
- **Quote Discussions**: Players can discuss scores with commentary
- **Repost Chains**: High scores spread across Nostr network
- **Profile Links**: Players discover each other organically

### Engagement:
- **Likes**: Instant feedback and validation
- **Comments**: Community discussion on scores
- **Leaderboard Social Proof**: See which scores are trending
- **Player Profiles**: Build reputation and following

### Retention:
- **Social Connections**: Players follow each other
- **Achievement Tracking**: Full history on profile
- **Competitive Spirit**: See who's engaging with your scores
- **Community Building**: Comments and discussions

## Technical Implementation Notes

### Performance:
- All hooks use React Query for caching
- 3-second timeouts prevent slow relays from blocking
- Efficient query combining (e.g., kind 6 & 16 in one request)
- Profile data cached for 5 minutes

### Error Handling:
- Login prompts for unauthenticated actions
- Graceful fallbacks for missing data
- 404 pages for invalid NIP-19 identifiers
- Toast notifications for user feedback

### Accessibility:
- All components use shadcn/ui primitives
- Proper semantic HTML
- Keyboard navigation support
- Screen reader friendly

## Next Steps

To fully integrate these features into Blockstr:

1. **Add SocialActions to GameOverModal**
   - Show social buttons after score is published
   - Pre-populate share text with score details

2. **Enhance Leaderboard**
   - Add social stats columns
   - Make entries clickable to EventView
   - Show trending scores (by likes/reposts)

3. **Profile Integration**
   - Link player names throughout the app
   - Add "View Profile" buttons
   - Show mini profile previews on hover

4. **Score Detail Pages**
   - Use EventView for individual score pages
   - Add breadcrumb navigation
   - Include related scores (same player, similar difficulty)

5. **Social Feed** (Optional)
   - Create a feed of recent scores from followed players
   - Show trending scores across the network
   - Filter by difficulty or time period

## Documentation

All features are documented in `CONTEXT.md` with:
- Hook usage examples
- Component props and features
- Integration guidelines
- Best practices

The system prompt has been updated to help AI agents understand and use these features effectively.
