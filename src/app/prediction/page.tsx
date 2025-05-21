'use client';

import Header from '@/components/header/Header';
import Image   from 'next/image';
import TokenChart from '@/components/charts/TokenChart';
import CountdownTimer from '@/components/countdown-timer/CountdownTimer';
import PredictionForm from '@/components/forms/PredictionForm';
import { useActiveToken } from '@/hooks/useActiveToken';

export default function Prediction() {
  const { data: token, isLoading } = useActiveToken();
  if (isLoading) return <p className="text-center mt-20">Loading…</p>;

  const iconSrc = `/${token!.symbol.toLowerCase()}.png`;

  return (
    /* ── Top‑level container drives the full‑page background ─────────── */
    <div className="relative min-h-screen font-sans">

      {/* 🔥 Full‑screen background image (covers entire viewport) */}
      <Image
        src="/bg.png"
        alt=""                 // decorative
        fill                   // object‑fit:cover; position:absolute; inset:0
        className="object-cover -z-20"
        priority               // load immediately
      />

      {/* Foreground content starts here */}
      <Header />

      <main className="flex flex-col items-center p-8 max-w-4xl mx-auto space-y-10">
        <h1 className="text-5xl font-bold uppercase gradient-text">
          Predict {token!.coingecko_id} Price
        </h1>

        {/* Chart card */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-6 w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Image src={iconSrc} alt={token!.symbol} width={58} height={58} />
              <span className="text-xl font-semibold">{token!.symbol}</span>
            </div>
            <span className="text-gray-600">Current Price Chart</span>
          </div>
          <TokenChart />
        </div>

        {/* Prediction form */}
        <PredictionForm
          label={`Your ${token!.symbol} prediction in USD`}
          placeholder="Eg: $168"
          buttonText="Encrypt Now"
        />

        <CountdownTimer />
      </main>
    </div>
  );
}
