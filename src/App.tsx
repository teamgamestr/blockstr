// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createHead, UnheadProvider } from '@unhead/react/client';
import { InferSeoMetaPlugin } from '@unhead/addons';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { NWCProvider } from '@/contexts/NWCContext';
import { AppConfig } from '@/contexts/AppContext';
import { appRelays } from '@/config/relays';
import AppRouter from './AppRouter';

const head = createHead({
  plugins: [
    InferSeoMetaPlugin(),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

const defaultConfig: AppConfig = {
  theme: "dark",
  relayUrl: appRelays[0].url,
};

export function App() {
  return (
    <UnheadProvider head={head}>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={[...appRelays]}>
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <NWCProvider>
                <TooltipProvider>
                  <Toaster />
                  <Suspense>
                    <AppRouter />
                  </Suspense>
                </TooltipProvider>
              </NWCProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </UnheadProvider>
  );
}

export default App;
