'use client';

import { useState, useEffect } from 'react';
import Image   from 'next/image';
import Link    from 'next/link';
import { Copy, Menu, X as CloseIcon } from 'lucide-react';

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
  /* -------------------------------------------------------------------------------- */
  /* wallet helpers                                                                   */
  /* -------------------------------------------------------------------------------- */
  const [showWallet, setShowWallet]   = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

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
    setShowWallet(false);
  }

  useEffect(() => {
    if (walletErr) {
      suggestAndConnect({ chainInfo: fairyring, walletType: WalletType.KEPLR });
    }
  }, [walletErr, suggestAndConnect]);

  /* -------------------------------------------------------------------------------- */
  /* JSX                                                                              */
  /* -------------------------------------------------------------------------------- */
  return (
    <>
      {/* ===== TOP BAR ===== */}
      <header className="w-full bg-gray-100 font-sans">
        <div className="flex items-center justify-between w-full px-6 py-4">
          {/* logo (always visible, left‑edge) */}
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo.png" alt="Fairblock" width={180} height={180} className="w-36 sm:w-40 lg:w-44 h-auto" />
          </Link>

          {/* nav (desktop only) */}
          <nav className="hidden md:flex flex-grow justify-center space-x-45">
            <Link href="/prediction"  className="text-gray-600 hover:text-gray-900 whitespace-nowrap">Encrypt Prediction</Link>
            <Link href="/capsules"    className="text-gray-600 hover:text-gray-900 whitespace-nowrap">Encrypted Capsules</Link>
            <Link href="/leaderboard" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">Leaderboard</Link>
            <a   href="https://testnet-faucet.fairblock.network/" target="_blank" rel="noreferrer"
                 className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
              Faucet
            </a>
          </nav>

          {/* wallet button (desktop) */}
          <div className="hidden md:block flex-shrink-0">
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
              <Button onClick={() => setShowWallet(true)}>Connect Wallet</Button>
            )}
          </div>

          {/* hamburger (mobile) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden text-gray-700 hover:text-gray-900 flex-shrink-0"
          >
            <Menu size={28} />
          </button>
        </div>
      </header>

      {/* ===== MOBILE SHEET ===== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 left-0 w-full bg-white shadow px-6 pt-6 pb-10 space-y-6"
          >
            {/* close button */}
            <button className="absolute top-4 right-4 text-gray-500" onClick={() => setMobileOpen(false)}>
              <CloseIcon size={24} />
            </button>

            <Link href="/prediction"  onClick={() => setMobileOpen(false)} className="block text-gray-900">Encrypt Prediction</Link>
            <Link href="/capsules"    onClick={() => setMobileOpen(false)} className="block text-gray-900">Predictions</Link>
            <Link href="/leaderboard" onClick={() => setMobileOpen(false)} className="block text-gray-900">Leaderboard</Link>
            <a   href="https://testnet-faucet.fairblock.network/" target="_blank" rel="noreferrer"
                 className="block text-gray-900">Faucet</a>

            <div className="pt-6 border-t">
              {isConnected ? (
                <div
                  onClick={() => account && navigator.clipboard.writeText(account.bech32Address)}
                  className="cursor-pointer flex items-center space-x-2"
                >
                  <span className="font-mono text-sm">{truncated}</span>
                  <Copy size={16} />
                </div>
              ) : (
                <Button className="w-full" onClick={() => { setShowWallet(true); setMobileOpen(false); }}>
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== WALLET MODAL (same as before) ===== */}
      {showWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowWallet(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[90%] sm:w-[420px] bg-white rounded-lg px-8 py-10 text-center space-y-8">
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
