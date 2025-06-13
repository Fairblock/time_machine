import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import axios             from 'axios'

import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from '@/constant/events'
import { getBlock }      from '@/services/fairyring/block'
import { fetchPriceAt }  from '@/lib/utils'
import { FAIRYRING_ENV } from '@/constant/env'
import { rawScore as calcRaw, weekScore } from '@/lib/score'

/* ────────────────────────────────────────────  Supabase  */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
)

/* ────────────────────────────────────────────  RPC helper */
const RPC_URL = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network'
async function getCurrentBlockHeight() {
  const { data } = await axios.get(`${RPC_URL}/status`)
  return Number.parseInt(data.result.sync_info.latest_block_height, 10)
}

/* ────────────────────────────────────────────  Tokens     */
const TOKENS = [
  { coingecko_id: 'solana',    symbol: 'SOL'  },
  { coingecko_id: 'bitcoin',   symbol: 'BTC'  },
  { coingecko_id: 'ethereum',  symbol: 'ETH'  },
  { coingecko_id: 'chainlink', symbol: 'LINK' }
] as const

type Token = (typeof TOKENS)[number]
const COL_PREFIX: Record<Token['symbol'], string> = {
  SOL : 'sol',
  BTC : 'btc',
  ETH : 'eth',
  LINK: 'link'
}

/* ────────────────────────────────────────────  Utility: pick next token */
async function pickNextToken(): Promise<Token> {
  const { data } = await supabase
    .from('deadlines')
    .select('symbol')
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single()

  if (!data?.symbol) return TOKENS[0]
  const lastIdx = TOKENS.findIndex(t => t.symbol === data.symbol)
  return TOKENS[(lastIdx + 1) % TOKENS.length]
}

/* ────────────────────────────────────────────  Dates      */
function getNextFridayDeadline(now = new Date()) {
  const day          = now.getUTCDay()           // 0‑Sun … 6‑Sat
  const daysUntilFri = ((5 + 7 - day) % 7) || 7
  const next         = new Date(now)
  next.setUTCDate(now.getUTCDate() + daysUntilFri)
  next.setUTCHours(23, 59, 0, 0)                 // 23:59 UTC
  return next
}


/* ────────────────────────────────────────────  Maintenance helpers */
async function purgeParticipantsIfEpochStart(symbolJustFinished: string) {
  if (symbolJustFinished === TOKENS[0].symbol) {          // SOL
    console.log('🧹  purging participants for new epoch')
    await supabase.from('participants').delete().neq('address', '')
  }
}
async function wipeProofsTable() {
  console.log('🧹  wiping proofs table')
  const { error } = await supabase
    .from('proofs')
    .delete()
    .not('id', 'is', null)     // matches every UUID row
  error
    ? console.error('❌  proofs wipe failed:', error.message)
    : console.log('✅  proofs wiped')
}

/* ────────────────────────────────────────────  Reveal read */
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
        price  : Number(parsed.memo.prediction)
      })
    })

  return out
}

/* ────────────────────────────────────────────  Scoring pass */
async function updateScoresForLastDeadline() {
  /* — get the last finished deadline — */
  const { data: last } = await supabase
    .from('deadlines')
    .select('deadline_date,target_block,coingecko_id,symbol')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single()
  if (!last) return

  /* — if this was the first week (SOL) of a fresh epoch, wipe old data — */
  await purgeParticipantsIfEpochStart(last.symbol)

  const targetHeight = Number(last.target_block)
  if (!targetHeight) return

  /* — actual price at Friday 00:00 UTC — */
  const fridayStart = new Date(last.deadline_date + 'Z')
  let actualPrice   = await fetchPriceAt(fridayStart, last.coingecko_id)
  while (actualPrice === 0) {
    await new Promise(r => setTimeout(r, 3000))
    actualPrice = await fetchPriceAt(fridayStart, last.coingecko_id)
  }

  /* — revealed predictions — */
  const revealed = await fetchRevealedTxs(targetHeight)
  if (!revealed.length) return

  /* — previous totals (after potential purge) — */
  const submitters      = [...new Set(revealed.map(r => r.creator))]
  const { data: rows }  = await supabase
    .from('participants')
    .select('address,total_score')
    .in('address', submitters)

  const prevTotals = Object.fromEntries(
    (rows ?? []).map(r => [r.address, Number(r.total_score) || 0])
  )

  /* — STEP 1: raw exponential scores — */
  const weekScores        = revealed.map(tx => weekScore(tx.price, actualPrice))

  /* — STEP 3: build upsert rows — */
  const prefix = COL_PREFIX[last.symbol as Token['symbol']]

  const participantRows = revealed.map((tx, idx) => {
    const weekScore = weekScores[idx]
    const newTotal  = (prevTotals[tx.creator] ?? 0) + weekScore

    return {
      address            : tx.creator,
      total_score        : newTotal,
      [`${prefix}_guess`]: tx.price,
      [`${prefix}_delta`]: Math.abs(tx.price - actualPrice),
      [`${prefix}_score`]: weekScore
    }
  })

  await supabase
    .from('participants')
    .upsert(participantRows, { onConflict: 'address' })
}

/* ────────────────────────────────────────────  Cron handler */
export async function GET() {
  try {
    console.log('▶ cron/update‑deadline start')

    /* 1 – score the week that just ended */
    await updateScoresForLastDeadline()

    /* 2 – wipe proofs for the finished week */
    await wipeProofsTable()

    /* 3 – decide next token */
    const tokenNext = await pickNextToken()

    /* 4 – create the next deadline row */
    const now          = new Date()
    const deadlineTime = getNextFridayDeadline(now)

    const currentHt    = await getCurrentBlockHeight()
    const secondsUntil = Math.ceil((deadlineTime.getTime() - now.getTime()) / 1000)
    const targetBlock  = currentHt + Math.ceil(secondsUntil / 1.6)   // ≈1.6 s/block

    await supabase.from('deadlines').upsert({
      deadline_date: deadlineTime.toISOString(),
      target_block : targetBlock,
      coingecko_id : tokenNext.coingecko_id,
      symbol       : tokenNext.symbol
    }, { onConflict: 'deadline_date' })

    console.log(`✅ ${deadlineTime.toISOString()} → ${tokenNext.symbol} @ block ${targetBlock}`)

    return NextResponse.json({
      success  : true,
      deadline : deadlineTime.toISOString(),
      targetBlock,
      token    : tokenNext.coingecko_id,
      symbol   : tokenNext.symbol
    })
  } catch (err: any) {
    console.error('❌ cron/update‑deadline failed', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
