We are creating a new video game called blockstr, based upon the classic Tetris game.

The ux vibe is retro 8-bit.

The main difference with classic Tetris is that the current score will only be locked in when a new Bitcoin block is found. We can use the mempool.space API and mempool.js library for this.

Gameplay should become progressively harder after every block is found.

Players need to login with Nostr to play using either a browser extension or nsec bunker. If they don't want to login then we should create a new keypair for them for each session.

Create a new Score NIP for publishing game scores. This should be generic to enable any game to use it. Tags should include as a minimum: player npub, unique game identifier, score.

Players will need to pay to play. This should be via zaps.

At the end of each game, the locked-in score should be published by the blockstr npub using the Score NIP. Additionally, a kind 1 note should also be published by the blockstr npub. Also, the player should have the option to post a kind 1 with their score.

Any variables (such as game speed/difficulty, payment amounts, etc.) should be contained within a global config file.

Please provide an outline implementation plan before proceeding.


Extras:

1) Bonus block spawned 1 in 100 should give 10x points if a line is cleared containing that block.