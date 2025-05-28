/* components/countdown-timer/CountdownCard.tsx */
'use client'

import { useEffect, useState } from 'react'
import { differenceInDays } from 'date-fns'
import { getNextFridayDeadline } from '@/lib/utils'
import Image from 'next/image'

export default function CountdownCard() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

  /* update once a minute */
  useEffect(() => {
    const update = () => {
      const now      = new Date()
      const deadline = getNextFridayDeadline()
      setDaysRemaining(Math.max(0, differenceInDays(deadline, now)))
    }
    update()
    const id = setInterval(update, 60_000)       // 1 min
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="
        w-full bg-white border border-gray-200 rounded-2xl shadow
        flex flex-col md:flex-row items-center justify-between
        p-6 md:p-8 gap-6
      "
    >
      {/* ─ left text block ─ */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <p className="text-lg md:text-xl font-semibold text-gray-900">
          Remaining time for Prediction
        </p>
        <p className="text-xs md:text-sm text-gray-500 mt-2">
          Unlocks weekly on Fridays around 23:59 UTC.
        </p>
      </div>

      {/* ─ clock + overlay ─ */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36">
        <Image
          src="/Timer.png"
          alt="Clock"
          fill
          priority
          className="object-contain"
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          {/* fluid font‑size: 28 px → 48 px */}
          <span className="font-bold leading-none text-[clamp(1.75rem,2vw,3rem)]">
            {daysRemaining ?? '--'}
          </span>

          <span className="uppercase tracking-widest mt-1 text-[clamp(0.55rem,1.3vw,0.8rem)] text-gray-300">
            Days
          </span>
        </div>
      </div>
    </div>
  )
}
