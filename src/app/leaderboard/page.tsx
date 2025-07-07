/* app/leaderboard/page.tsx */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount } from "graz";
import {
  Copy,
  Menu,
  X as CloseIcon,
  Wallet,
  InfoIcon,
  CircleX,
} from "lucide-react";

import Header from "@/components/header/Header";
import CountdownClock from "@/components/countdown-timer/CountdownClock";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/* ── API types ────────────────────────────────────────────── */
type OverallRow = { address: string; totalScore: number };
type TokenRow = {
  address: string;
  guess: number;
  delta: number;
  score: number;
  mult: number; // ← NEW
};
type TokenMeta = {
  price: number | null;
  date: string | null;
  url: string | null;
  block: number | null;
};

type ApiResp = {
  overall: OverallRow[];
  tokens: Record<"SOL" | "BTC" | "ETH" | "ARB", TokenRow[]>;
  tweetScores: { address: string; score: number }[];
  tokenInfo: Record<"SOL" | "BTC" | "ETH" | "ARB", TokenMeta>;
};

/* ── extra type for tweet claim flow ─────────────────────── */
type PendingProof = { token: string; createdAt: string };

/* ── constants ───────────────────────────────────────────── */
const TOKENS = ["SOL", "BTC", "ARB", "ETH"] as const;
const SLIDES = ["Overall", "Tweets", ...TOKENS] as const;
type SlideKey = (typeof SLIDES)[number];

/* ── helpers ─────────────────────────────────────────────── */
const longShort = (addr: string) => addr.slice(0, 10) + "…" + addr.slice(-6);
const medals = ["/1st.png", "/2nd.png", "/3rd.png"] as const;

const fmtPrice = (n: number | null) =>
  n === null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(n);

const fmtDateUTC = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const m = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][d.getUTCMonth()];
  return `${String(d.getUTCDate()).padStart(
    2,
    "0"
  )} ${m} ${d.getUTCFullYear()}`;
};
const fmtBlock = (b: number | null) =>
  b === null ? "—" : "Block #" + b.toLocaleString();
const Bullet = () => <span className="text-gray-400">•</span>;

