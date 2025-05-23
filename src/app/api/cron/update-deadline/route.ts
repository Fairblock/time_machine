// app/api/cron/update-deadline/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'
import { FAIRYRING_ENV } from '@/constant/env'

/* ── 1. Supabase ---------------------------------------------------------------- */
const SUPABASE_URL  = FAIRYRING_ENV.supabase
const SERVICE_KEY   = FAIRYRING_ENV.supabaseKey
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing Supabase env vars')
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

/* ── 2. RPC --------------------------------------------------------------------- */
const RPC_URL = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network'
async function getCurrentBlockHeight(): Promise<number> {
  const { data } = await axios.get(`${RPC_URL}/status`)
  return Number.parseInt(data.result.sync_info.latest_block_height, 10)
}

/* ── 3. Token rotation list ------------------------------------------------------ */
/**  Edit / reorder / add as you like.  The cron will cycle through in order.  */
const TOKENS: { coingecko_id: string; symbol: string }[] = [
  { coingecko_id: 'solana',   symbol: 'SOL' },
  { coingecko_id: 'bitcoin',  symbol: 'BTC' },
  { coingecko_id: 'ethereum', symbol: 'ETH' },
  { coingecko_id: 'chainlink',symbol: 'LINK' },
]

/* Figure out which token should be next in the cycle */
async function pickNextToken() {
  // grab the last deadline row (highest date == latest)
  const { data, error } = await supabase
    .from('deadlines')
    .select('coingecko_id')
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data?.coingecko_id) return TOKENS[0]          // first run

  const lastIdx = TOKENS.findIndex(t => t.coingecko_id === data.coingecko_id)
  return TOKENS[(lastIdx + 1) % TOKENS.length]                // cycle
}

/* ── 4. Date helpers ------------------------------------------------------------- */
function getNextFridayDeadline(now = new Date()): Date {
  const day          = now.getUTCDay();
  const daysUntilFri = ((5 + 7 - day) % 7) || 7;
  const next         = new Date(now);
  next.setUTCDate(   now.getUTCDate() + daysUntilFri );
  next.setUTCHours(  23, 59, 0, 0 );   // ← 23:59 UTC on Friday
  return next;  
}

/* ── 5. Handler ------------------------------------------------------------------ */
export async function GET() {
  try {
    console.log('▶ cron/update‑deadline start')

    /* a. choose token -------------------------------------------------- */
    const token        = await pickNextToken()

    /* b. compute deadline + block -------------------------------------- */
    const now          = new Date()
    const deadlineTime = getNextFridayDeadline(now)
    const currentHt    = await getCurrentBlockHeight()

    const secondsUntil = Math.ceil((deadlineTime.getTime() - now.getTime()) / 1000)
    const targetBlock  = currentHt + Math.ceil(secondsUntil / 1.6) // ≈1.6 s / block

    /* c. upsert row ----------------------------------------------------- */
    await supabase
    .from('deadlines')
    .upsert(
      {
        deadline_date: deadlineTime.toISOString(),
        target_block : targetBlock,
        coingecko_id : token.coingecko_id,
        symbol       : token.symbol,
      },
      { onConflict: 'deadline_date' }   // ← string, not string[]
    )
  

    console.log(`✅ ${deadlineTime.toISOString()} → ${token.symbol} → block ${targetBlock}`)
    return NextResponse.json({
      success      : true,
      deadline     : deadlineTime.toISOString(),
      targetBlock,
      token        : token.coingecko_id,
      symbol       : token.symbol,
    })
  } catch (err: any) {
    console.error('❌ cron/update‑deadline failed', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
