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
      chains: [fairyring],
      walletConnect: {
        options: {
          projectId: 'cbfcaf564ee9293b0d9d25bbdac11ea3',
          relayUrl: 'wss://relay.walletconnect.com',
          metadata: {
            name: 'Fairblock Time Machine',
            description: 'Encrypt-to-reveal prediction dApp',
            url: 'https://timemachine.fairblock.network',
            icons: ['https://timemachine.fairblock.network/logo.png'],
          },
        },
        walletConnectModal: {
          explorerRecommendedWalletIds: [
            '2f8996872bc49ccab4ffd2b818b182faa2e47c7174c1185d29baa7e2a33d64', // Leap
          ],
          explorerExcludedWalletIds: [
            'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // Keplr
          ],
          mobileWallets: [
            {
              id: 'leap',
              name: 'Leap Wallet',
              links: { 
                native: 'leapcosmos://wc', 
                universal: 'https://leapwallet.io/wc'
              },
            },
          ],
        } as any, // Type assertion to bypass type checking
      },
    }}
      >
        {children}
      </GrazProvider>
    </QueryClientProvider>
  );
}
