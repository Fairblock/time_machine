/* app/page.tsx */
'use client';

import Image from 'next/image';
import Link   from 'next/link';
import Header from '@/components/header/Header';
import { useActiveToken } from '@/hooks/useActiveToken';

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
    <Image
  src="/bgHome.png"
  alt="Background"
  fill                      /* keeps it responsive */
  priority
  quality={100}             /* <— no extra compression */
  sizes="100vw"             /* always send full‑width */
  className="object-cover -z-20"
/>
      <Header />

      <section
        className="
          relative z-10
          flex flex-col-reverse md:flex-row items-start justify-between
          gap-12 lg:gap-20
          px-6 sm:px-10 lg:px-20 xl:px-28
          pt-12 sm:pt-18 lg:pt-24 xl:pt-28
          pb-16 sm:pb-20 lg:pb-24
          overflow-hidden
        "
      >
        {/* copy */}
        <div className="max-w-xl space-y-6">
          <h1
            className="
              font-extrabold uppercase leading-tight text-gray-900
              text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl
            "
            style={{ textShadow: '0 4px 6px rgba(0,0,0,0.15)' }}
          >
            <span className="block">Predict&nbsp;Price</span>
            <span className="block">Encrypt&nbsp;It</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700">
          Encrypt your price prediction. 
          <br></br>
No one can see it, not even us. 
<br></br>
We’ll decrypt it next week. 
<br></br>
The closer you are, the more points you earn.
          </p>

          <Link
            href="/prediction"
            className="
              inline-block rounded-md bg-gray-900 px-6 py-3
              text-white text-sm sm:text-base md:text-lg font-semibold shadow
              hover:bg-gray-800 transition-colors
            "
          >
            Predict now
          </Link>
        </div>

        {/* capsule + token rail */}
        <div
          className="
            relative
            w-full md:w-auto
            max-w-[90vw] sm:max-w-[70vw]
            md:max-w-[50vw] lg:max-w-[44vw] xl:max-w-[38vw] 2xl:max-w-[450px]

            /* vertical lift keeps capsule above the fold on 13″ */
            md:-translate-y-16 lg:-translate-y-12 xl:-translate-y-10 2xl:-translate-y-10

            /* NEW: stronger *left* shift on ≥lg, ≥xl, ≥2xl */
            md:-translate-x-2      /* 13″ (≤1023 px) – unchanged    */
            lg:-translate-x-6      /* 1024‑1279 px                 */
            xl:-translate-x-8      /* 1280‑1535 px  ← 14″ MBP      */
            2xl:-translate-x-32    /* 1536‑1919 px  ← 14″ FHD      */
            [2000px]:-translate-x-12 /* ultra‑wide                  */
          "
        >
          <Image
            src="/capsule.png"
            alt="Capsule"
            width={450}
            height={600}
            priority
            className="
              w-full h-auto
              max-h-[70vh] md:max-h-[70vh] lg:max-h-[80vh]
            "
          />

          {/* vertical token rail */}
          <div
            className="
              absolute left-1/2 -translate-x-1/2
              top-1/3 -translate-y-1/3
              flex flex-col items-center
              gap-3 lg:gap-4
            "
          >
            {TOKENS.map((t) => {
              const activeNow = t.id === active?.coingecko_id;
              return (
                <div
                  key={t.id}
                  title={t.symbol}
                  className={[
                    'rounded-full bg-white shadow transition-transform duration-200',
                    activeNow
                      ? 'ring-2 ring-white/70 scale-110 w-11 h-11 lg:w-14 lg:h-14'
                      : 'filter grayscale opacity-40 w-8 h-8 lg:w-10 lg:h-10',
                  ].join(' ')}
                >
                  <Image
                    src={t.logo}
                    alt={t.symbol}
                    width={56}
                    height={56}
                    className="w-full h-full object-contain"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
