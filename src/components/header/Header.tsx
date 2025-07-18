"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Copy, Menu, X as CloseIcon, LogOut, ChevronRight } from "lucide-react";

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

/* --- WalletConnect protocol disconnect helpers -------------------- */
import SignClient from "@walletconnect/sign-client";
import { getSdkError } from "@walletconnect/utils";

/** Your WalletConnect projectId (keep in sync w/ wcModal.ts) */
const WC_PROJECT_ID = "cbfcaf564ee9293b0d9d25bbdac11ea3";

/**
 * Disconnect all active WalletConnect sessions & pairings for this projectId.
 * This forces the *next* connect attempt to create a brand‑new pairing,
 * which prompts Keplr to open and lets the user pick/switch accounts.
 */
async function killWcSessionsRemote() {
  try {
    const client = await SignClient.init({ projectId: WC_PROJECT_ID });

    // Kill active sessions.
    const sessions = client.session.getAll();
    for (const s of sessions) {
      try {
        await client.disconnect({
          topic: s.topic,
          reason: getSdkError("USER_DISCONNECTED"),
        });
      } catch {
        /* ignore */
      }
    }

    // Delete stored pairings (prevents silent auto‑reuse).
    const pairings = client.pairing.getAll();
    for (const p of pairings) {
      try {
        await client.pairing.delete(p.topic, getSdkError("USER_DISCONNECTED"));
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore init errors */
  }
}

/* ------------------------------------------------------------------ */
/* Defensive close for lingering Web3Modal overlay on mobile returns. */

function _reallyUnlock() {
  const html = document.documentElement;
  const body = document.body;

  // 1) blast the locking classes
  html.classList.remove("w3m-modal-open", "w3m-open");
  body.classList.remove("w3m-modal-open", "w3m-open");

  // 2) inline‑override *everything* that can freeze scrolling
  ["overflow", "position", "top", "left", "right", "bottom", "height"].forEach((prop) => {
    html.style.setProperty(prop, "initial", "important");
    body.style.setProperty(prop, "initial", "important");
  });

  // 3) restore scroll position if body was offset
  const frozenTop = parseInt(body.style.top || "0", 10);
  if (frozenTop) window.scrollTo(0, -frozenTop);
  body.style.removeProperty("top");
}

function forceCloseWcModal() {
  try { wcModal.closeModal(); } catch {}

  /* brute‑force: remove every top‑level element created by Web3Modal */
  document
    .querySelectorAll<HTMLElement>(
      "w3m-modal, w3m-widget, w3m-overlay," +          // custom elements
      "[id^='w3m-'], [data-w3m-overlay]," +            // id="w3m‑…" or data attr
      "[class*='w3m-overlay'], [class*='w3m-modal']"   // class contains
    )
    .forEach((el) => { try { el.remove(); } catch {} });

  unlockScroll();               // restores scroll & clears classes/styles again
}




export function unlockScroll() {
  _reallyUnlock();
  requestAnimationFrame(_reallyUnlock);   // run on the next frame too
}



/* ------------------------------------------------------------------ */
/* Purge persisted WalletConnect v2 items in localStorage.            */
function clearWcSessions() {
  try {
    const ls = window.localStorage;
    const keys = Object.keys(ls);
    for (const k of keys) {
      if (
        k.startsWith("wc@") ||
        k.startsWith("walletconnect") ||
        k === "WALLETCONNECT_DEEPLINK_CHOICE"
      ) {
        ls.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}
/* ------------------------------------------------------------------ */

function Header() {
  /* ───────── local state ───────── */
  const [showWallet, setShowWallet] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [walletMenu, setWalletMenu] = useState(false);

  /* ───────── wallet hooks ──────── */
  const {
    data: account,
    isConnected,
    walletType: connectedWalletType,
  } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { suggestAndConnect } = useSuggestChainAndConnect();

  /* ───────── app context ───────── */
  const pathname = usePathname();
  const { showModal, setShowModal } = useHowItWorksContext();

  /* ───────── utilities ─────────── */
  const truncated = account?.bech32Address
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : "";

  const isMobile = /Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== "undefined" ? navigator.userAgent : "",
  );

  /* ───────── Keplr (WalletConnect) helper ───────── */
  async function connectKeplrMobile() {
    const walletType = WalletType.WC_KEPLR_MOBILE;

    await killWcSessionsRemote();
    clearWcSessions();

    await wcModal.openModal({
      requiredNamespaces: {
        cosmos: {
          chains: ["cosmos:fairyring-testnet-3"],
          methods: ["cosmos_signDirect", "cosmos_signAmino"],
          events: ["accountsChanged"],
        },
      },
      standaloneChains: ["cosmos:fairyring-testnet-3"],
    });

    try {
      await connect({
        chainId: fairyring.chainId,
        walletType,
        autoReconnect: true,
      });
    } catch {
      await suggestAndConnect({
        chainInfo: fairyring,
        walletType,
        autoReconnect: true,
      });
    } finally {
      forceCloseWcModal();
    }
  }

  /* ───────── Leap (WalletConnect) helper ───────── */
  // async function connectLeapMobile() {
  //   const walletType = WalletType.WC_LEAP_MOBILE;

  //   await killWcSessionsRemote();
  //   clearWcSessions();

  //   await wcModal.openModal({
  //     requiredNamespaces: {
  //       cosmos: {
  //         chains: ["cosmos:fairyring-testnet-3"],
  //         methods: ["cosmos_signDirect", "cosmos_signAmino"],
  //         events: ["accountsChanged"],
  //       },
  //     },
  //     standaloneChains: ["cosmos:fairyring-testnet-3"],
  //     explorerRecommendedWalletIds: ["io.leapwallet"],
  //   });

  //   try {
  //     await connect({
  //       chainId: fairyring.chainId,
  //       walletType,
  //       autoReconnect: true,
  //     });
  //   } catch {
  //     await suggestAndConnect({
  //       chainInfo: fairyring,
  //       walletType,
  //       autoReconnect: true,
  //     });
  //   } finally {
  //     forceCloseWcModal();
  //   }
  // }
  const LEAP_DEEPLINK_URL = "https://leapcosmoswallet.page.link/6Zp5rkq9VWcX9Rwo9";
    async function connectLeapMobile() {
        if (typeof window.leap !== "undefined") {
          // we’re inside Leap’s in‑app browser or desktop extension → use injected provider
          try {
            await suggestAndConnect({
              chainInfo: fairyring,
              walletType: WalletType.LEAP,
            });
          } catch (e) {
            console.error("Leap provider connect failed:", e);
          }
        } else {
          // no provider injected → deep‑link into Leap app
          window.location.href = LEAP_DEEPLINK_URL;
        }
      }
  /* ───────── public connect handlers ───────── */
  async function connectKeplr() {
    setShowWallet(false);
    if (isMobile) {
      await connectKeplrMobile();
    } else {
      await suggestAndConnect({
        chainInfo: fairyring,
        walletType: WalletType.KEPLR,
      });
    }
  }

   async function connectLeap() {
       setShowWallet(false);
       // unified: detection & deep‑link logic inside connectLeapMobile
       await connectLeapMobile();
     }

  /* ───────── auto-close banner + WC sheet when connected ───────── */
  useEffect(() => {
    if (isConnected && account?.bech32Address) {
      setShowWallet(false);
      forceCloseWcModal();
    }
  }, [isConnected, account?.bech32Address]);
  useEffect(() => {
    if (isConnected) unlockScroll();
  }, [isConnected]);

  /* ───────── close lingering WC modal when returning from background ───────── */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && isConnected) {
        forceCloseWcModal();
      }
    };
    const onFocus = () => {
      if (isConnected) forceCloseWcModal();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [isConnected]);

  /* ───────── global “open-wallet” event ───────── */
  useEffect(() => {
    const opener = () => setShowWallet(true);
    window.addEventListener("open-wallet-modal", opener);
    return () => window.removeEventListener("open-wallet-modal", opener);
  }, []);

  /* ───────── JSX ───────── */
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
                        await killWcSessionsRemote();
                        clearWcSessions();
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
                      await killWcSessionsRemote();
                      clearWcSessions();
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
      {showWallet && !isConnected && (
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
              <span className="font-semibold underline">Terms of Service</span>{" "}
              and{" "}
              <span className="font-semibold underline">Privacy Policy</span>.
            </p>

            {/* Keplr */}
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

            {/* Keplr (WalletConnect) */}
            <button
              onClick={connectKeplr}
              className="w-full flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50"
            >
              <span className="flex items-center space-x-3">
                <Image src="/keplr.png" alt="Keplr Wallet" width={28} height={28} />
                <span className="font-medium">Keplr</span>
              </span>
              <ChevronRight size={16} />
            </button>

            {/* Leap (WalletConnect) */}
            <button
              onClick={connectLeap}
              className="w-full flex items-center justify-between border rounded-lg px-4 py-3 hover:bg-gray-50"
            >
              <span className="flex items-center space-x-3">
                <Image src="/leap.png" alt="Leap Wallet" width={28} height={28} />
                <span className="font-medium">Leap</span>
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
