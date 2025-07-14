/* pages/prediction/Prediction.tsx  (or wherever this lives) */
"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/header/Header";
import TokenChart from "@/components/charts/TokenChart";
import CountdownTimer from "@/components/countdown-timer/CountdownTimer";
import PredictionForm from "@/components/forms/PredictionForm";
import { useActiveToken } from "@/hooks/useActiveToken";
import { useHowItWorksContext } from "@/contexts/HowItWorksContext";

/* Height for decorative side images (≥ lg) */
const EDGE_HEIGHT = "70vh";

/* UTC weekday each token opens (Sun = 0) — all at 11 : 00 UTC ★ changed */
const ROTATION = ["SOL", "BTC", "ARB", "ETH"] as const;
const TOKEN_OPEN_DOW: Record<(typeof ROTATION)[number], number> = {
  SOL: 1,  // Monday 11 : 00
  ARB: 1,
  BTC: 4,  // Thursday 11 : 00
  ETH: 4,
};

/* === helpers ===================================================== */
/**
 * Returns a Date at 11:00 UTC on the next opening weekday for this token. ★ changed
 */
function nextOpenDate(
  symbol: (typeof ROTATION)[number],
  now: Date = new Date(),
) {
  const openDow = TOKEN_OPEN_DOW[symbol];
  const date = new Date(now);
  date.setUTCHours(11, 0, 0, 0);                   // 11 : 00 UTC ★ changed

  const todayDow = date.getUTCDay();
  if (todayDow === openDow && now < date) {
    // still before 11 : 00 on the correct weekday → use today
    return date;
  }

  /* otherwise jump forward ▸ (openDow + 7 − todayDow) % 7  (never zero) */
  const delta =
    ((openDow + 7 - todayDow) % 7) || 7;           // always future‑looking
  date.setUTCDate(date.getUTCDate() + delta);      // MDN setUTCDate :contentReference[oaicite:0]{index=0}
  return date;
}

/**
 * Nicely formats “in X days / in 1 day and Y hours / in N hours”.
 */
function fmtTimeUntil(future: Date, now: Date = new Date()) {
  const diffMs   = Math.max(0, future.getTime() - now.getTime());
  const DAY_MS   = 86_400_000;
  const HOUR_MS  = 3_600_000;

  const days  = Math.floor(diffMs / DAY_MS);
  const hours = Math.floor((diffMs % DAY_MS) / HOUR_MS);

  if (days > 1) return `${days} days`;
  if (days === 1) {
    return hours
      ? `1 day and ${hours} hour${hours === 1 ? "" : "s"}`
      : "1 day";
  }
  return `${hours || 0} hour${hours === 1 ? "" : "s"}`;
}

export default function Prediction() {
  const [showCampaignBanner, setShowCampaignBanner] = useState(false);
  const { data: token, isLoading } = useActiveToken();

  /* 1️⃣ loading state */
  if (isLoading) return <p className="text-center mt-20">Loading…</p>;

  /* 2️⃣ Sunday window‑closed logic (UTC) */
  const todayDow = new Date().getUTCDay();  // 0 = Sunday
  const closedToday = todayDow === 0;       // no token on Sundays

  /* 3️⃣ ribbon helpers */
  const idx        = ROTATION.indexOf(token!.symbol as (typeof ROTATION)[number]);
  const nextSymbol = ROTATION[(idx + 1) % ROTATION.length];
  const timeToNext = fmtTimeUntil(nextOpenDate(nextSymbol));
  const nextHeading = `Next token: ${nextSymbol} in ${timeToNext}`;

  /* 4️⃣ image src */
  const iconSrc = `/${token!.symbol.toLowerCase()}.png`;

  const { setShowModal } = useHowItWorksContext();

  /* ── JSX ─────────────────────────────────────────────────────── */
  return (
    <>
      <Header />

      {/* wrapper */}
      <div className="relative flex flex-col font-sans bg-gradient-to-r from-[#EBEFF7] via-white to-[#EBEFF7] pt-[80px] min-h-screen">
        {/* side images (≥ lg) */}
        {/* … unchanged … */}

        {/* campaign-reset banner (unchanged) */}
        {showCampaignBanner && (
          /* … unchanged … */
        )}

        {/* === MAIN ================================================= */}
        <main
          className={[
            "flex-1 flex flex-col items-center justify-center gap-4 sm:gap-5 lg:gap-6",
            "px-6 sm:px-8 md:px-10 lg:px-12 py-6",
            closedToday && "filter blur-sm pointer-events-none select-none",
          ].join(" ")}
        >
          {/* next‑token ribbon */}
          <h3 className="font-medium border border-black mt-4 px-5 py-2 rounded-2xl text-center text-sm uppercase">
            {nextHeading}
          </h3>

          {/* heading */}
          <h1 className="relative text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase gradient-text text-center z-20">
            Predict {token!.coingecko_id} Price
          </h1>

          {/* price card */}
          {/* … unchanged … */}

          <CountdownTimer />

          <PredictionForm
            label={`Your ${token!.symbol} prediction in USD`}
            buttonText="Encrypt Now"
          />

          <p
            className="cursor-pointer font-medium underline mb-4"
            onClick={() => setShowModal(true)}
          >
            How it Works
          </p>
        </main>

        {/* Sunday overlay banner */}
        {closedToday && (
          <div className="bg-white/60 fixed inset-0 pointer-events-auto flex items-center justify-center z-50">
            <div className="pointer-events-auto bg-white backdrop-blur-lg shadow-xl ring-1 ring-gray-300 rounded-2xl px-8 py-6 text-center max-w-md mx-auto">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Prediction window is closed.
              </p>
              <p className="text-sm text-gray-700">
                Week 1 is wrapped! Next token prediction opens Monday&nbsp;
                <strong>11:00 UTC</strong>. <br /> Enjoy your Sunday and touch
                some grass.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
