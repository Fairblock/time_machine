// src/app/api/winner/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLastFridayStart, fetchPriceAt } from '@/lib/utils'
import { FAIRYRING_ENV } from '@/constant/env'

/* ── Supabase ───────────────────────────────────────────────────────── */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
)

/* ── Helper: return the most recent finished deadline row ───────────── */
async function fetchLastDeadline() {
  const { data, error } = await supabase
    .from('deadlines')
    .select('deadline_date, coingecko_id, symbol')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data                                // can be null on first week
}

/* ── API handler (read‑only) ─────────────────────────────────────────── */
export async function GET() {
  try {
    /* 1️⃣  price for display (optional UI information) */
    const last      = await fetchLastDeadline()
    let lastPrice   = null
   
    if (last) {
      const friday  = new Date(last.deadline_date+"Z")
      lastPrice     = await fetchPriceAt(friday, last.coingecko_id)
    }

    /* 2️⃣  ordered leaderboard straight from DB */
    const { data, error } = await supabase
      .from('participants')
      .select(
        'address,total_score,last_week_guess,last_week_score,delta'
      )
      .order('total_score', { ascending: false })

    if (error) throw error

    const leaderboard = data.map(d => ({
      address        : d.address,
      totalPoints    : Number(d.total_score),
      lastPrediction : d.last_week_guess ? Number(d.last_week_guess) : undefined,
      lastPoints     : d.last_week_score ? Number(d.last_week_score) : undefined,
      delta          : d.delta ? Number(d.delta) : undefined,
    }))

    return NextResponse.json({
      leaderboard,
      lastFridayPrice: lastPrice,
      token          : last?.coingecko_id ?? null,
      symbol         : last?.symbol ?? null,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
