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

/* ───────────────────────────────────────────────────────────────────── */

function Header() {
  const [showModal, setShowModal] = useState(false);

  const { data: account, isConnected } = useAccount();
  const { connect, error: walletConnectError } = useConnect();
  const { suggestAndConnect }          = useSuggestChainAndConnect();

  const truncated = account?.bech32Address
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : '';

  /* connect helper */
  async function connectKeplr() {
    try {
      await connect({
        walletType: WalletType.KEPLR,
        chainId   : PUBLIC_ENVIRONMENT.NEXT_PUBLIC_CHAIN_ID!,
      });
      setShowModal(false);
    } catch (_) {
      // handled by grazing useEffect below
    }
  }

  /* auto‑suggest on 1st error */
  useEffect(() => {
    if (walletConnectError) {
      suggestAndConnect({
        chainInfo : fairyring,
        walletType: WalletType.KEPLR,
      });
    }
  }, [walletConnectError, suggestAndConnect]);

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <>
      {/* ‑‑‑ top nav bar ‑‑‑ */}
      <header className="w-full bg-gray-100 font-sans">
        <div className="max-w-1xl mx-auto flex items-center justify-between py-4 px-6 ml-5">

          {/* logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image src="/logo.png" alt="Fairblock" width={180} height={180} />
          </Link>

          {/* nav */}
          <nav className="flex space-x-45">
            <a href="/prediction"   className="text-gray-600 hover:text-gray-900">Encrypt Prediction</a>
            <a href="/capsules"     className="text-gray-600 hover:text-gray-900">Predictions</a>
            <a href="/leaderboard"  className="text-gray-600 hover:text-gray-900">Leaderboard</a>
            <a href="https://testnet-faucet.fairblock.network/" className="text-gray-600 hover:text-gray-900">Faucet</a>
          </nav>

          {/* connect / address */}
          <div>
            {isConnected ? (
              <div
                onClick={() => account && navigator.clipboard.writeText(account.bech32Address)}
                title={account?.bech32Address}
                className="cursor-pointer p-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 hover:opacity-80 transition"
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

      {/* ‑‑‑ wallet modal ‑‑‑ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          {/* stop propagation so clicks inside modal don't close */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-[90%] sm:w-[480px] rounded-lg px-8 py-10 text-center space-y-8"
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold uppercase">Connect Wallet</h2>

            <p className="text-gray-700 text-sm sm:text-base">
              By connecting your wallet, you agree to our&nbsp;
              <span className="font-semibold underline">Terms of Service</span>
              &nbsp;and our&nbsp;
              <span className="font-semibold underline">Privacy Policy</span>.
            </p>

            {/* Keplr row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image src="/keplr.png" alt="Keplr icon" width={32} height={32} />
                <span className="text-lg font-medium">Keplr</span>
              </div>
              <Button
                variant="outline"
                className="px-6 py-1"
                onClick={connectKeplr}
              >
                Connect
              </Button>
            </div>

            {/* placeholder text */}
            <p className="text-sm text-gray-700 pt-4">
              Don’t see your wallet listed above?
              <br />
              <span className="text-blue-600 font-medium cursor-not-allowed">Connect to another wallet</span>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
