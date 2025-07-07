"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, Menu, X as CloseIcon, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fairyring } from "@/constant/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSuggestChainAndConnect,
  WalletType,
} from "graz";
import { PUBLIC_ENVIRONMENT } from "@/constant/env";
import HowItWorksModal from "../modals/HowItWorksModal";
import { useHowItWorksContext } from "@/contexts/HowItWorksContext";

function Header() {
  /* ───────── wallet helpers ─────────────────────────────────────── */
  const [showWallet, setShowWallet] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [attempted, setAttempted] = useState<WalletType | null>(null);
  const [walletMenu, setWalletMenu] = useState(false);

  const { data: account, isConnected } = useAccount();
  const { connect, error: walletErr } = useConnect();
  const { disconnect } = useDisconnect();
  const { suggestAndConnect } = useSuggestChainAndConnect();
  const { showModal, setShowModal } = useHowItWorksContext();

  const pathname = usePathname();

  const truncated = account?.bech32Address
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : "";

  /* === listen for global open‑wallet events === */
  useEffect(() => {
    function handleOpen() {
      setShowWallet(true);
    }
    window.addEventListener("open-wallet-modal", handleOpen);
    return () => window.removeEventListener("open-wallet-modal", handleOpen);
  }, []);

  /* ───────── connect helpers ────────────────────────────────────── */
  async function connectKeplr() {
    setAttempted(WalletType.KEPLR);
    await connect({
      walletType: WalletType.KEPLR,
      chainId: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_CHAIN_ID!,
    });
    setShowWallet(false); // ❌ no reload here
  }
  async function waitForLeap(ms = 2000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < ms) {
      if (typeof window !== "undefined" && (window as any).leap) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Leap extension not detected");
  }
  async function connectLeap() {
    setAttempted(WalletType.LEAP);

    try {
      await waitForLeap(); // show message if leap missing
    } catch {
      alert(
        "Leap extension not detected.\nInstall/enable it and refresh the page."
      );
      return;
    }
    try {
      await connect({
        walletType: WalletType.LEAP,
        chainId: PUBLIC_ENVIRONMENT.NEXT_PUBLIC_CHAIN_ID!,
      });
    } catch (e) {
      /* falls back to suggest‑and‑connect if chain not added */
      await suggestAndConnect({
        chainInfo: fairyring,
        walletType: WalletType.LEAP,
      });
    }
    setShowWallet(false);
  }

  /* retry with suggestChain if wallet needs the chain registered */
  useEffect(() => {
    if (walletErr && attempted) {
      suggestAndConnect({ chainInfo: fairyring, walletType: attempted });
    }
  }, [walletErr, attempted, suggestAndConnect]);

  /* ───────── JSX ────────────────────────────────────────────────── */
  return (
    <>
      {/* ===== TOP BAR ===== */}
      <header className="fixed top-0 z-40 w-full bg-[#E2E6E9] font-sans">
        <div className="flex items-center justify-between w-full px-2 py-2 relative">
          {/* logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="Fairblock"
              width={140}
              height={140}
              className="w-40 lg:w-48 h-auto"
            />
          </Link>

          {/* nav (desktop) */}
          <nav className="hidden font-medium lg:flex flex-grow justify-center space-x-7 xl:space-x-10 text-sm lg:text-base">
            <Link
              href="/prediction"
              className={`${
                pathname === "/prediction" ? "text-gray-900" : "text-gray-600"
              } whitespace-nowrap`}
            >
              Encrypt Prediction
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className={`${
                showModal ? "text-gray-900" : "text-gray-600"
              } whitespace-nowrap cursor-pointer`}
            >
              How it works
            </button>
            <Link
              href="/capsules"
              className={`${
                pathname === "/capsules" ? "text-gray-900" : "text-gray-600"
              } whitespace-nowrap`}
            >
              Encrypted Capsules
            </Link>
            <Link
              href="/leaderboard"
              className={`${
                pathname === "/leaderboard" ? "text-gray-900" : "text-gray-600"
              } whitespace-nowrap`}
            >
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

          {/* wallet button (desktop) */}
          <div className="hidden lg:block flex-shrink-0 relative mr-4">
            {isConnected ? (
              <>
                <button
                  onClick={() => setWalletMenu((v) => !v)}
                  title={account?.bech32Address}
                  className="cursor-pointer"
                >
                  <div className="flex items-center space-x-2 bg-white border-2 border-[#A9BDC3] rounded-xl px-4 py-2">
                    <span className="font-mono font-medium text-base text-gray-700">
                      {truncated}
                    </span>
                  </div>
                </button>

                {/* dropdown menu */}
                {walletMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white shadow-lg ring-1 ring-gray-200 rounded-md z-30"
                    onMouseLeave={() => setWalletMenu(false)}
                  >
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => {
                        if (account)
                          navigator.clipboard.writeText(account.bech32Address);
                        setWalletMenu(false);
                      }}
                    >
                      <Copy size={14} className="mr-2" /> Copy address
                    </button>
                    <button
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      onClick={async () => {
                        await disconnect();
                        setWalletMenu(false);
                        /* —— refresh ONLY after disconnect —— */
                        window.location.reload();
                      }}
                    >
                      <LogOut size={14} className="mr-2" /> Disconnect
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Button
                className="bg-neutral-900 hover:bg-neutral-800 cursor-pointer inline-block px-4 py-[6px] rounded-xl shadow text-white text-sm sm:text-base transition-colors"
                onClick={() => setShowWallet(true)}
              >
                Connect Wallet
              </Button>
            )}
          </div>

          {/* hamburger (mobile) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="mr-2 lg:hidden text-gray-700 hover:text-gray-900 flex-shrink-0"
          >
            <Menu size={30} />
          </button>
        </div>
      </header>

      {/* ===== MOBILE SHEET ===== */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 left-0 w-full bg-white shadow px-6 pt-6 pb-10 space-y-6"
          >
            {/* close button */}
            <button
              className="absolute top-6 right-4 text-gray-500"
              onClick={() => setMobileOpen(false)}
            >
              <CloseIcon size={30} />
            </button>

            <Link
              href="/prediction"
              onClick={() => setMobileOpen(false)}
              className="block text-gray-900"
            >
              Encrypt Prediction
            </Link>
            <button
              onClick={() => {
                setMobileOpen(false);
                setShowModal(true);
              }}
              className={`text-gray-900 whitespace-nowrap cursor-pointer`}
            >
              How it works
            </button>
            <Link
              href="/capsules"
              onClick={() => setMobileOpen(false)}
              className="block text-gray-900"
            >
              Encrypted&nbsp;Capsules
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMobileOpen(false)}
              className="block text-gray-900"
            >
              Leaderboard
            </Link>
            <a
              href="https://testnet-faucet.fairblock.network/"
              target="_blank"
              rel="noreferrer"
              className="block text-gray-900"
            >
              Faucet
            </a>

            <div className="pt-6 border-t">
              {isConnected ? (
                <>
                  <div
                    onClick={() =>
                      account &&
                      navigator.clipboard.writeText(account.bech32Address)
                    }
                    className="cursor-pointer flex items-center space-x-2 mb-4"
                  >
                    <span className="font-mono text-sm">{truncated}</span>
                    <Copy size={16} />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      await disconnect();
                      setMobileOpen(false);
                      window.location.reload(); // refresh on disconnect
                    }}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => {
                    setShowWallet(true);
                    setMobileOpen(false);
                  }}
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== WALLET MODAL ===== */}
      {showWallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowWallet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] sm:w-[420px] bg-white rounded-lg px-8 py-10 text-center space-y-8"
          >
            <h2 className="text-3xl font-extrabold uppercase">
              Connect Wallet
            </h2>
            <p className="text-gray-700 text-sm">
              By connecting your wallet, you agree to our <br />
              <span className="font-semibold underline">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="font-semibold underline">Privacy Policy</span>.
            </p>

            {/* Keplr */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image
                  src="/keplr.png"
                  alt="Keplr icon"
                  width={32}
                  height={32}
                />
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

            {/* Leap */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image src="/leap.png" alt="Leap icon" width={32} height={32} />
                <span className="text-lg font-medium">Leap</span>
              </div>
              <Button
                variant="outline"
                className="px-6 py-1"
                onClick={connectLeap}
              >
                Connect
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && <HowItWorksModal setShowModal={setShowModal} />}
    </>
  );
}

export default Header;
