import { getDefaultConfig } from 'connectkit';
import { createConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

export const wagmiConfig = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [mainnet, sepolia],
    // Required API Keys
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    // Required App Info
    appName: 'SOL Price Prediction',
    // Optional App Info
    appDescription: 'SOL Price Prediction App',
  }),
);
