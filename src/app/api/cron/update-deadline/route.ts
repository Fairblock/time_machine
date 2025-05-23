// app/api/cron/update-deadline/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import {
  REVEAL_EVENT_TYPES,
  REVEAL_EVENT_ATTRS,
} from '@/constant/events'
import { getBlock } from '@/services/fairyring/block'
import { getLastFridayStart, fetchPriceAt } from '@/lib/utils'
import { FAIRYRING_ENV } from '@/constant/env'

/* ── Supabase ───────────────────────────────────────────────────────── */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
)

/* ── RPC ────────────────────────────────────────────────────────────── */
const RPC_URL = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network'
async function getCurrentBlockHeight() {
  const { data } = await axios.get(`${RPC_URL}/status`)
  return Number.parseInt(data.result.sync_info.latest_block_height, 10)
}

/* ── Token rotation list ────────────────────────────────────────────── */
const TOKENS = [
  { coingecko_id: 'solana',   symbol: 'SOL' },
  { coingecko_id: 'bitcoin',  symbol: 'BTC' },
  { coingecko_id: 'ethereum', symbol: 'ETH' },
  { coingecko_id: 'chainlink',symbol: 'LINK' },
]

async function pickNextToken() {
  const { data } = await supabase
    .from('deadlines')
    .select('coingecko_id')
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single()

  if (!data?.coingecko_id) return TOKENS[0]
  const lastIdx = TOKENS.findIndex(t => t.coingecko_id === data.coingecko_id)
  return TOKENS[(lastIdx + 1) % TOKENS.length]
}

/* ── Date helpers ───────────────────────────────────────────────────── */
function getNextFridayDeadline(now = new Date()) {
  const day          = now.getUTCDay()
  const daysUntilFri = ((5 + 7 - day) % 7) || 7
  const next         = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntilFri)
  next.setUTCHours(23, 59, 0, 0)   // 23:59 UTC
  return next
}

/* ── Scoring helpers ────────────────────────────────────────────────── */
const K = 10
function calcScore(predicted: number, actual: number) {
  if (!actual) return 0
  const pctDiff = Math.abs(predicted - actual) / actual          // ← normalized
  return Math.floor(1000 * Math.exp(-pctDiff * K))
}

/* Read reveal events for one block height */
async function fetchRevealedTxs(height: number) {
  const out: { creator: string; price: number }[] = []
  const block  = await getBlock(height + 1)
  const events = block?.result?.finalize_block_events ?? []

  events
    .filter((e: any) => e.type === REVEAL_EVENT_TYPES.revealed)
    .forEach((e: any) => {
      const attrs = e.attributes.reduce<Record<string,string>>(
        (acc,{key,value}) => ((acc[key] = value), acc), {})
      const memoStr = attrs[REVEAL_EVENT_ATTRS.memo]
      if (!memoStr) return

      let parsed: any
      try { parsed = JSON.parse(memoStr) } catch { return }
      if (parsed.tag !== 'price-predict') return

      out.push({
        creator: attrs[REVEAL_EVENT_ATTRS.creator],
        price  : Number(parsed.memo.prediction),
      })
    })

  return out
}

/* ── Score + leaderboard update for last finished deadline ─────────── */
async function updateScoresForLastDeadline() {
  const { data: last } = await supabase
    .from('deadlines')
    .select('deadline_date,target_block,coingecko_id')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single()

  if (!last) return                     // nothing to score yet

  const targetHeight = Number(last.target_block)
  if (!targetHeight) return

  const fridayStart = new Date(last.deadline_date)
  const actualPrice = await fetchPriceAt(fridayStart, last.coingecko_id)

  const revealed = await fetchRevealedTxs(targetHeight)

  /* 1️⃣  Blank out last‑week columns for everyone, always */
  await supabase.from('participants').update({
    last_week_guess : null,
    last_week_score : null,
    delta           : null,
  })

  /* If no reveals, nothing more to do this week */
  if (!revealed.length) return

  /* 2️⃣  Existing totals for addresses that did submit */
  const submitters  = [...new Set(revealed.map(r => r.creator))]
  const { data: existing } = await supabase
    .from('participants')
    .select('address,total_score')
    .in('address', submitters)

  const prevTotals = Object.fromEntries(
    (existing ?? []).map(r => [r.address, Number(r.total_score) || 0])
  )

  /* 3️⃣  Build rows for submitters */
  const rows = revealed.map(tx => {
    const weekScore = calcScore(tx.price, actualPrice)
    const newTotal  = (prevTotals[tx.creator] ?? 0) + weekScore
    return {
      address         : tx.creator,
      total_score     : newTotal,
      last_week_guess : tx.price,
      last_week_score : weekScore,
      delta           : Math.abs(tx.price - actualPrice),
    }
  })

  /* 4️⃣  Upsert just those rows */
  await supabase.from('participants').upsert(rows, { onConflict: 'address' })
}

/* ── Cron handler ───────────────────────────────────────────────────── */
export async function GET() {
  try {
    console.log('▶ cron/update‑deadline start')

    /* a.  Score the week that just ended */
    await updateScoresForLastDeadline()

    /* b.  Schedule the next deadline */
    const token        = await pickNextToken()
    const now          = new Date()
    const deadlineTime = getNextFridayDeadline(now)

    const currentHt    = await getCurrentBlockHeight()
    const secondsUntil = Math.ceil((deadlineTime.getTime() - now.getTime()) / 1000)
    const targetBlock  = currentHt + Math.ceil(secondsUntil / 1.6) // ≈1.6 s/block

    await supabase.from('deadlines').upsert(
      {
        deadline_date: deadlineTime.toISOString(),
        target_block : targetBlock,
        coingecko_id : token.coingecko_id,
        symbol       : token.symbol,
      },
      { onConflict: 'deadline_date' }
    )

    console.log(`✅ ${deadlineTime.toISOString()} → ${token.symbol} → block ${targetBlock}`)
    return NextResponse.json({
      success  : true,
      deadline : deadlineTime.toISOString(),
      targetBlock,
      token: token.coingecko_id,
      symbol: token.symbol,
    })
  } catch (err: any) {
    console.error('❌ cron/update‑deadline failed', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
