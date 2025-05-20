// src/app/api/winner/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  REVEAL_EVENT_TYPES,
  REVEAL_EVENT_ATTRS,
} from '@/constant/events'
import { getBlock } from '@/services/fairyring/block'

import { getLastFridayStart, fetchSolanaPriceAt } from '@/lib/utils'

/* ── Supabase (service‑role key required) ─────────────────────────────── */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RevealedTx = {
  creator: string
  price: number
}

type LeaderboardRow = {
  address: string
  totalPoints: number
  lastPrediction?: number
  lastPoints?: number
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
async function fetchRevealedTxs(heights: number[]): Promise<RevealedTx[]> {
  const out: RevealedTx[] = []

  for (const h of heights) {
    const block = await getBlock(h+1)
    //console.log('block', h, block)
    const events = block?.result?.finalize_block_events
    if (!events) continue
 
    events
      .filter((e: any) => e.type === REVEAL_EVENT_TYPES.revealed)
      .forEach((e: any) => {
        const attrs = e.attributes.reduce<Record<string, string>>(
          (acc, { key, value }) => {
            acc[key] = value
            return acc
          },
          {}
        )

        const memoStr = attrs[REVEAL_EVENT_ATTRS.memo]
        if (!memoStr) return

        let parsed: any
        try {
          parsed = JSON.parse(memoStr)
        } catch {
          return
        }

        if (parsed.tag !== 'price-predict') return

        out.push({
          creator: attrs[REVEAL_EVENT_ATTRS.creator],
          price: Number(parsed.memo.prediction),
        })
      })
  }

  return out
}

function calcScore(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual)
  return Math.floor(1000 * Math.exp(-diff / 5))
}
async function fetchCurrentTargetHeight(): Promise<number> {
  // table: target_heights (id serial, height int, created_at timestamptz default now())
  const { data, error } = await supabase
  .from('deadlines')
  .select('deadline_date, target_block')
  .lt('deadline_date', new Date().toISOString())
  .order('deadline_date', { ascending: false })
  .limit(1)

if (error) {
  return -1
}

// 2️⃣ If there’s no past deadline yet, return null
const last = data?.[0] || null
console.log('last', last)
return last.target_block
}
/* ── API handler ─────────────────────────────────────────────────────── */
export async function GET() {
  try {
        const res = await fetchCurrentTargetHeight()
        const targetHeight = Number(res)
        console.log('targetHeight', targetHeight)
    if (!targetHeight) {
      return NextResponse.json(
        { error: 'target height not set' },
        { status: 400 }
      )
    }

    const lastFriday = getLastFridayStart()
    const actualPrice = await fetchSolanaPriceAt(lastFriday)

    // 1️⃣ Gather reveal events for this height
    const revealed = await fetchRevealedTxs([targetHeight])

    // 2️⃣ Build leaderboard map in‑memory
    const map: Record<string, LeaderboardRow> = {}
    for (const tx of revealed) {
      const points = calcScore(tx.price, actualPrice)

      const row = map[tx.creator] || { address: tx.creator, totalPoints: 0 }
      row.totalPoints += points
      row.lastPrediction = tx.price
      row.lastPoints = points
      map[tx.creator] = row
    }

    const rows = Object.values(map)

    // 3️⃣ Upsert into Supabase
    if (rows.length) {
      await supabase
        .from('participants')
        .upsert(
          rows.map((r) => ({
            address: r.address,
            total_score: r.totalPoints,
            last_week_guess: r.lastPrediction,
            last_week_score: r.lastPoints,
          })),
          { onConflict: 'address' }
        )
    }

    // 4️⃣ Read full, ordered leaderboard
    const { data, error } = await supabase
      .from('participants')
      .select(
        'address,total_score,last_week_guess,last_week_score'
      )
      .order('total_score', { ascending: false })

    if (error) throw error

    const leaderboard = data.map((d) => ({
      address: d.address,
      totalPoints: Number(d.total_score),
      lastPrediction: d.last_week_guess
        ? Number(d.last_week_guess)
        : undefined,
      lastPoints: d.last_week_score
        ? Number(d.last_week_score)
        : undefined,
    }))

    return NextResponse.json({
      leaderboard,
      lastFridayPrice: actualPrice,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'failed to compute leaderboard' },
      { status: 500 }
    )
  }
}
