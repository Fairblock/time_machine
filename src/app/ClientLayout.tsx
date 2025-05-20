'use client';

// import { wagmiConfig } from '@/wagmi/config';
// import { ConnectKitProvider } from 'connectkit';
// import { WagmiProvider } from 'wagmi';

import { fairyring, stargaze } from '@/constant/chains';
import { PUBLIC_ENVIRONMENT } from '@/constant/env';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GrazProvider, WalletType } from 'graz';

const queryClient = new QueryClient();

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      {/* <ConnectKitProvider> */}
      <GrazProvider
        grazOptions={{
          chains: [fairyring, stargaze],
          onReconnectFailed: () => {
            console.error('reconnect failed');
          },
          defaultWallet: WalletType.KEPLR,
          autoReconnect: false,
          walletConnect: {
            options: {
              projectId: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
            },
          },
        }}
      >
        {children}
      </GrazProvider>
      {/* </ConnectKitProvider> */}
    </QueryClientProvider>
    // </WagmiProvider>
  );
}
