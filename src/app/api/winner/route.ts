import { NextResponse }  from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import { fetchPriceAt }  from '@/lib/utils'
import { FAIRYRING_ENV } from '@/constant/env'

/* ───────────────────────────────────────────  Supabase */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
)

/* ───────────────────────────────────────────  helpers  */
type TokenKey = 'SOL' | 'BTC' | 'ETH' | 'LINK'
const TOKENS: TokenKey[] = ['SOL','BTC','ETH','LINK']
const COL_PREFIX: Record<TokenKey,string> = { SOL:'sol', BTC:'btc', ETH:'eth', LINK:'link' }

function ddmmyyyy(d: Date) {
  const pad = (n: number) => n.toString().padStart(2,'0')
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth()+1)}-${d.getUTCFullYear()}`
}

async function collectTokenInfo() {
  const nowISO = new Date().toISOString()

  /** meta per token we return to the FE */
  const info: Record<TokenKey, { price:number|null, date:string|null, url:string|null }> = {
    SOL:{price:null,date:null,url:null},
    BTC:{price:null,date:null,url:null},
    ETH:{price:null,date:null,url:null},
    LINK:{price:null,date:null,url:null}
  }

  /* most recent finished deadline rows (max one per token) */
  const { data, error } = await supabase
    .from('deadlines')
    .select('deadline_date, coingecko_id, symbol')
    .lt('deadline_date', nowISO)
    .order('deadline_date', { ascending: false })

  if (error) throw error

  const seen = new Set<TokenKey>()
  for (const row of data) {
    const sym = row.symbol as TokenKey
    if (seen.has(sym)) continue

    const dateObj  = new Date(row.deadline_date + 'Z')
    const price    = await fetchPriceAt(dateObj, row.coingecko_id)
    const dateStr  = dateObj.toISOString()
    const cgDate   = ddmmyyyy(dateObj)                  // dd‑mm‑yyyy for CG
    const url      = `https://api.coingecko.com/api/v3/coins/${row.coingecko_id}/history?date=${cgDate}`

    info[sym] = { price, date: dateStr, url }
    seen.add(sym)
    if (seen.size === TOKENS.length) break
  }

  return info
}

/* ───────────────────────────────────────────  API      */
export async function GET() {
  try {
    /* participants */
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

    /* boards */
    const overall = [...data]
      .sort((a,b) => Number(b.total_score) - Number(a.total_score))
      .map(r => ({ address:r.address, totalScore:Number(r.total_score) }))

    const board = (tok: TokenKey) => {
      const p = COL_PREFIX[tok]
      return data
        .filter(r => r[`${p}_score`] !== null)
        .sort((a,b) => Number(b[`${p}_score`]) - Number(a[`${p}_score`]))
        .map(r => ({
          address : r.address,
          score   : Number(r[`${p}_score`]),
          guess   : Number(r[`${p}_guess`]),
          delta   : Number(r[`${p}_delta`])
        }))
    }

    const tokens = {
      SOL : board('SOL'),
      BTC : board('BTC'),
      ETH : board('ETH'),
      LINK: board('LINK')
    }

    /* real prices + date + link */
    const tokenInfo = await collectTokenInfo()

    return NextResponse.json({ overall, tokens, tokenInfo })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error:'failed to fetch leaderboard' }, { status:500 })
  }
}
