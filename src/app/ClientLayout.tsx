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
        grazOptions={{
          chains: [fairyring, stargaze],
          defaultWallet: WalletType.KEPLR,
          autoReconnect: false,
          onReconnectFailed: () => console.error('reconnect failed'),
          walletConnect: {
            options: {
              projectId: 'cbfcaf564ee9293b0d9d25bbdac11ea3', // hard-coded
            },
          },
        }}
      >
        {children}
      </GrazProvider>
    </QueryClientProvider>
  );
}
