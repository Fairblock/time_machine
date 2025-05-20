import { Button } from '@/components/ui/button';
import WinnerDisplay from '@/components/winner-display/WinnerDisplay';
import { fairyring } from '@/constant/chains';
import Image from 'next/image';
import { PUBLIC_ENVIRONMENT } from '@/constant/env';
import {
  useAccount,
  useConnect,
  useSuggestChainAndConnect,
  WalletType,
} from 'graz';
import { useEffect } from 'react';
import { Copy } from 'lucide-react';

function Header() {
    const { data: account, isConnected, isConnecting } = useAccount();
  
    const { connect, error: walletConnectError } = useConnect();
    const { suggestAndConnect } = useSuggestChainAndConnect();
    const truncated = account?.bech32Address
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : '';
    async function handleConnect() {
      connect({
        walletType: WalletType.KEPLR,
        chainId: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_CHAIN_ID!,
      });
    }
  
    useEffect(() => {
      if (walletConnectError) {
        suggestAndConnect({
          chainInfo: fairyring,
          walletType: WalletType.KEPLR,
        });
      }
    }, [walletConnectError, suggestAndConnect]);
  
    return (
      <header className="w-full bg-gray-100 font-sans">
        <div className="max-w-1xl mx-auto flex items-center justify-between py-4 px-6 ml-5">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Fairblock" width={180} height={180} />
          </div>
  
          {/* Nav */}
          <nav className="flex space-x-45">
            <a href="/" className="text-gray-900 font-medium">
              Encrypt Prediction
            </a>
            <a href="/capsules" className="text-gray-600 hover:text-gray-900">
              Predictions
            </a>
            <a href="/leaderboard" className="text-gray-600 hover:text-gray-900">
              Leaderboard
            </a>
            <a href="https://testnet-faucet.fairblock.network/" className="text-gray-600 hover:text-gray-900">
              Faucet
            </a>
          </nav>
  
          {/* Right-hand button */}
          <div>
            {isConnected ? (
              <div
                onClick={() =>
                  account &&
                  navigator.clipboard.writeText(account.bech32Address)
                }
                title={account?.bech32Address}
                className="cursor-pointer p-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-80 transition"
              >
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1">
                  <span className="font-mono text-sm text-gray-700">
                    {truncated}
                  </span>
                  <Copy size={16} className="text-gray-500 hover:text-gray-700" />
                </div>
              </div>
            ) : (
              <Button onClick={handleConnect}>Connect</Button>
            )}
          </div>
       
        </div>
      </header>
    );
  }
  

export default Header;