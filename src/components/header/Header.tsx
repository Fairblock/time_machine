"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, Menu, X as CloseIcon, LogOut, ChevronRight } from "lucide-react";
import { newWcSession } from "@/lib/wc";
import { Button } from "@/components/ui/button";
import { fairyring } from "@/constant/chains";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSuggestChainAndConnect,
  WalletType,
} from "graz";
import { wcModal } from "@/lib/wcModal";
import HowItWorksModal from "../modals/HowItWorksModal";
import { useHowItWorksContext } from "@/contexts/HowItWorksContext";

function Header() {
  /* ───────── state ───────── */
  const [showWallet, setShowWallet] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenu, setWalletMenu] = useState(false);

  const { data: account, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { suggestAndConnect } = useSuggestChainAndConnect();
  const { showModal, setShowModal } = useHowItWorksContext();
  const pathname = usePathname();

  const truncated = account?.bech32Address
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : "";

  const isMobile = /Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : ""
  );

  /* ───────── helpers ───────── */
// A hub chain that Leap recognises out‑of‑the‑box
const HUB_CHAIN = "cosmos:cosmoshub-4";

async function openLeapOnFairyRing(walletType: WalletType.WC_LEAP_MOBILE) {
  /* -- 1. Pair on Cosmos Hub -- */
  const hub = await newWcSession(["cosmos:cosmoshub-4"]);
  if (hub.uri) await wcModal.openModal({ uri: hub.uri, standaloneChains: ["cosmos:cosmoshub-4"] });
  await hub.approval();                         // user taps “Connect” in Leap

  /* -- 2. Ask Leap to add FairyRing -- */
  await (window as any).leap.experimentalSuggestChain(fairyring);   // explicit per Leap docs 

  /* -- 3. Close old modal & start a *new* session on FairyRing -- */
  wcModal.closeModal();
  const fairy = await newWcSession(["cosmos:fairyring-testnet-3"]);
  if (fairy.uri) await wcModal.openModal({ uri: fairy.uri, standaloneChains: ["cosmos:fairyring-testnet-3"] });
  await fairy.approval();                       // user taps “Connect” again

  /* -- 4. Tell Graz to use the new session -- */
  await connect({ chainId: fairyring.chainId, walletType, autoReconnect: true });
}
async function openWcAddFairyRing(walletType: WalletType.WC_LEAP_MOBILE | WalletType.WC_KEPLR_MOBILE) {
  /* 1. Open Web3Modal with a VALID proposal (Hub only) */
  await wcModal.openModal({
    requiredNamespaces: {
      cosmos: {
        chains: [HUB_CHAIN],
        methods: ["cosmos_signDirect", "cosmos_signAmino"],   // Leap supports both :contentReference[oaicite:5]{index=5}
        events: ["accountsChanged"],
      },
    },
  });

  /* 2. Run suggest‑chain + connect on FairyRing */
  await suggestAndConnect({
    chainInfo: fairyring,            // fires experimentalSuggestChain :contentReference[oaicite:6]{index=6}
    walletType,                      // WC_LEAP_MOBILE or WC_KEPLR_MOBILE
  });

  /* 3. Switch the active session to FairyRing */
  await connect({
    chainId: fairyring.chainId,      // "fairyring-testnet-3"
    walletType,
    autoReconnect: true,             // resume on page reload
  });
}
  /** Opens Web3Modal first, then connects via Graz (WC mobile types). */
  async function openWcAndConnectMobile(
    walletType: WalletType.WC_LEAP_MOBILE | WalletType.WC_KEPLR_MOBILE
  ) {
    // 1️⃣ show the blue WC sheet (returns void)
    await wcModal.openModal({ standaloneChains: ["cosmos:fairyring-testnet-3"] });

    // 2️⃣ try plain connect; if the chain isn't in Leap/Keplr yet, fall back to suggest‑chain
    try {
      await connect({
        chainId: fairyring.chainId,
        walletType,
      });
    } catch {
      await suggestAndConnect({
        chainInfo: fairyring,
        walletType,
      });
    }
  }
  async function connectLeap() {
    if (isMobile) return openLeapOnFairyRing(WalletType.WC_LEAP_MOBILE);
    await suggestAndConnect({ chainInfo: fairyring, walletType: WalletType.LEAP });
  }
  
  async function connectKeplr() {
    if (isMobile) return openWcAddFairyRing(WalletType.WC_KEPLR_MOBILE);
    await suggestAndConnect({ chainInfo: fairyring, walletType: WalletType.KEPLR });
  }

  /* global “open‑wallet” event */
  useEffect(() => {
    const opener = () => setShowWallet(true);
    window.addEventListener("open-wallet-modal", opener);
    return () => window.removeEventListener("open-wallet-modal", opener);
  }, []);

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
                      window.location.reload();
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

      {/* ===== WALLET MODAL (desktop + mobile) ===== */}
      {showWallet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowWallet(false)}
        >
          {/* ---- DESKTOP VIEW ---- */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="hidden lg:block w-[90%] sm:w-[420px] bg-white rounded-lg px-8 py-10 text-center space-y-8"
          >
            <h2 className="text-3xl font-extrabold uppercase">Connect Wallet</h2>
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

          {/* ---- MOBILE VIEW ---- */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="lg:hidden w-[90%] sm:w-[420px] bg-white rounded-lg px-8 py-10 text-center space-y-6"
          >
            <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>

            {/* Leap (WalletConnect) */}
            <button
              onClick={connectLeap}
              className="w-full flex items-center justify-between border rounded-lg px-4 py-3 mb-4 hover:bg-gray-50"
            >
              <span className="flex items-center space-x-3">
                <Image
                  src="/leap.png"
                  alt="Leap Wallet"
                  width={28}
                  height={28}
                />
                <span className="font-medium">Leap&nbsp;(WalletConnect)</span>
              </span>
              <ChevronRight size={16} />
            </button>

            {/* Keplr (WalletConnect) */}
            <button
              onClick={connectKeplr}
              className="w-full flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50"
            >
              <span className="flex items-center space-x-3">
                <Image
                  src="/keplr.png"
                  alt="Keplr Wallet"
                  width={28}
                  height={28}
                />
                <span className="font-medium">Keplr&nbsp;(WalletConnect)</span>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showModal && <HowItWorksModal setShowModal={setShowModal} />}
    </>
  );
}

export default Header;