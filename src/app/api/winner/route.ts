import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { fetchPriceAt }  from '@/lib/utils'
import { FAIRYRING_ENV } from '@/constant/env'

/* ────────────────────────────────────────────  Supabase  */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
)

/* ────────────────────────────────────────────  Helpers    */
async function fetchLastDeadline() {
  const { data, error } = await supabase
    .from('deadlines')
    .select('deadline_date, coingecko_id, symbol')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data
}

type TokenKey = 'SOL' | 'BTC' | 'ETH' | 'LINK'

const COL_PREFIX: Record<TokenKey, string> = {
  SOL: 'sol', BTC: 'btc', ETH: 'eth', LINK: 'link'
}

export async function GET() {
  try {
    /* 1 – last Friday’s reference price (optional UI context) */
    const last  = await fetchLastDeadline()
    let refPrice: number | null = null

    if (last) {
      const friday = new Date(last.deadline_date + 'Z')
      refPrice     = await fetchPriceAt(friday, last.coingecko_id)
    }

    /* 2 – pull every column we need once */
    const { data, error } = await supabase
      .from('participants')
      .select(`
        address,total_score,
        sol_guess,sol_delta,sol_score,
        btc_guess,btc_delta,btc_score,
        eth_guess,eth_delta,eth_score,
        link_guess,link_delta,link_score
      `)

    if (error) throw error

    /* 3 – build boards */
    const overall = [...data]
      .sort((a, b) => Number(b.total_score) - Number(a.total_score))
      .map(r => ({
        address     : r.address,
        totalScore  : Number(r.total_score)
      }))

    function makeTokenBoard(tok: TokenKey) {
      const p = COL_PREFIX[tok]
      return data
        .filter(r => r[`${p}_score`] !== null)
        .sort((a, b) => Number(b[`${p}_score`]) - Number(a[`${p}_score`]))
        .map(r => ({
          address : r.address,
          guess   : Number(r[`${p}_guess`]),
          delta   : Number(r[`${p}_delta`]),
          score   : Number(r[`${p}_score`])
        }))
    }

    const tokens = {
      SOL : makeTokenBoard('SOL'),
      BTC : makeTokenBoard('BTC'),
      ETH : makeTokenBoard('ETH'),
      LINK: makeTokenBoard('LINK')
    }

    return NextResponse.json({
      overall,
      tokens,
      lastFridayPrice : refPrice,
      lastTokenId     : last?.coingecko_id ?? null,
      lastSymbol      : last?.symbol       ?? null
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
