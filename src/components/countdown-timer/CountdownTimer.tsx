/* components/countdown-timer/CountdownTimer.tsx */
"use client";

import { useEffect, useState } from "react";
import { HourglassIcon } from "lucide-react";
import { useActiveToken } from "@/hooks/useActiveToken";

/* ─────────────────────────────────────────────────────────────
 *  Decrypt cut‑off weekday map  (UTC, 0 = Sun … 6 = Sat)
 *  SOL / ARB close on Thursday 10 : 59 UTC
 *  BTC / ETH close on Sunday   10 : 59 UTC
 * ──────────────────────────────────────────────────────────── */
const DECRYPT_DOW: Record<string, number> = {
  SOL: 4,  // Thursday
  ARB: 4,
  BTC: 0,  // Sunday
  ETH: 0,
};

export default function CountdownTimer() {
  const { data: token } = useActiveToken();
  const [deadlineText, setDeadlineText] = useState("");

  useEffect(() => {
    if (!token) return;

    const now       = new Date();
    const targetDow = DECRYPT_DOW[token.symbol] ?? 4;     // default Thu

    /* candidate = today at 10:59 UTC */
    const deadline = new Date(now);
    deadline.setUTCHours(10, 59, 0, 0);                  // ← hour changed

    /* days until the target weekday (0–6) */
    const deltaDays = (targetDow + 7 - now.getUTCDay()) % 7;

    if (deltaDays === 0 && now < deadline) {
      /* correct weekday and we’re *before* 10:59 → keep today */
    } else {
      /* otherwise jump to the next occurrence of that weekday */
      deadline.setUTCDate(deadline.getUTCDate() + (deltaDays || 7));
    }

    /* beautify: “Thursday at 10 : 59 AM UTC” */
    const weekday = deadline.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
    const h  = deadline.getUTCHours();
    const m  = deadline.getUTCMinutes();
    const ap = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    const mm  = m.toString().padStart(2, "0");
    const time = m === 0 ? `${h12} ${ap}` : `${h12}:${mm} ${ap}`;

    setDeadlineText(`${weekday} at ${time} UTC`);
  }, [token]);

  if (!deadlineText) return null;

  return (
    <div className="text-center text-lg">
      Predict <span className="font-medium">{token.symbol}</span> price for{" "}
      <span className="font-medium">{deadlineText}</span>
    </div>
  );
}
