import { useSeoMeta } from '@unhead/react';
import { BlockstrGame } from '@/components/game/BlockstrGame';

const Index = () => {
  useSeoMeta({
    title: 'Blockstr - Bitcoin-Powered Tetris',
    description: 'Play Tetris with Bitcoin blocks! Speed increases as new Bitcoin blocks are found. Pay to play with Lightning, publish scores to Nostr.',
  });

  return <BlockstrGame />;
};

export default Index;
