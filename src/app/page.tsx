/* app/page.tsx */
"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/header/Header";
import { useActiveToken } from "@/hooks/useActiveToken";

const TOKENS = [
  { id: "solana", symbol: "SOL", logo: "/sol.png" },
  { id: "bitcoin", symbol: "BTC", logo: "/btc.png" },
  { id: "ethereum", symbol: "ETH", logo: "/eth.png" },
  { id: "chainlink", symbol: "LINK", logo: "/link.png" },
];

export default function Home() {
  const { data: active } = useActiveToken();

  return (
    /* ───── full‑height flex wrapper keeps hero in‑view ───── */
    <div className="relative flex flex-col min-h-screen font-sans overflow-hidden">
      {/* background */}
      <Image
        src="/bgHome.png"
        alt="Background"
        fill
        priority
        quality={100}
        sizes="100vw"
        className="object-cover -z-20"
      />

      <Header />

      {/* hero fills leftover space and centres itself vertically */}
      <section
        className="
          relative flex-1
          flex flex-col-reverse md:flex-row items-center md:items-start justify-between
          gap-12 lg:gap-20
          px-6 sm:px-10 lg:px-20 xl:px-28
          py-10 lg:py-16 xl:py-20
        "
      >
        {/* copy */}
        <div className="max-w-xl space-y-6">
          <h1 className="font-extrabold leading-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl uppercase">
            <span className="block bg-gradient-to-b from-black via-neutral-800 to-neutral-100 bg-clip-text text-transparent">
              Predict&nbsp;Price.
            </span>
            <span className="block bg-gradient-to-b from-black via-neutral-800 to-neutral-100 bg-clip-text text-transparent">
              Encrypt&nbsp;It.
            </span>
          </h1>

          <p className="font-medium text-sm sm:text-base md:text-lg lg:text-2xl text-gray-700">
            Encrypt your price prediction. No one can<br />
            see it, not even us. We’ll decrypt it next week.<br />
            The closer you are, the more points you earn.
          </p>

          <Link
            href="/prediction"
            className="
              bg-neutral-900 font-semibold inline-block px-5 py-[6px] rounded-xl
              text-white text-sm sm:text-base md:text-lg shadow
              hover:bg-neutral-800 transition-colors
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
            md:-translate-y-10                   /* gentler vertical lift */
            md:-translate-x-2 lg:-translate-x-6 xl:-translate-x-8 2xl:-translate-x-32
          "
        >
          <Image
            src="/capsule.png"
            alt="Capsule"
            width={450}
            height={600}
            priority
            className="w-full h-auto max-h-[65vh] md:max-h-[60vh] lg:max-h-[70vh]"
          />

          {/* token rail */}
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
                    "rounded-full bg-white shadow transition-transform duration-200",
                    activeNow
                      ? "ring-2 ring-white/70 scale-110 w-11 h-11 lg:w-14 lg:h-14"
                      : "filter grayscale opacity-40 w-8 h-8 lg:w-10 lg:h-10",
                  ].join(" ")}
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
