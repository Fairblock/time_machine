/* components/countdown-timer/CountdownTimer.tsx */
"use client";

import { useEffect, useState } from "react";
import { HourglassIcon } from "lucide-react";
import { useActiveToken } from "@/hooks/useActiveToken";

/* which weekday each token decrypts, UTC (Sun = 0) */
const DECRYPT_DOW: Record<string, number> = {
  SOL: 3, // Wednesday
  ARB: 3,
  BTC: 6, // Saturday
  ETH: 6,
};

export default function CountdownTimer() {
  const { data: token } = useActiveToken();
  const [deadlineText, setDeadlineText] = useState("");

  useEffect(() => {
    if (!token) return;

    const now       = new Date();
    const targetDow = DECRYPT_DOW[token.symbol] ?? 3;      // default Wed

    /* candidate = today at 23:59 UTC */
    const deadline  = new Date(now);
    deadline.setUTCHours(23, 59, 0, 0);

    /* days until the target weekday (0-6) */
    const deltaDays = (targetDow + 7 - now.getUTCDay()) % 7;

    if (deltaDays === 0 && now < deadline) {
      /* it’s the right weekday and we’re *before* 23:59 → keep today */
    } else {
      /* otherwise jump to the next occurrence of that weekday */
      deadline.setUTCDate(deadline.getUTCDate() + (deltaDays || 7));
    }

    /* beautify: “Wednesday at 11 : 59 PM UTC” */
    const weekday   = deadline.toLocaleDateString("en-US", {
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
    <div className="flex flex-col sm:flex-row items-center sm:gap-2 text-center text-muted-foreground mb-8">
      <HourglassIcon className="hidden sm:block" width={18} />
      Your prediction decrypts around&nbsp;
      <span className="font-medium">{deadlineText}</span>
      <HourglassIcon className="hidden sm:block" width={18} />
    </div>
  );
}
