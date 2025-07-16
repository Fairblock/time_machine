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

/* ---- wipe WC v2 deep‑link + pairings (Chrome remembers Keplr) ---- */
function purgeWC() {
  Object.keys(localStorage).forEach((k) => {
    if (
      k === "WALLETCONNECT_DEEPLINK_CHOICE" || // last wallet
      k.startsWith("wc@2:")                    // sessions / pairings
    ) localStorage.removeItem(k);
  });
}

function Header() {
  /* wallet state */
  const [showWallet, setShowWallet] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenu, setWalletMenu] = useState(false);
  const [attempted, setAttempted] = useState<WalletType | null>(null);

  const { data: account, isConnected } = useAccount({
      chainId: fairyring.chainId,   // tell Graz “this is the chain I care about”
    });
  const { connect, error: walletErr } = useConnect();
  const { disconnect } = useDisconnect();
  const { suggestAndConnect } = useSuggestChainAndConnect();
  const { showModal, setShowModal } = useHowItWorksContext();
  const pathname = usePathname();

  const truncated = account
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : "";

  /* global “open‑wallet‑modal” event */
  useEffect(() => {
    const open = () => setShowWallet(true);
    window.addEventListener("open-wallet-modal", open);
    return () => window.removeEventListener("open-wallet-modal", open);
  }, []);

  /* -- Keplr -- */
  async function connectKeplr() {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const hasExt = typeof window !== "undefined" && (window as any).keplr;
    const type =
      mobile && !hasExt ? WalletType.WC_KEPLR_MOBILE : WalletType.KEPLR;

    setAttempted(type);

    try {
      await connect({ walletType: type, chainId: fairyring.chainId });
    } catch {
      await suggestAndConnect({ chainInfo: fairyring, walletType: type });
    }
    setShowWallet(false);
  }


/* ------------------------------------------------------------------ */
/*                 FINAL mobile‑safe Leap connect helper               */
/* ------------------------------------------------------------------ */
async function connectLeap() {
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const hasExt = typeof window !== "undefined" && (window as any).leap;
  const type = mobile && !hasExt ? WalletType.WC_LEAP_MOBILE : WalletType.LEAP;

  // Clear any stale WalletConnect pairings
  purgeWC();

  setAttempted(type);

  try {
    // First try connecting directly to Fairyring
    await connect({ walletType: type, chainId: fairyring.chainId });
  } catch (error) {
    console.log("Direct connection failed, trying fallback:", error);
    
    if (mobile && !hasExt) {
      // For mobile web without extension
      try {
        // Step 1: Connect to a known chain (Cosmos Hub)
        await connect({ 
          walletType: type, 
          chainId: "cosmoshub-4"
        });

        // Step 2: After connection, update the session with Fairyring
        try {
          // This assumes you have access to the WalletConnect client
          const client = (window as any).walletConnectClient;
          if (client) {
            const session = client.session.values[0];
            await client.update({
              topic: session.topic,
              namespaces: {
                ...session.namespaces,
                cosmos: {
                  ...session.namespaces.cosmos,
                  chains: [...(session.namespaces.cosmos.chains || []), `cosmos:${fairyring.chainId}`]
                }
              }
            });
          }
        } catch (updateError) {
          console.error("Failed to update session with Fairyring:", updateError);
        }

        // Step 3: Now connect to Fairyring
        await connect({ walletType: type, chainId: fairyring.chainId });
      } catch (fallbackError) {
        console.log("Fallback failed, trying suggestAndConnect:", fallbackError);
        // Final fallback
        await suggestAndConnect({ chainInfo: fairyring, walletType: type });
      }
    } else {
      // For desktop or mobile with extension
      try {
        if (hasExt) {
          await (window as any).leap.experimentalSuggestChain(fairyring);
        }
        await connect({ walletType: type, chainId: fairyring.chainId });
      } catch (suggestError) {
        console.log("Suggest chain failed, trying suggestAndConnect:", suggestError);
        await suggestAndConnect({ chainInfo: fairyring, walletType: type });
      }
    }
  }

  setShowWallet(false);
}


  

  /* retry via suggest‑and‑connect if first attempt failed */
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
              className="text-gray-900 whitespace-nowrap cursor-pointer"
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
