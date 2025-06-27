/* app/prediction/page.tsx */
"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/header/Header";
import TokenChart from "@/components/charts/TokenChart";
import CountdownTimer from "@/components/countdown-timer/CountdownTimer";
import PredictionForm from "@/components/forms/PredictionForm";
import { useActiveToken } from "@/hooks/useActiveToken";

/* Height for edge images when visible (≥ lg) */
const EDGE_HEIGHT = "70vh";

export default function Prediction() {
  const [showBanner, setShowBanner] = useState(true);

  const { data: token, isLoading } = useActiveToken();
  if (isLoading) return <p className="text-center mt-20">Loading…</p>;

  const iconSrc = `/${token!.symbol.toLowerCase()}.png`;

  return (
    <>
      <Header />

      {/* === viewport‑locked wrapper ================================= */}
      <div className="relative flex flex-col font-sans bg-gradient-to-r from-[#EBEFF7] via-white to-[#EBEFF7] pt-[80px] min-h-screen">
        {/* decorative edge images – show only ≥ lg */}
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

        {/* top nav */}

        {/* floating banner */}
        {showBanner && (
          <div
            className="
            fixed top-24 right-4 sm:right-8 lg:right-16 z-30
            max-w-xs w-[90%] sm:w-80
            rounded-xl shadow-lg ring-1 ring-gray-300/60
            bg-white/85 backdrop-blur
            px-5 py-3 text-xs sm:text-sm text-gray-800
            flex items-center
          "
          >
            <span className="leading-snug">
              The campaign has not yet started; all points will be reset before
              official launch.
            </span>
            <button
              onClick={() => setShowBanner(false)}
              className="ml-3 shrink-0 rounded-full hover:bg-gray-400/10 p-1 transition"
              aria-label="Close"
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

        {/* === MAIN =================================================== */}
        <main
          className="
          flex-1                          /* fill remaining viewport height */
          flex flex-col items-center
          justify-center                  /* centre on taller screens */
          gap-4 sm:gap-5 lg:gap-6
          px-6 sm:px-8 md:px-10 lg:px-12 py-6
        "
        >
          {/* heading */}
          <h1
            className="
            relative text-2xl sm:text-3xl md:text-4xl font-extrabold
            uppercase gradient-text text-center z-20
          "
          >
            Predict {token!.coingecko_id} Price
          </h1>

          {/* price card */}
          <div
            className="
            w-full max-w-4xl
            bg-white/90 backdrop-blur rounded-2xl shadow
            p-3 sm:p-4 md:p-5 lg:p-6
            space-y-4
          "
          >
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

            {/* chart ‑‑ cap at 30 vh on small, grow on large */}
            <div className="w-full h-[34vh] md:h-[38vh] lg:h-[42vh]">
              <TokenChart />
            </div>
          </div>

          {/* form – stays compact */}
          <PredictionForm
            label={`Your ${token!.symbol} prediction in USD`}
            placeholder="Eg: $168"
            buttonText="Encrypt Now"
          />

          {/* countdown */}
          <CountdownTimer />
        </main>
      </div>
    </>
  );
}
