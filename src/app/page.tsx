'use client';

import Image from 'next/image';
import Link  from 'next/link';
import Header from '@/components/header/Header';

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans">

      {/* background pattern — full‑bleed */}
      <Image
        src="/bgHome.png"
        alt=""
        fill
        priority
        className="object-cover -z-20"
      />

      {/* header — left gutter grows with breakpoints */}
     
        <Header />
    

      {/* hero */}
      <section
        className="relative z-10 flex flex-col-reverse md:flex-row
                   items-start justify-between gap-12
                   px-6 sm:px-10 lg:px-20 xl:px-32
                   pt-14 sm:pt-20 lg:pt-28 pb-24"
      >
        {/* copy block */}
        <div className="max-w-xl space-y-8">
          <h1
            className="font-extrabold uppercase leading-tight text-gray-900
                       text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ textShadow: '0 4px 6px rgba(0,0,0,0.15)' }}
          >
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
                       hover:bg-gray-800 transition-colors"
          >
            Predict it now
          </Link>
        </div>

        {/* capsule — scales with viewport, nudged left/up on desktop */}
        <div
          className="
            w-full md:w-auto          /* stack on mobile; auto on desktop    */
            max-w-[90vw]              /* prevent overflow on very small cpus */
            sm:max-w-[70vw]
            md:max-w-[40vw]
            lg:max-w-[35vw]
            2xl:max-w-[450px]
            md:-translate-y-12
            md:-translate-x-[6vw]
            lg:-translate-x-[8vw]
            xl:-translate-x-[10vw]"
        >
          <Image
            src="/capsule.png"
            alt="Futuristic capsule with token logo"
            width={450}               /* fallback for browsers w/out w/h JS */
            height={600}
            priority
            className="w-full h-auto"
          />
        </div>
      </section>
    </div>
  );
}
