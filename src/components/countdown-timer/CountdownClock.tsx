/* components/countdown-timer/CountdownCard.tsx */
"use client";

import { useEffect, useState } from "react";
import { differenceInDays } from "date-fns";
import { getNextFridayDeadline } from "@/lib/utils";
import Image from "next/image";
import rightTextBg from "../../../public/Right.png";

export default function CountdownCard() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  /* update once a minute */
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const deadline = getNextFridayDeadline();
      setDaysRemaining(Math.max(0, differenceInDays(deadline, now)));
    };
    update();
    const id = setInterval(update, 60_000); // 1 min
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="
        w-full bg-white border-2 xl:border-3 border-[#A9BDC3] rounded-2xl shadow
        flex flex-col md:flex-row items-center justify-evenly
        pt-4 lg:pl-4 lg:pt-0 gap-4 overflow-clip
      "
    >
      {/* ─ left text block ─ */}
      <div className="flex flex-col items-center lg:items-start text-center md:text-left w-full md:w-3/5 lg:py-24">
        <p className="text-lg md:text-xl lg:text-3xl xl:text-4xl font-semibold text-gray-900">
          Remaining time for Prediction
        </p>
        <p className="text-xs md:text-sm text-gray-500 mt-2">
          Unlocks weekly on Fridays around 23:59 UTC.
        </p>
      </div>

      {/* ─ clock + overlay ─ */}
      <div
        className={`flex items-end relative min-h-44 h-full w-full md:w-1/2 bg-top-right`}
        style={{
          backgroundImage: `url(${rightTextBg.src})`,
          backgroundSize: "100%",
        }}
      >
        <Image
          src="/Timer.png"
          alt="Clock"
          fill
          priority
          className="object-contain mt-6 xl:min-w-64 xl:min-h-64"
        />

        <div className="absolute top-16 inset-0 flex flex-col items-center justify-center text-white">
          {/* fluid font‑size: 28 px → 48 px */}
          <span className="font-bold leading-none text-6xl xl:text-8xl">
            {daysRemaining ?? "--"}
          </span>
          <span className="uppercase tracking-widest text-lg text-gray-300">
            Days
          </span>
        </div>
      </div>
    </div>
  );
}