/* ── component ───────────────────────────────────────────── */
export default function LeaderboardPage() {
  const { data: account } = useAccount();

  /* ui state */
  const [active, setActive] = useState<SlideKey>("Overall");
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  /* api data */
  const [overall, setOverall] = useState<OverallRow[]>([]);
  const [tokens, setTokens] = useState<ApiResp["tokens"]>({
    SOL: [],
    BTC: [],
    ETH: [],
    ARB: [],
  });
  const [tweets, setTweets] = useState<ApiResp["tweetScores"]>([]);
  const [meta, setMeta] = useState<ApiResp["tokenInfo"]>({
    SOL: { price: null, date: null, url: null, block: null },
    BTC: { price: null, date: null, url: null, block: null },
    ETH: { price: null, date: null, url: null, block: null },
    ARB: { price: null, date: null, url: null, block: null },
  });

  /* tweet‑claim flow */
  const [pending, setPending] = useState<PendingProof | null>(null);
  const [tweetUrl, setTweetUrl] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);

  /* ── fetch leaderboard once ─ */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/winner", { cache: "no-store" });
        const js = await res.json();
        if (!res.ok) throw new Error(js.error || "failed");
        setOverall(js.overall);
        setTokens(js.tokens);
        setTweets(js.tweetScores); // ← NEW
        setMeta(js.tokenInfo);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── fetch pending proof token ─ */
  useEffect(() => {
    setPending(null);
    if (!account?.bech32Address) return;
    fetch(`/api/twitter/pending?wallet=${account.bech32Address}`)
      .then(async (r) => (r.ok ? r.json() : {}))
      .then((js) => {
        if (js.token) setPending(js as PendingProof);
      })
      .catch(console.error);
  }, [account?.bech32Address]);

  /* ── claim handler ─ */
  const handleClaim = async () => {
    if (!pending || !tweetUrl || !account?.bech32Address) return;
    setClaimErr(null);
    setClaiming(true);
    try {
      const res = await fetch("/api/twitter/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: account.bech32Address,
          token: pending.token,
          url: tweetUrl,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "failed");
      }
      setClaimed(true);
      setPending(null);

      /* refresh leaderboard */
      fetch("/api/winner", { cache: "no-store" })
        .then((r) => r.json())
        .then((j) => {
          setOverall(j.overall);
          setTweets(j.tweetScores);
        });
    } catch (e: any) {
      setClaimErr(e.message);
    } finally {
      setClaiming(false);
    }
  };

  /* ── my rank/score ─ */
  const me = useMemo(() => {
    if (!account?.bech32Address) return { rank: "—", points: "—" };
    const idx = overall.findIndex((r) => r.address === account.bech32Address);
    return idx === -1
      ? { rank: "—", points: "—" }
      : { rank: idx + 1, points: overall[idx].totalScore };
  }, [overall, account?.bech32Address]);

  /* ── table rows & headers ─ */
  const rows =
    active === "Overall"
      ? overall.map((r) => ({
          address: r.address,
          cols: [r.totalScore.toLocaleString()],
        }))
      : active === "Tweets"
      ? tweets.map((r) => ({
          address: r.address,
          cols: [r.score.toLocaleString()],
        }))
      : tokens[active as keyof typeof tokens].map((r) => ({
          address: r.address,
          cols: [
            /* Score  ─ number on top, multiplier pill below */
            <span className="flex justify-center leading-snug">
              {/* score */}
              <span className=" text-gray-900 tabular-nums">
                {r.score.toLocaleString()}
              </span>
            </span>,
            <span className="flex justify-center leading-snug">
              {/* multiplier pill */}
              <span
                className="
                  mt-[2px] px-2 py-[1px]
                  rounded-full bg-gray-200/70
                  text-[12px] font-medium text-gray-700 tabular-nums
                "
                title="Time-bonus multiplier"
              >
                ×{r.mult.toFixed(2)}
              </span>
            </span>,
            /* remaining columns unchanged */
            r.guess.toLocaleString(),
            r.delta.toLocaleString(),
          ],
        }));

  const headers: Record<SlideKey, string[]> = {
    Overall: ["Total Pts"],
    Tweets: ["Points"], // ← NEW
    SOL: ["Points", "Early Boost", "Prediction", "Delta"],
    BTC: ["Points", "Early Boost", "Prediction", "Delta"],
    ETH: ["Points", "Early Boost", "Prediction", "Delta"],
    ARB: ["Points", "Early Boost", "Prediction", "Delta"],
  };

  /* other derived data */
  const current =
    active !== "Overall" && active !== "Tweets"
      ? meta[active as keyof typeof meta]
      : null;

  const avatar = account?.bech32Address
    ? `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
        account.bech32Address
      )}`
    : null;

  /* responsive grid logic (unchanged) */
  const showClaim = pending && !claimed;
  const showBanner = claimed;
  const gridCols =
    showClaim || showBanner ? "lg:grid-cols-3" : "lg:grid-cols-2";

  /* ── JSX ─────────────────────────────────────────────────────── */
  return (
    <>
      <Header />
      <div className="font-sans bg-gray-50 min-h-screen pt-[80px]">
        <main className="max-w-[1440px] mx-auto px-4 pt-12 space-y-12">
          {/* top panel grid */}
          <div className={`grid gap-8 grid-cols-1 ${gridCols}`}>
            <CountdownClock />

            {/* wallet card */}
            <div className="bg-white border-2 xl:border-3 border-[#A9BDC3] rounded-2xl shadow flex flex-col items-center justify-between">
              {avatar ? (
                <img
                  src={avatar}
                  alt="avatar"
                  className="h-20 w-20 rounded-full my-4"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-100 shadow-inner my-4 flex items-center justify-center">
                  <Wallet size={34} className="text-gray-400" />
                </div>
              )}
              <div className="text-xl font-medium break-all text-center">
                {account?.bech32Address
                  ? longShort(account.bech32Address)
                  : "Connect wallet"}
              </div>

              <div className="flex w-full mt-5 text-center border-t-2 border-[#A9BDC3]">
                <div className="flex-1 border-r-2 border-[#A9BDC3] py-5">
                  <p className="text-gray-500 text-base">Rank</p>
                  <p className="text-5xl font-semibold">
                    {loading ? "—" : me.rank}
                  </p>
                </div>
                <div className="flex-1 py-5">
                  <p className="text-gray-500 text-base">Points</p>
                  <p className="text-5xl font-semibold">
                    {loading ? "—" : me.points}
                  </p>
                </div>
              </div>
            </div>

            {/* claim panel */}
            {showClaim && (
              <div className="bg-white border-2 xl:border-3 border-[#A9BDC3] rounded-2xl shadow p-4 flex flex-col space-y-4">
                <h3 className="text-base font-semibold">Claim 200 pts</h3>
                <p className="text-xs text-gray-600">
                  Paste the tweet URL below.
                </p>

                <Input
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  placeholder="https://twitter.com/…/status/…"
                />

                <Button
                  disabled={!tweetUrl || claiming}
                  onClick={handleClaim}
                  className="w-full text-sm"
                >
                  {claiming ? "Verifying…" : "Verify & Collect"}
                </Button>

                {claimErr && <p className="text-xs text-red-600">{claimErr}</p>}
              </div>
            )}

            {showBanner && (
              <div className="bg-green-50 text-green-800 rounded-2xl shadow flex items-center justify-center p-6 text-sm">
                Verified! 200 points added.
              </div>
            )}
          </div>

          {/* slide tabs */}
          <div className="flex sm:justify-center gap-2 py-2 overflow-x-auto mx-auto">
            {SLIDES.map((k) => (
              <button
                key={k}
                onClick={() => setActive(k)}
                className={`px-4 py-1 rounded-xl text-sm transition hover:cursor-pointer
                ${
                  active === k
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 shadow"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* price badge (skip for Overall / Tweets) */}
          {current && (
            <div className="flex justify-center mb-8">
              <a
                href={current.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1 rounded-xl
                          bg-white/70 backdrop-blur ring-1 ring-gray-300/70 shadow-sm
                          text-gray-700 hover:text-gray-900 overflow-scroll sm:overflow-auto"
              >
                <span>Price on {fmtDateUTC(current.date)} UTC</span>
                <Bullet />
                <span className="tabular-nums">{fmtBlock(current.block)}</span>
                <Bullet />
                <span className="tabular-nums font-semibold">
                  {fmtPrice(current.price)}
                </span>
              </a>
            </div>
          )}

          {/* leaderboard table */}
          <div className="relative">
            <section className="overflow-x-auto shadow ring-1 ring-gray-200 rounded-2xl bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-4 md:px-8 py-3 text-center">#</th>
                    <th className="px-4 md:px-8 py-3 text-center">Address</th>
                    {headers[active].map((h) => (
                      <th key={h} className="px-4 md:px-8 py-3 text-center">
                        <div className="flex gap-2 justify-center items-center min-w-24">
                          {h}
                          {h === "Delta" && (
                            <div
                              className="relative inline-block"
                              onMouseEnter={() => setShowTooltip(true)}
                              onMouseLeave={() => setShowTooltip(false)}
                            >
                              <InfoIcon
                                width={18}
                                // onClick={() => setShowTooltip(!showTooltip)}
                                className="cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr
                      key={r.address}
                      className="odd:bg-white even:bg-gray-50"
                    >
                      <td className="pl-4 md:px-8 py-2 flex items-center justify-center">
                        {i < medals.length ? (
                          <img src={medals[i]} className="w-4" />
                        ) : (
                          i + 1
                        )}
                      </td>
                      <td className="px-4 md:px-8 py-2 font-mono break-all truncate text-center">
                        {longShort(r.address)}
                      </td>
                      {r.cols.map((c, idx) => {
                        return (
                          <td
                            key={idx}
                            className="px-4 py-2 md:px-8 text-center tabular-nums"
                          >
                            {c}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            {showTooltip && (
              <p className="absolute -top-12 right-0 border-2 border-gray-[#A9BDC3] bg-gray-50 font-normal flex gap-2 items-center px-4 py-2 rounded-xl text-sm bg-red-white min-w-fit whitespace-nowrap z-50">
                The difference between your guess and the actual price.
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
