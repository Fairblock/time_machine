"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/header/Header";
import TokenChart from "@/components/charts/TokenChart";
import CountdownTimer from "@/components/countdown-timer/CountdownTimer";
import PredictionForm from "@/components/forms/PredictionForm";
import { useActiveToken } from "@/hooks/useActiveToken";
import { differenceInDays } from "date-fns";

/* Height for decorative side images (≥ lg) */
const EDGE_HEIGHT = "70vh";

/* UTC weekday each token opens (Sun = 0) */
const ROTATION = ["SOL", "BTC", "ARB", "ETH"] as const;
const TOKEN_OPEN_DOW: Record<(typeof ROTATION)[number], number> = {
  SOL: 1,   // Monday
  ARB: 1,
  BTC: 4,   // Thursday
  ETH: 4,
};

/* === helpers ===================================================== */
/**
 * Returns a Date at 00:00 UTC on the next opening weekday for this token.
 * Using a real Date lets us round days the same way date-fns does, so the
 * ribbon and countdown card always agree.
 */
function nextOpenDate(
  symbol: (typeof ROTATION)[number],
  now: Date = new Date(),
) {
  const openDow = TOKEN_OPEN_DOW[symbol];
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);                       // midnight UTC today
  const delta = (openDow + 7 - date.getUTCDay()) % 7 || 7; // always future-looking
  date.setUTCDate(date.getUTCDate() + delta);
  return date;
}
function fmtTimeUntil(future: Date, now: Date = new Date()) {
  const diffMs   = Math.max(0, future.getTime() - now.getTime());
  const DAY_MS   = 86_400_000;
  const HOUR_MS  = 3_600_000;

  const days     = Math.floor(diffMs / DAY_MS);
  const hours    = Math.floor((diffMs % DAY_MS) / HOUR_MS);

  if (days > 1) return `${days} days`;
  if (days === 1) {
    return hours
      ? `1 day and ${hours} hour${hours === 1 ? "" : "s"}`
      : "1 day";
  }
  return `${hours || 0} hour${hours === 1 ? "" : "s"}`;
}
export default function Prediction() {
  const [showCampaignBanner, setShowCampaignBanner] = useState(true);
  const { data: token, isLoading } = useActiveToken();

  /* 1️⃣ loading state */
  if (isLoading) return <p className="text-center mt-20">Loading…</p>;

  /* 2️⃣ Sunday window-closed logic (UTC) */
  const todayDow = new Date().getUTCDay();      // 0 = Sunday
  const closedToday = todayDow === 0;           // no token on Sundays

  /* 3️⃣ heading helpers */
  const idx         = ROTATION.indexOf(token!.symbol as (typeof ROTATION)[number]);
  const nextSymbol  = ROTATION[(idx + 1) % ROTATION.length];
  const timeToNext  = fmtTimeUntil(nextOpenDate(nextSymbol));
  const nextHeading = `Next token: ${nextSymbol} in ${timeToNext}`;
  /* 4️⃣ image src */
  const iconSrc = `/${token!.symbol.toLowerCase()}.png`;

  /* ── JSX ─────────────────────────────────────────────────────── */
  return (
    <>
      <Header />

      {/* wrapper */}
      <div className="relative flex flex-col font-sans bg-gradient-to-r from-[#EBEFF7] via-white to-[#EBEFF7] pt-[80px] min-h-screen">
        {/* side images (≥ lg) */}
        <div
          className="absolute left-0 hidden lg:block pointer-events-none select-none"
          style={{
            height: EDGE_HEIGHT,
            top: `calc(50% - ${EDGE_HEIGHT}/2)`,
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
          className="absolute right-0 hidden lg:block pointer-events-none select-none"
          style={{
            height: EDGE_HEIGHT,
            top: `calc(50% - ${EDGE_HEIGHT}/2)`,
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

        {/* campaign-reset floating banner (unchanged) */}
        {showCampaignBanner && (
          <div className="fixed top-24 right-4 sm:right-8 lg:right-16 z-30 max-w-xs w-[90%] sm:w-80 rounded-xl shadow-lg ring-1 ring-gray-300/60 bg-white/85 backdrop-blur px-5 py-3 text-xs sm:text-sm text-gray-800 flex items-center">
            <span className="leading-snug">
              The campaign has not yet started; all points will be reset before
              official launch.
            </span>
            <button
              onClick={() => setShowCampaignBanner(false)}
              aria-label="Close"
              className="ml-3 shrink-0 rounded-full hover:bg-gray-400/10 p-1 transition"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M4 4L12 12M12 4L4 12"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        )}

        {/* === MAIN ================================================= */}
        <main
          className={[
            "flex-1 flex flex-col items-center justify-center gap-4 sm:gap-5 lg:gap-6",
            "px-6 sm:px-8 md:px-10 lg:px-12 py-6",
            closedToday && "filter blur-sm pointer-events-none select-none", // ← blur & disable
          ].join(" ")}
        >
          {/* next-token ribbon */}
          <h3 className="font-medium border border-black mt-4 px-5 py-2 rounded-2xl text-center text-sm uppercase">
            {nextHeading}
          </h3>

          {/* heading */}
          <h1 className="relative text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase gradient-text text-center z-20">
            Predict {token!.coingecko_id} Price
          </h1>

          {/* price card */}
          <div className="w-full max-w-4xl bg-white/90 backdrop-blur rounded-xl shadow p-3 sm:p-4 md:p-5 lg:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Image
                  src={iconSrc}
                  alt={token!.symbol}
                  width={40}
                  height={40}
                />
                <span className="text-base sm:text-lg font-semibold">
                  {token!.symbol}
                </span>
              </div>
              <span className="text-gray-600 text-xs sm:text-sm">
                Current Price Chart
              </span>
            </div>
            <div className="w-full h-[34vh] md:h-[38vh] lg:h-[42vh]">
              <TokenChart />
            </div>
          </div>

          {/* form & countdown */}
          <PredictionForm
            label={`Your ${token!.symbol} prediction in USD`}
            placeholder="Eg: $168"
            buttonText="Encrypt Now"
          />
          <CountdownTimer />
        </main>

        {/* Sunday overlay banner */}
        {closedToday && (
          <div className="bg-white/60 fixed inset-0 pointer-events-auto flex items-center justify-center z-50">
            <div className="pointer-events-auto bg-white backdrop-blur-lg shadow-xl ring-1 ring-gray-300 rounded-2xl px-8 py-6 text-center max-w-md mx-auto">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Prediction window is closed.
              </p>
              <p className="text-sm text-gray-700">It will open on Monday.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
