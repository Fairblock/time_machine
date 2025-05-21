'use client';

import Image from 'next/image';
import Link  from 'next/link';
import Header from '@/components/header/Header';
import { useActiveToken } from '@/hooks/useActiveToken';

/* 1️⃣  token list */
const TOKENS = [
  { id: 'solana',   symbol: 'SOL',  logo: '/sol.png'  },
  { id: 'bitcoin',  symbol: 'BTC',  logo: '/btc.png'  },
  { id: 'ethereum', symbol: 'ETH',  logo: '/eth.png'  },
  { id: 'chainlink',symbol: 'LINK', logo: '/link.png' },
];

export default function Home() {
  const { data: active } = useActiveToken();

  return (
    <div className="relative min-h-screen font-sans">
      <Image src="/bgHome.png" alt="" fill priority className="object-cover -z-20" />

      <Header />

      <section
        className="relative z-10 flex flex-col-reverse md:flex-row
                   items-start justify-between gap-12
                   px-6 sm:px-10 lg:px-20 xl:px-32
                   pt-14 sm:pt-20 lg:pt-28 pb-24"
      >
        {/* copy */}
        <div className="max-w-xl space-y-8">
          <h1 className="font-extrabold uppercase leading-tight text-gray-900
                         text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ textShadow: '0 4px 6px rgba(0,0,0,0.15)' }}>
            <span className="block">Predict&nbsp;Price.</span>
            <span className="block">Encrypt&nbsp;It.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-2xl text-gray-700">
            Encrypt your price prediction.&nbsp;No one can see it, not even us.
            We’ll decrypt it next week.&nbsp;The closer you are, the more stars
            you earn.
          </p>

          <Link
            href="/prediction"
            className="inline-block rounded-md bg-gray-900 px-6 py-3
                       text-white text-base sm:text-lg font-semibold shadow
                       hover:bg-gray-800 transition-colors">
            Predict it now
          </Link>
        </div>

        {/* capsule block */}
        <div
          className="relative
                     w-full md:w-auto
                     max-w-[90vw] sm:max-w-[70vw] md:max-w-[40vw] lg:max-w-[35vw] 2xl:max-w-[450px]
                     md:-translate-y-12 md:-translate-x-[6vw] lg:-translate-x-[8vw] xl:-translate-x-[10vw]">
          <Image src="/capsule.png" alt="Capsule" width={450} height={600} priority className="w-full h-auto" />

          {/* vertical token rail */}
                   <div
           className="absolute left-1/2 -translate-x-1/2
                      top-[48%] -translate-y-1/2
                      flex flex-col items-center gap-4">

            {TOKENS.map((t) => {
              const activeNow = t.id === active?.coingecko_id;
              return (
                <div
                  key={t.id}
                  className={`rounded-full p-0.5 bg-white shadow
                              transition-transform duration-200
                              ${activeNow
                                ? 'w-14 h-14 ring-2 ring-white/70 scale-110'
                                : 'w-10 h-10 filter grayscale opacity-40'}`}
                  title={t.symbol}>
                  <Image src={t.logo} alt={t.symbol} width={56} height={56} className="w-full h-full object-contain" />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
