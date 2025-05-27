'use client';

import Header          from '@/components/header/Header';
import Image           from 'next/image';
import TokenChart      from '@/components/charts/TokenChart';
import CountdownTimer  from '@/components/countdown-timer/CountdownTimer';
import PredictionForm  from '@/components/forms/PredictionForm';
import { useActiveToken } from '@/hooks/useActiveToken';

/** ⬇️  tweak this to whatever height you want */
const EDGE_HEIGHT = '70vh';        // '600px', '100%', etc.

export default function Prediction() {
  const { data: token, isLoading } = useActiveToken();
  if (isLoading) return <p className="text-center mt-20">Loading…</p>;

  const iconSrc = `/${token!.symbol.toLowerCase()}.png`;

  /*───────────────────────────────────────────────────────────────*/
  return (
    <div className="relative min-h-screen font-sans bg-[#E8ECEF] overflow-hidden">
      {/* left‑edge art */}
      <div
        className="absolute left-0 pointer-events-none select-none"
        style={{
          height: EDGE_HEIGHT,
          top: `calc(50% - ${EDGE_HEIGHT} / 2)`, // vertical‑center
          width: '35vw',                         // stays responsive
          maxWidth: '520px',
        }}
      >
        <Image src="/Left.png" alt="" fill priority className="object-cover" />
      </div>

      {/* right‑edge art */}
      <div
        className="absolute right-0 pointer-events-none select-none"
        style={{
          height: EDGE_HEIGHT,
          top: `calc(50% - ${EDGE_HEIGHT} / 2)`,
          width: '35vw',
          maxWidth: '520px',
        }}
      >
        <Image src="/Right.png" alt="" fill priority className="object-cover" />
      </div>

      <Header />

      <main className="relative z-10 flex flex-col items-center p-8 max-w-4xl mx-auto space-y-10">
        <h1 className="text-5xl font-bold uppercase gradient-text">
          Predict {token!.coingecko_id} Price
        </h1>

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
