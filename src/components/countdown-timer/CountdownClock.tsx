'use client'

import { useEffect, useState } from 'react'
import { differenceInDays } from 'date-fns'
import { getNextFridayDeadline } from '@/lib/utils'
import Image from 'next/image'

export default function CountdownCard() {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null)

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const deadline = getNextFridayDeadline()
      const diff = differenceInDays(deadline, now)
      setDaysRemaining(diff)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000 * 60 * 60)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full bg-white border border-gray-300 rounded-xl shadow flex flex-col md:flex-row items-center justify-between p-6 md:p-8 gap-6">
      {/* Left text block */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left">
        <p className="text-xl md:text-2xl font-semibold text-gray-900">
          Remaining time for Prediction
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Unlocks weekly on Fridays at 23:59 UTC.
        </p>
      </div>

      {/* Clock image with number overlay */}
      <div className="relative w-32 h-32 md:w-54 md:h-54">
        <Image
          src="/clock.png"
          alt="Clock"
          fill
          className="object-contain"
          priority
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <span className="text-3xl md:text-5xl font-bold">
            {daysRemaining ?? '--'}
          </span>
          <span className="text-xs md:text-sm uppercase text-gray-300 tracking-widest mt-1">
            Days
          </span>
        </div>
      </div>
    </div>
  )
}
