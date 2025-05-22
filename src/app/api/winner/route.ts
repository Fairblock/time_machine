// src/app/api/winner/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  REVEAL_EVENT_TYPES,
  REVEAL_EVENT_ATTRS,
} from '@/constant/events'
import { getBlock } from '@/services/fairyring/block'

import { getLastFridayStart, fetchPriceAt } from '@/lib/utils'
import { useLastToken } from '@/hooks/useActiveToken'
import { FAIRYRING_ENV } from '@/constant/env'
const SUPABASE_URL  = FAIRYRING_ENV.supabase
const SERVICE_KEY   = FAIRYRING_ENV.supabaseKey
/* ── Supabase (service‑role key required) ─────────────────────────────── */
const supabase = createClient(
  SUPABASE_URL!,
  SERVICE_KEY!
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
export async function fetchRevealedTxs(heights: number[]): Promise<RevealedTx[]> {
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



/** What the caller will receive */
export interface LastTarget {
  targetBlock : number
  coingeckoId : string
  symbol      : string
}

function calcScore(predicted: number, actual: number): number {
  const diff = Math.abs(predicted - actual)
  return Math.floor(1000 * Math.exp(-diff / 5))
}
export async function fetchLastTarget(): Promise<LastTarget | null> {
  const { data, error } = await supabase
    .from('deadlines')
    .select('deadline_date, target_block, coingecko_id, symbol')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)
    .maybeSingle()        // automatically unwrap the first (or null)

  if (error) {
    console.error('Supabase error fetching current target:', error)
    return null
  }

  if (!data) return null     // no past deadlines yet

  return {
    targetBlock : data.target_block,
    coingeckoId : data.coingecko_id,
    symbol      : data.symbol,
  }
}
/* ── API handler ─────────────────────────────────────────────────────── */
export async function GET() {
  try {
        const res = await fetchLastTarget()
        const targetHeight = Number(res?.targetBlock)
        console.log('targetHeight', targetHeight)
    if (!targetHeight) {
      return NextResponse.json(
        { error: 'target height not set' },
        { status: 400 }
      )
    }

    const lastFriday = getLastFridayStart()
    
    const actualPrice = await fetchPriceAt(lastFriday, res?.coingeckoId || '')

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
            delta: Math.abs(r.lastPrediction - actualPrice)
          })),
          { onConflict: 'address' }
        )
    }

    // 4️⃣ Read full, ordered leaderboard
    const { data, error } = await supabase
      .from('participants')
      .select(
        'address,total_score,last_week_guess,last_week_score,delta'
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
      delta: d.delta ? Number(d.delta) : undefined,
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
