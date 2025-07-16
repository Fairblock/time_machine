'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GrazProvider } from 'graz';
import { fairyring, stargaze } from '@/constant/chains';
import type { ChainInfo } from '@keplr-wallet/types';
const cosmoshub: ChainInfo = {
  chainId: 'cosmoshub-4',
  chainName: 'Cosmos Hub',
  rpc: 'https://rpc.cosmoshub.strange.love',
  rest: 'https://api.cosmoshub.strange.love',
  bip44: { coinType: 118 },
  bech32Config: {
    bech32PrefixAccAddr: 'cosmos',
    bech32PrefixAccPub: 'cosmospub',
    bech32PrefixValAddr: 'cosmosvaloper',
    bech32PrefixValPub: 'cosmosvaloperpub',
    bech32PrefixConsAddr: 'cosmosvalcons',
    bech32PrefixConsPub: 'cosmosvalconspub',
  },
  stakeCurrency: {
    coinDenom: 'ATOM',
    coinMinimalDenom: 'uatom',
    coinDecimals: 6,
    coinGeckoId: 'cosmos',
  },
  currencies: [
    { coinDenom: 'ATOM', coinMinimalDenom: 'uatom', coinDecimals: 6, coinGeckoId: 'cosmos' },
  ],
  feeCurrencies: [
    {
      coinDenom: 'ATOM',
      coinMinimalDenom: 'uatom',
      coinDecimals: 6,
      coinGeckoId: 'cosmos',
      gasPriceStep: { low: 0.01, average: 0.025, high: 0.03 },
    },
  ],
  features: ['stargate', 'ibc-transfer'],
};
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
        chains: [fairyring],                           // mandatory :contentReference[oaicite:3]{index=3}
        walletConnect: {
          options: {
            projectId: "cbfcaf564ee9293b0d9d25bbdac11ea3",
            metadata: {
              name: "Fairblock Predictions",
              description: "Encrypted price‑prediction dApp on FairyRing",
              url: "https://prediction.fairblock.network",
              icons: ["https://prediction.fairblock.network/icon.png"],
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
