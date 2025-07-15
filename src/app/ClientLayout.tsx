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
        // Providers.tsx  (only the grazOptions shown for brevity)
<GrazProvider
  grazOptions={{
    chains: [fairyring],

    walletConnect: {
      options: {
        projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",
        relayUrl: "wss://relay.walletconnect.com",
        metadata: {
          name: "Fairblock Time Machine",
          description: "Encrypt‑to‑reveal prediction dApp",
          url: "https://time‑machine.fairblock.network",
          icons: ["https://time‑machine.fairblock.network/logo.png"],
        },
      },

      /* ▶ These IDs come from the WalletConnect Explorer */
      walletConnectModal: {
        explorerRecommendedWalletIds: [
          // Leap
          "2f8996872bc49ccab4ffd2b818b182faa2e47c7174c4c1185d29baa7e2a33d64",
        ],
        explorerExcludedWalletIds: [
          // Keplr
          "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
        ],
        /* optional theme vars … */
      } as any, // cast to silence TS ‑ the modal ignores unknown keys
    },
  }}
>
  {children}
</GrazProvider>

    </QueryClientProvider>
  );
}
