/* components/countdown-timer/CountdownCard.tsx */
"use client";

import { useEffect, useState } from "react";
import { differenceInDays } from "date-fns";
import Image from "next/image";
import rightTextBg from "../../../public/Right.png";
import { useActiveToken } from "@/hooks/useActiveToken";

/* ──────────────────────────────────────────────────────────────
 *  Decrypt cut‑off weekday map  (UTC, 0 = Sun … 6 = Sat)
 *  SOL/ARB close Thu 10 : 59; BTC/ETH close Sun 10 : 59
 * ───────────────────────────────────────────────────────────── */
const DECRYPT_DOW: Record<string, number> = {
  SOL: 4,  // Thursday
  ARB: 4,
  BTC: 0,  // Sunday
  ETH: 0,
};

/* ──────────────────────────────────────────────────────────────
 *  Next decrypt deadline  — 10 : 59 UTC on the target weekday
 * ───────────────────────────────────────────────────────────── */
function nextDecryptDeadline(symbol: string, now = new Date()) {
  const targetDow = DECRYPT_DOW[symbol] ?? 4;        // default Thu
  const deadline  = new Date(now);
  deadline.setUTCHours(10, 59, 0, 0);               // 10:59 UTC

  const delta = (targetDow + 7 - now.getUTCDay()) % 7;
  if (delta === 0 && now < deadline) {
    /* later today ‑ keep same date */
  } else {
    deadline.setUTCDate(deadline.getUTCDate() + (delta || 7));
  }
  return deadline;
}

export default function CountdownCard() {
  const { data: token } = useActiveToken();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);
  const [showHours, setShowHours]         = useState<boolean>(false);
  const [weekdayText, setWeekdayText]     = useState<string>("");

  /* update every minute */
  useEffect(() => {
    if (!token) return;

    const update = () => {
      const now      = new Date();
      const deadline = nextDecryptDeadline(token.symbol, now);
      const msDiff   = deadline.getTime() - now.getTime();

      const fullDays  = msDiff > 0 ? Math.floor(msDiff / 86_400_000) : 0;
      const remHours  = msDiff > 0 ? Math.floor(msDiff / 3_600_000) : 0;

      if (fullDays < 1) {
        setShowHours(true);
        setHoursRemaining(remHours);
        setDaysRemaining(0);
      } else {
        setShowHours(false);
        setDaysRemaining(fullDays);
        setHoursRemaining(null);
      }

      const wd = deadline.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: "UTC",
      });
      setWeekdayText(wd);
    };

    update();
    const id = setInterval(update, 60_000);   // 1 min
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
          Unlocks on {weekdayText} at 10:59&nbsp;UTC.
        </p>
      </div>

      {/* ─ clock + overlay ─ */}
      <div className="flex items-end relative min-h-44 h-full w-full md:w-[55%] lg:w-1/2 xl:w-[55%]">
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
              {showHours
                ? (hoursRemaining ?? "--")
                : (daysRemaining ?? "--")}
            </span>
            <span className="uppercase tracking-widest text-lg text-gray-300">
              {showHours ? "Hours" : "Days"}
            </span>
        </div>
      </div>
    </div>
  );
}
