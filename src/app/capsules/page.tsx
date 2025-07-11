"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccount } from "graz";
import { useConnect, useSuggestChainAndConnect, WalletType } from "graz";
import { TxRaw, TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { Buffer } from "buffer";

import Header from "@/components/header/Header";
import { fairyring } from "@/constant/chains";
import { FAIRYRING_ENV } from "@/constant/env";
import { MsgSubmitEncryptedTx } from "@/types/fairyring/codec/pep/tx";
import { getCurrentBlockHeight } from "@/services/fairyring/block";
import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from "@/constant/events";

/* ───── tiny helper: block_results (light) ──────────────────────── */
async function getBlockResults(height: number) {
  return fetch(`${RPC}/block_results?height=${height}`).then((r) => r.json());
}

/* ───── types ───────────────────────────────────────────────────── */
type Capsule = {
  creator: string;
  target: number;
  token: string;
  type: "encrypted" | "revealed";
  data?: string;
  price?: number;
};

/* ───── constants ──────────────────────────────────────────────── */
const MEMO = "price-predict";
const PER_PAGE = 100;
const RPC = FAIRYRING_ENV.rpcURL.replace(/^ws/, "http");
const ONE_WEEK = 403_200; // Tendermint blocks (~7 days)

/* ───── UI helpers (unchanged) ─────────────────────────────────── */
const TOKEN_LOGOS: Record<string, string> = {
  SOL: "/sol.png",
  BTC: "/btc.png",
  ETH: "/eth.png",
  ARB: "/arb.png",
};
const avatar = (addr: string) =>
  `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(addr)}`;

/* ───── capsule card ─────────────────────────────────────────────── */

function CapsuleCard({ creator, target, token, type, price }: Capsule) {
  const shortAddr = `${creator.slice(0, 6)}…${creator.slice(-4)}`;
  const logo = TOKEN_LOGOS[token.toUpperCase()] ?? null;

  return (
    <div className="border-2 border-[#EAECF0] bg-gradient-to-b from-[#FFFFFF] to-[#F2F7FA] rounded-2xl">
      {/* header */}
      <div className="flex items-center gap-4 bg-[#F2F7FA] px-4 py-3 rounded-2xl">
        <img src={avatar(creator)} alt="" className="h-8 w-8 rounded" />
        <span className="font-mono font-normal text-lg text-gray-700">
          {shortAddr}
        </span>
      </div>

      {/* body */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-normal text-gray-600">Predicted price</p>

        <div className="relative flex justify-between bg-white/60 border-2 border-gray-300 rounded-lg px-3 py-2">
          {type === "encrypted" ? (
            <span className="inline-block rounded-xl bg-gray-200 px-4 py-2 text-[15px] font-normal text-gray-600">
              Encrypted
            </span>
          ) : (
            <span className="mr-auto text-2xl font-normal text-gray-900">
              ${price?.toLocaleString()}
            </span>
          )}

          {logo && (
            <Image
              src={logo}
              alt={token}
              width={40}
              height={36}
              className="flex-shrink-0 rounded-full ring-2 ring-gray-200 ml-3"
            />
          )}
        </div>

        <div className="text-xs text-gray-400 text-right">#{target}</div>
      </div>
    </div>
  );
}

/* ───── cute loader ─────────────────────────────────────────────── */

function LoadingCapsules({
  progress,
  message,
}: {
  progress: number;
  message: string;
}) {
  return (
    <div className="col-span-full flex flex-col items-center mt-12 space-y-4">
      <div className="w-full max-w-sm h-2 bg-gray-200 rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neutral-300 to-black transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm font-medium text-gray-500 tracking-wide">
        {message}
      </p>
    </div>
  );
}

/* ───── revealed‑tx helper ─────────────────────────────────────── */
async function fetchRevealedTxs(heights: number[]) {
  const out: { creator: string; price: number }[] = [];

  await Promise.all(
    heights.map(async (h) => {
      const res = await getBlockResults(h + 1);
      const events =
        res?.result?.finalize_block_events ?? res?.result?.end_block_events;
      if (!events) return;

      events
        .filter((e: any) => e.type === REVEAL_EVENT_TYPES.revealed)
        .forEach((e: any) => {
          const attrs = e.attributes.reduce<Record<string, string>>(
            (acc, x) => {
              acc[x.key] = x.value;
              return acc;
            },
            {}
          );

          const memoStr = attrs[REVEAL_EVENT_ATTRS.memo];
          if (!memoStr) return;

          let parsed: any;
          try {
            parsed = JSON.parse(memoStr);
          } catch {
            return;
          }
          if (parsed.tag !== MEMO) return;

          out.push({
            creator: attrs[REVEAL_EVENT_ATTRS.creator],
            price: Number(parsed.memo.prediction),
          });
        });
    })
  );
  return out;
}

/* ───── main page component ────────────────────────────────────── */
export default function CapsulesPage() {
  const { data: account } = useAccount();
  const { error: walletError } = useConnect();
  const { suggestAndConnect } = useSuggestChainAndConnect();

  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "yours">("all");

  /* progress + rotating messages */
  const [progress, setProgress] = useState(10);
  const [msgIndex, setMsgIndex] = useState(0);
  const loadingMessages = [
    "Fetching capsules…",
    "Sorting capsules…",
    "Almost there…",
  ];

  /* animate loader */
  useEffect(() => {
    if (!loading) return;
    const grow = setInterval(() => {
      setProgress((p) => Math.min(p + 5 + Math.random() * 6, 95));
    }, 600);
    const rotate = setInterval(
      () => setMsgIndex((i) => (i + 1) % loadingMessages.length),
      2000
    );
    return () => {
      clearInterval(grow);
      clearInterval(rotate);
      setProgress(10);
    };
  }, [loading]);

  /* auto‑connect */
  useEffect(() => {
    if (walletError) {
      suggestAndConnect({ chainInfo: fairyring, walletType: WalletType.KEPLR });
    }
  }, [walletError, suggestAndConnect]);

  /* main fetch */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await fetch("/api/deadline/next").then((r) => r.json());
        const last = await fetch("/api/deadline/last").then((r) => r.json());
        console.log("next deadline:", next);
        console.log("last deadline:", last);
        const nextH = Number(next?.nextDeadline?.target_block);
        const nextToken =
          next?.nextDeadline?.symbol ?? next?.nextDeadline?.token ?? "—";

        const lastH = Number(last?.lastDeadline?.target_block);
        const lastToken =
          last?.lastDeadline?.symbol ?? last?.lastDeadline?.token ?? "—";

        if (!nextH || !lastH) throw new Error("deadline heights missing");

        /* 1️⃣ encrypted capsules */
        const encryptedCaps: Capsule[] = [];
        const now = await getCurrentBlockHeight();
        const minHeight = (now - ONE_WEEK) > 0 ? now - ONE_WEEK : 0;
        const q = encodeURIComponent(
          `tx.height>${minHeight} AND message.action='/fairyring.pep.MsgSubmitEncryptedTx'`
        );

        let page = 1;
        while (!cancelled) {
          const url =
          `${RPC}/tx_search` +
          `?query=%22${q}%22` +           // "%22" … "%22" == JSON double-quotes
          `&order_by=%22desc%22` +        // `"desc"` must also be JSON-quoted
          `&per_page=${PER_PAGE}` +
          `&page=${page}`;
          const res = await fetch(url).then((r) => r.json());
          console.log(res)
          const txs = res.result?.txs ?? [];
          for (const row of txs) {
            const raw = TxRaw.decode(Buffer.from(row.tx, "base64"));
            const body = TxBody.decode(raw.bodyBytes);

            const anyMsg = body.messages.find(
              (m) => m.typeUrl === "/fairyring.pep.MsgSubmitEncryptedTx"
            );
            if (!anyMsg) continue;

            const msg = MsgSubmitEncryptedTx.decode(
              new Uint8Array(anyMsg.value)
            );
            if (msg.targetBlockHeight !== nextH) continue;

            encryptedCaps.push({
              creator: msg.creator,
              target: nextH,
              token: nextToken,
              type: "encrypted",
              data: msg.data,
            });
          }
          if (txs.length < PER_PAGE) break;
          page += 1;
        }

        /* 2️⃣ revealed capsules */
        const revealedTxs = await fetchRevealedTxs([lastH]);
        const revealedCaps: Capsule[] = revealedTxs.map(
          (tx): Capsule => ({
            creator: tx.creator,
            target: lastH,
            token: String(lastToken),
            type: "revealed",
            price: tx.price,
          })
        );

        if (!cancelled) {
          const merged = [...encryptedCaps, ...revealedCaps];
          const uniqueMap = new Map<string, Capsule>();
          for (const c of merged) {
            uniqueMap.set(`${c.type}-${c.creator}-${c.target}`, c);
          }
          setCapsules(Array.from(uniqueMap.values()));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setCapsules([]);
      } finally {
        if (!cancelled) {
          setProgress(100);
          setTimeout(() => !cancelled && setLoading(false), 400);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const list =
    tab === "all"
      ? capsules
      : capsules.filter((c) => c.creator === account?.bech32Address);

  /* Height for edge images when visible (≥ lg) */
  const EDGE_HEIGHT = "70vh";

  /* UI */
  return (
    <>
      <Header />
      <div className="font-sans bg-gradient-to-r from-[#EBEFF7] via-white to-[#EBEFF7] pt-[75px] min-h-screen relative">
        {/* decorative edge images – show only ≥ lg */}
        <div
          className="absolute left-0 hidden lg:block pointer-events-none select-none z-10"
          style={{
            height: EDGE_HEIGHT,
            top: `calc(55% - ${EDGE_HEIGHT}/2)`,
            width: "35vw",
            maxWidth: "520px",
          }}
        >
          <Image
            src="/Left.png"
            alt=""
            fill
            priority
            className="object-cover filter grayscale opacity-40"
          />
        </div>
        <div
          className="absolute right-0 hidden lg:block pointer-events-none select-none z-10"
          style={{
            height: EDGE_HEIGHT,
            top: `calc(55% - ${EDGE_HEIGHT}/2)`,
            width: "35vw",
            maxWidth: "520px",
          }}
        >
          <Image
            src="/Right.png"
            alt=""
            fill
            priority
            className="object-cover filter grayscale opacity-40"
          />
        </div>
        <main className="bg-white border border-[#DCDCDC] mx-auto xl:my-16 px-4 sm:px-16 xl:px-8 py-10 rounded-xl space-y-6 max-w-[1360px] min-h-screen xl:min-h-[70vh] relative z-20">
          <h1 className="text-3xl font-bold text-center uppercase tracking-wide">
            Encrypted Capsules
          </h1>

          <div className="flex justify-center space-x-6 border-b text-sm font-medium">
            {(["all", "yours"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={
                  tab === t
                    ? "cursor-pointer border-b-2 border-black px-4 pb-3 text-black"
                    : "cursor-pointer pb-3 text-gray-500"
                }
              >
                {t === "all" ? "All" : "Yours"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {loading ? (
              <LoadingCapsules
                progress={progress}
                message={loadingMessages[msgIndex]}
              />
            ) : list.length ? (
              list.map((c, i) => (
                <CapsuleCard key={`${c.target}-${c.creator}-${i}`} {...c} />
              ))
            ) : (
              <p className="text-center text-gray-400 col-span-full mt-12">
                No capsules found.
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
