/* app/page.tsx */
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Header from "@/components/header/Header";
import { useActiveToken } from "@/hooks/useActiveToken";
import capsuleBg from "../../public/capsuleBg.png";
import { useHowItWorksContext } from "@/contexts/HowItWorksContext";

const TOKENS = [
  { id: "solana", symbol: "SOL", logo: "/sol.png" },
  { id: "bitcoin", symbol: "BTC", logo: "/btc.png" },
  { id: "arbitrum", symbol: "ARB", logo: "/arb.png" },
  { id: "ethereum", symbol: "ETH", logo: "/eth.png" },
];

export default function Home() {
  const [bgSize, setBgSize] = useState("100%");
  const { data: active } = useActiveToken();
  const [] = useState<boolean>(false);
  const { showModal, setShowModal } = useHowItWorksContext();

  useEffect(() => {
    const handleResize = () => {
      setBgSize(window.innerWidth > 1024 ? "80%" : "100%");
    };

    handleResize(); // Set initially
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <Header/>
      <div className="flex flex-col h-screen font-sans relative p-4 bg-gradient-to-r from-[#EBEFF7] via-white to-[#EBEFF7] pt-[80px] md:pt-[95px] overflow-hidden">
        <section className="flex flex-col justify-evenly sm:items-center md:flex-row gap-4 md:gap-4">
          {/* HERO TEXT & ACTION BUTTON */}
          <div className="flex flex-col gap-4 md:gap-6 lg:gap-8 pl-6 pt-6 sm:pl-0 sm:pt-0 justify-around items-start">
            <h1 className="font-extrabold leading-tight uppercase">
              <span className="block bg-gradient-to-b from-black via-neutral-800 to-neutral-100 bg-clip-text text-transparent text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                Predict Price.
              </span>
              <span className="block bg-gradient-to-b from-black via-neutral-800 to-neutral-100 bg-clip-text text-transparent text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                Encrypt It.
              </span>
            </h1>

            <p className="font-normal text-sm md:text-base lg:text-xl text-gray-700">
            Step into the time machine.
              <br />
              Your prediction is encrypted and lost to time.
              <br />
              When the capsule reopens, truth comes to light.
              <br />
              And rewards those who saw it coming.
            </p>

            <button
              // href="/prediction"
              onClick={() => setShowModal(true)}
              className="bg-neutral-900 hover:bg-neutral-800 font-medium inline-block px-5 py-[6px] rounded-xl shadow text-white text-sm sm:text-base md:text-lg transition-colors"
            >
              Predict now
            </button>
          </div>

          {/* HERO IMAGE (CAPSULE) & ACTIVE TOKENS */}
          <div className="flex md:w-2/5">
            <div
              className="relative bg-cover bg-center bg-no-repeat mx-auto w-full"
              style={{
                backgroundImage: `url(${capsuleBg.src})`,
                backgroundSize: bgSize,
              }}
            >
              {/* Capsule & tokens container */}
              <div className="relative left-0 w-full">
                <img
                  src="/capsule.png"
                  alt=""
                  className="relative top-0 left-1/2 -translate-x-1/2 w-[22rem] 2xl:w-[24rem]"
                />

                {/* Tokens container */}
                <div className="absolute top-[20%] lg:top-[17%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                  {TOKENS.map((t) => {
                    const activeNow = t.id === active?.coingecko_id;
                    return (
                      <div
                        key={t.id}
                        title={t.symbol}
                        className={[
                          "rounded-full transition-transform duration-200",
                          activeNow
                            ? "scale-110 w-16 h-16 xl:w-20 xl:h-20"
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
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
