/* app/api/winner/route.ts --------------------------------------------------- */
import { NextResponse }  from 'next/server';
import { createClient }  from '@supabase/supabase-js';
import { fetchPriceAt }  from '@/lib/utils';
import { FAIRYRING_ENV } from '@/constant/env';

/* ── Supabase admin client ──────────────────────────────────────────────── */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
);

/* ── constants ─────────────────────────────────────────────────────────── */
type TokenKey = 'SOL' | 'BTC' | 'ETH' | 'ARB';
const TOKENS: TokenKey[] = ['SOL', 'BTC', 'ETH', 'ARB'];
const COL_PREFIX = { SOL: 'sol', BTC: 'btc', ETH: 'eth', ARB: 'arb' } as const;

const ddmmyyyy = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;

/* ── helpers ────────────────────────────────────────────────────────────── */
async function lastSolDeadlineDate (): Promise<string | null> {
  const { data, error } = await supabase
    .from('deadlines')
    .select('deadline_date')
    .eq('symbol', 'SOL')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)
    .maybeSingle();          // ← returns { data: null } instead of throwing

  if (error) throw error;    // genuine DB/network errors only
  return data?.deadline_date ?? null;
}

/* price / date / block meta (rows ≥ last SOL week) ----------------------- */
async function collectTokenInfo(boundaryISO: string | null) {
  const nowISO = new Date().toISOString();

  const info: Record<TokenKey, { price: number | null; date: string | null; url: string | null; block: number | null }> =
    {
      SOL: { price: null, date: null, url: null, block: null },
      BTC: { price: null, date: null, url: null, block: null },
      ETH: { price: null, date: null, url: null, block: null },
      ARB: { price: null, date: null, url: null, block: null }
    };

  let q = supabase
    .from('deadlines')
    .select('deadline_date, coingecko_id, symbol, target_block')
    .lt('deadline_date', nowISO)
    .order('deadline_date', { ascending: false });

  if (boundaryISO) q = q.gte('deadline_date', boundaryISO);

  const { data, error } = await q;
  if (error) throw error;

  const seen = new Set<TokenKey>();
  for (const row of data) {
    const sym = row.symbol as TokenKey;
    if (seen.has(sym)) continue;

    const dObj   = new Date(row.deadline_date + 'Z');
    const price  = await fetchPriceAt(dObj, row.coingecko_id);
    const targetMs = dObj.getTime();              
    const fromSec  = Math.floor((targetMs - 10 * 60_000) / 1000);  // −10 min
    const toSec    = Math.floor((targetMs + 10 * 60_000) / 1000);  // +10 min
    

    const url = `https://api.coingecko.com/api/v3/coins/${row.coingecko_id}` +
                `/market_chart/range?vs_currency=usd&from=${fromSec}&to=${toSec}`;
    info[sym] = {
      price,
      date : dObj.toISOString(),
      url  : url,
      block: row.target_block ? Number(row.target_block) : null
    };

    seen.add(sym);
    if (seen.size === TOKENS.length) break;
  }
  return info;
}

/* ── main handler ──────────────────────────────────────────────────────── */
export async function GET() {
  try {
    /* 0️⃣ find the most recent SOL week ------------------------------ */
    const solBoundary = await lastSolDeadlineDate();   // may be null on very first run

    /* 1️⃣ pull participants ----------------------------------------- */
    const { data: participants, error } = await supabase
    .from('participants')
    .select(`
      address,total_score,tweet_points,
      sol_guess,sol_delta,sol_score,sol_mult,
      btc_guess,btc_delta,btc_score,btc_mult,
      eth_guess,eth_delta,eth_score,eth_mult,
      arb_guess,arb_delta,arb_score,arb_mult
    `);

    if (error) throw error;

    /* 2️⃣ overall leaderboard -------------------------------------- */
    const overall = participants
      .map(r => ({ address: r.address, totalScore: Number(r.total_score) }))
      .sort((a, b) => b.totalScore - a.totalScore);

    /* 3️⃣ per-token boards ---------------------------------------- */
    const board = (tok: TokenKey) => {
      const p = COL_PREFIX[tok];
      return participants
        .filter(r => r[`${p}_score`] !== null)
        .map(r => ({
          address : r.address,
          score   : Number(r[`${p}_score`]),
          guess   : Number(r[`${p}_guess`]),
          delta   : Number(r[`${p}_delta`]),
          mult    : Number(r[`${p}_mult`] ?? 1)       // ← NEW
        }))
        .sort((a, b) => b.score - a.score);
    };

    const tokens = {
      SOL : board('SOL'),
      BTC : board('BTC'),
      ETH : board('ETH'),
      ARB: board('ARB')
    };

    /* 4️⃣ tweet leaderboard --------------------------------------- */
    const tweetScores = participants
      .filter(r => (r.tweet_points ?? 0) > 0)
      .map(r => ({ address: r.address, score: Number(r.tweet_points) }))
      .sort((a, b) => b.score - a.score);

    /* 5️⃣ token meta (filtered to rows ≥ last SOL) ---------------- */
    const tokenInfo = await collectTokenInfo(solBoundary);

    return NextResponse.json({ overall, tokens, tweetScores, tokenInfo });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
