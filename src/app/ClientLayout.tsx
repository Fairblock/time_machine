'use client';

import { fairyring, stargaze } from '@/constant/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GrazProvider, WalletType } from 'graz';

const queryClient = new QueryClient();

export default function ClientLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
         <GrazProvider
        /* —— provider‑level props —— */
        grazOptions={{
          /* <<< REQUIRED >>> */
          chains: [fairyring],             // ← add this

          walletConnect: {
            options: {
              projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",
              relayUrl: "wss://relay.walletconnect.com",
              metadata: {
                name: "Time Machine",
                description: "Encrypt‑to‑reveal prediction dApp",
                url: "https://timemachine.fairblock.network",
                icons: ["https://timemachine.fairblock.network/logo.png"],
              },
            },
          },
        }}
      >
        {children}
      </GrazProvider>
    </QueryClientProvider>
  );
}
