'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GrazProvider } from 'graz';
import { fairyring } from '@/constant/chains';

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
          chains: [fairyring],                                    // ✔ required :contentReference[oaicite:3]{index=3}

          walletConnect: {
            /* ---------- Sign Client options ---------- */
            options: {
              projectId: 'cbfcaf564ee9293b0d9d25bbdac11ea3',      // ✔ required :contentReference[oaicite:4]{index=4}
              relayUrl: 'wss://relay.walletconnect.com',
              metadata: {
                name: 'Fairblock Time Machine',
                description: 'Encrypt‑to‑reveal prediction dApp',
                url: 'https://timemachine.fairblock.network',
                icons: ['https://timemachine.fairblock.network/logo.png'],
              },
            },

            /* ---------- Modal tweaks (deep‑link to Leap, hide Keplr) ---------- */
            walletConnectModal: {
              explorerRecommendedWalletIds: [
                '2f8996872bc49ccab4ffd2b818b182faa2e47c7174c1185d29baa7e2a33d64', // Leap ID :contentReference[oaicite:5]{index=5}
              ],
              explorerExcludedWalletIds: [
                'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // Keplr ID :contentReference[oaicite:6]{index=6}
              ],
              /* mobileWallets → leapcosmos:// deep‑link */
              mobileWallets: [
                {
                  id: 'leap',
                  name: 'Leap Wallet',
                  links: { native: 'leapcosmos', universal: 'leapcosmos' },
                },
              ],
            } as any, // escape‑hatch: modal keys aren’t in Graz types yet :contentReference[oaicite:7]{index=7}
          },
        }}
      >
        {children}
      </GrazProvider>
    </QueryClientProvider>
  );
}
