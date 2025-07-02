/* components/countdown-timer/CountdownCard.tsx */
"use client";

import { useEffect, useState } from "react";
import { differenceInDays } from "date-fns";
import Image from "next/image";
import rightTextBg from "../../../public/Right.png";
import { useActiveToken } from "@/hooks/useActiveToken";

/* decrypt weekday (UTC, Sun = 0) */
const DECRYPT_DOW: Record<string, number> = {
  SOL: 3, // Wednesday
  ARB: 3,
  BTC: 6, // Saturday
  ETH: 6,
};

/* build next cut-off - 23:59 UTC on that weekday */
function nextDecryptDeadline(symbol: string, now = new Date()) {
  const targetDow = DECRYPT_DOW[symbol] ?? 3;
  const deadline  = new Date(now);
  deadline.setUTCHours(23, 59, 0, 0);

  const delta = (targetDow + 7 - now.getUTCDay()) % 7;
  if (delta === 0 && now < deadline) {
    /* tonight */
  } else {
    deadline.setUTCDate(deadline.getUTCDate() + (delta || 7));
  }
  return deadline;
}

export default function CountdownCard() {
  const { data: token } = useActiveToken();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [weekdayText, setWeekdayText] = useState<string>("");

  /* update once a minute */
  useEffect(() => {
    if (!token) return;

    const update = () => {
      const now      = new Date();
      const deadline = nextDecryptDeadline(token.symbol, now);
      setDaysRemaining(Math.max(0, differenceInDays(deadline, now)));

      const wd = deadline.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
      });
      setWeekdayText(wd);
    };

    update();
    const id = setInterval(update, 60_000); // 1 min
    return () => clearInterval(id);
  }, [token]);

  return (
    <div
      className="
        w-full bg-white border-2 xl:border-3 border-[#A9BDC3] rounded-2xl shadow
        flex flex-col md:flex-row items-center justify-evenly
        pt-4 lg:pl-4 gap-4 sm:gap-0 lg:pt-0 overflow-clip
      "
    >
      {/* ─ left text block ─ */}
      <div className="flex flex-col items-center lg:items-start text-center md:text-left w-full md:w-1/2 lg:py-12">
        <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-medium text-gray-900">
          Remaining time for Prediction
        </p>
        <p className="text-xs md:text-sm text-gray-500 mt-2">
          Unlocks on {weekdayText} around 23:59 UTC.
        </p>
      </div>

      {/* ─ clock + overlay ─ */}
      <div
        className="flex items-end relative min-h-44 h-full w-full md:w-[55%] lg:w-1/2 xl:w-[55%]"
      >
        <div
          className="flex items-end relative min-h-44 h-full w-full opacity-40"
          style={{
            backgroundImage: `url(${rightTextBg.src})`,
            backgroundSize: "50%",
            backgroundPosition: "top right",
          }}
        />
        <Image
          src="/Timer.png"
          alt="Clock"
          fill
          priority
          className="object-contain xl:min-w-48 xl:min-h-48 py-2"
        />

        <div className="absolute top-5 inset-0 flex flex-col items-center justify-center text-white">
          <span className="font-bold leading-none text-6xl lg:text-5xl xl:text-8xl">
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
