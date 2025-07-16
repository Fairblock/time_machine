'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GrazProvider } from 'graz';
import { cosmoshub, fairyring, stargaze } from '@/constant/chains';
import type { ChainInfo } from '@keplr-wallet/types';

const queryClient = new QueryClient();

export default function ClientLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <GrazProvider
       grazOptions={{
        // ➋ register BOTH chains so Graz can sign on either
        chains: [cosmoshub, fairyring],
        walletConnect: {
          options: {
            projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",
            metadata: {
              name: "Fairblock Predictions",
              description: "Encrypted price‑prediction dApp on FairyRing",
              url: "https://timemachine.fairblock.network",
              icons: ["https://timemachine.fairblock.network/icon.png"],
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
