/* app/prediction/page.tsx */
'use client';

import { useState }      from 'react'
import Image             from 'next/image'
import Header            from '@/components/header/Header'
import TokenChart        from '@/components/charts/TokenChart'
import CountdownTimer    from '@/components/countdown-timer/CountdownTimer'
import PredictionForm    from '@/components/forms/PredictionForm'
import { useActiveToken } from '@/hooks/useActiveToken'

const EDGE_HEIGHT = '70vh'

export default function Prediction() {
  /* banner visibility — must be first */
  const [showBanner, setShowBanner] = useState(true)

  const { data: token, isLoading } = useActiveToken()
  if (isLoading) return <p className="text-center mt-20">Loading…</p>

  const iconSrc = `/${token!.symbol.toLowerCase()}.png`

  return (
    <div className="relative min-h-screen font-sans bg-[#E8ECEF] overflow-hidden">
      {/* decorative edges */}
      <div className="absolute left-0 pointer-events-none select-none"
           style={{ height: EDGE_HEIGHT, top:`calc(50% - ${EDGE_HEIGHT}/2)`, width:'35vw', maxWidth:'520px' }}>
        <Image src="/Left.png" alt="" fill priority className="object-cover" />
      </div>
      <div className="absolute right-0 pointer-events-none select-none"
           style={{ height: EDGE_HEIGHT, top:`calc(50% - ${EDGE_HEIGHT}/2)`, width:'35vw', maxWidth:'520px' }}>
        <Image src="/Right.png" alt="" fill priority className="object-cover" />
      </div>

      <Header />

      {/* floating campaign banner */}
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
            The campaign has not yet started; all points will be reset before official launch.
          </span>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-3 shrink-0 rounded-full hover:bg-gray-400/10 p-1 transition"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

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
  )
}
