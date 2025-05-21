'use client';

import { useState, useEffect } from 'react';
import Image   from 'next/image';
import Link    from 'next/link';
import { Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { fairyring } from '@/constant/chains';
import {
  useAccount,
  useConnect,
  useSuggestChainAndConnect,
  WalletType,
} from 'graz';
import { PUBLIC_ENVIRONMENT } from '@/constant/env';

function Header() {
  const [showModal, setShowModal] = useState(false);

  const { data: account, isConnected } = useAccount();
  const { connect, error: walletErr }  = useConnect();
  const { suggestAndConnect }          = useSuggestChainAndConnect();

  const truncated = account?.bech32Address
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : '';

  async function connectKeplr() {
    await connect({
      walletType: WalletType.KEPLR,
      chainId   : PUBLIC_ENVIRONMENT.NEXT_PUBLIC_CHAIN_ID!,
    });
    setShowModal(false);
  }

  useEffect(() => {
    if (walletErr) {
      suggestAndConnect({ chainInfo: fairyring, walletType: WalletType.KEPLR });
    }
  }, [walletErr, suggestAndConnect]);

  return (
    <>
      {/* top bar */}
      <header className="w-full bg-gray-100 font-sans overflow-x-auto">
        <div className="flex items-center w-full px-6 py-4">

          {/* logo (left edge) */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Fairblock"
              width={180}
              height={180}
              className="w-40 h-auto"      /* keeps aspect ratio while letting img scale */
            />
          </Link>

          {/* nav (middle) */}
          <nav className="flex-grow flex justify-center space-x-45">
            <Link href="/prediction"  className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
              Encrypt Prediction
            </Link>
            <Link href="/capsules"    className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
              Predictions
            </Link>
            <Link href="/leaderboard" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
              Leaderboard
            </Link>
            <a
              href="https://testnet-faucet.fairblock.network/"
              target="_blank"
              rel="noreferrer"
              className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
            >
              Faucet
            </a>
          </nav>

          {/* wallet / connect (right edge) */}
          <div className="flex-shrink-0">
            {isConnected ? (
              <div
                onClick={() => account && navigator.clipboard.writeText(account.bech32Address)}
                title={account?.bech32Address}
                className="cursor-pointer p-0.5 rounded-full
                           bg-gradient-to-r from-indigo-500 to-pink-500
                           hover:opacity-80 transition"
              >
                <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1">
                  <span className="font-mono text-sm text-gray-700">{truncated}</span>
                  <Copy size={16} className="text-gray-500 hover:text-gray-700" />
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowModal(true)}>Connect Wallet</Button>
            )}
          </div>
        </div>
      </header>

      {/* very small modal for Keplr (unchanged functionality) */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-[90%] sm:w-[420px] rounded-lg px-8 py-10 text-center space-y-8"
          >
            <h2 className="text-3xl font-extrabold uppercase">Connect Wallet</h2>

            <p className="text-gray-700 text-sm">
              By connecting your wallet, you agree to our&nbsp;
              <span className="font-semibold underline">Terms of Service</span>
              &nbsp;and&nbsp;
              <span className="font-semibold underline">Privacy Policy</span>.
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image src="/keplr.png" alt="Keplr icon" width={32} height={32} />
                <span className="text-lg font-medium">Keplr</span>
              </div>
              <Button variant="outline" className="px-6 py-1" onClick={connectKeplr}>
                Connect
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
