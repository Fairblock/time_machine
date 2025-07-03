import { NextResponse }  from 'next/server';
import { createClient }  from '@supabase/supabase-js';
import axios             from 'axios';

import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from '@/constant/events';
import { getBlock }      from '@/services/fairyring/block';
import { fetchPriceAt }  from '@/lib/utils';
import { FAIRYRING_ENV } from '@/constant/env';
import { weekScore }     from '@/lib/score';            // base accuracy score

/* ───────────────────────────  Supabase  ─────────────────────────── */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
);

/* ───────────────────────────  RPC config  ───────────────────────── */
const RPC_URL = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network';

/* ────────────────  2-WEEK / 4-TOKEN ROTATION  ──────────────── */
const TOKENS = [
  { coingecko_id: 'solana',    symbol: 'SOL'  },  // week-1 (Mon-Wed)
  { coingecko_id: 'bitcoin',   symbol: 'BTC'  },  // week-1 (Thu-Sat)
  { coingecko_id: 'arbitrum',  symbol: 'ARB'  },  // week-2 (Mon-Wed)
  { coingecko_id: 'ethereum',  symbol: 'ETH'  }   // week-2 (Thu-Sat)
] as const;

type Token = (typeof TOKENS)[number];

/* prefixes for participant columns */
const COL_PREFIX: Record<Token['symbol'], string> = {
  SOL : 'sol',
  BTC : 'btc',
  ARB : 'arb',
  ETH : 'eth'
};

/* weekday schedule for each token (UTC, Sun=0) */
const TOKEN_SCHEDULE: Record<Token['symbol'], { open: number; decrypt: number }> = {
  SOL: { open: 1, decrypt: 3 },  // Mon → Wed
  BTC: { open: 4, decrypt: 6 },  // Thu → Sat
  ARB: { open: 1, decrypt: 3 },  // Mon → Wed
  ETH: { open: 4, decrypt: 6 }   // Thu → Sat
};

/* timing multipliers */
const DAY_MULTIPLIERS = [2.25, 1.5, 1] as const;  // Day-1, Day-2, Day-3+

function getNextDeadline(start: Date, token: Token) {
  const targetDow = TOKEN_SCHEDULE[token.symbol].decrypt;   // 0-6, Sun=0
  const todayDow  = start.getUTCDay();

  // Candidate deadline on *today* at 23:59 UTC
  const candidate = new Date(start);
  candidate.setUTCHours(23, 59, 0, 0);

  if (todayDow === targetDow && start < candidate) {
    // Still before tonight’s cutoff → use today
    return candidate;
  }

  // Otherwise jump forward to the next target weekday
  let daysUntil = (targetDow + 7 - todayDow) % 7;
  if (daysUntil === 0) daysUntil = 7;                      // only happens if we’re past tonight
  candidate.setUTCDate(start.getUTCDate() + daysUntil);
  // hours/minutes already set above
  return candidate;
}

/* ──────────────────────────  RPC helpers  ───────────────────────── */
async function getCurrentBlockHeight(retries = 5, delayMs = 2_000): Promise<number> {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await axios.get(`${RPC_URL}/status`, { timeout: 4_000 });
      return Number.parseInt(data.result.sync_info.latest_block_height, 10);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('unreachable');
}

async function waitUntilHeight(target: number, intervalMs = 5_000) {
  let h = await getCurrentBlockHeight();
  while (h < target) {
    console.log(`⏳ height ${h} – waiting for ${target}`);
    await new Promise(r => setTimeout(r, intervalMs));
    h = await getCurrentBlockHeight();
  }
  console.log(`✅ reached target height ${h}`);
}
/* ───────── helper 1: fetch header time for a height ───────── */
async function getBlockTime(h: number): Promise<Date> {
  const block = await getBlock(h);
  return new Date(block.header.time); // RFC-3339 in UTC
}

/* ───────── helper 2: moving-average block time (N = 400) ─── */
async function avgBlockTime(lookback = 400): Promise<number> {
  const latestH = await getCurrentBlockHeight();
  const [tLatest, tPast] = await Promise.all([
    getBlockTime(latestH),
    getBlockTime(latestH - lookback),
  ]);
  return (tLatest.getTime() - tPast.getTime()) / (lookback * 1000); // seconds
}

/* ───────────────────────  token rotation logic  ─────────────────── */
async function pickNextToken(): Promise<Token> {
  const { data } = await supabase
    .from('deadlines')
    .select('symbol')
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single();

  if (!data?.symbol) return TOKENS[0];
  const lastIdx = TOKENS.findIndex(t => t.symbol === data.symbol);
  return TOKENS[(lastIdx + 1) % TOKENS.length];
}

/* ───────────────────────  participant housekeeping  ─────────────── */
async function purgeParticipantsIfEpochStart(symbolJustFinished: string) {
  if (symbolJustFinished === TOKENS[0].symbol) {                // SOL → start of new epoch
    console.log('🧹  purging participants for new epoch');
    await supabase.from('participants').delete().neq('address', '');
  }
}

async function wipeProofsTable() {
  console.log('🧹  wiping proofs table');
  const { error } = await supabase
    .from('proofs')
    .delete()
    .not('id', 'is', null);
  error
    ? console.error('❌  proofs wipe failed:', error.message)
    : console.log('✅  proofs wiped');
}

/* ───────────────────────────  events parsing  ───────────────────── */
/** Revealed prediction plus the *original* submission time (if provided). */
interface RevealedTx {
  creator     : string;
  price       : number;
  submittedAt : Date | null;
}

async function fetchRevealedTxs(height: number): Promise<RevealedTx[]> {
  const out: RevealedTx[] = [];
  const block  = await getBlock(height + 1);
  const events = block?.result?.finalize_block_events ?? [];

  events
    .filter((e: any) => e.type === REVEAL_EVENT_TYPES.revealed)
    .forEach((e: any) => {
      const attrs = e.attributes.reduce<Record<string,string>>(
        (acc,{key,value}) => ((acc[key] = value), acc), {});
      const memoStr = attrs[REVEAL_EVENT_ATTRS.memo];
      if (!memoStr) return;

      let parsed: any;
      try { parsed = JSON.parse(memoStr); } catch { return; }
      if (parsed.tag !== 'price-predict') return;

      /* submitted_at or submittedAt - ISO-string, optional */
      const iso = parsed.memo?.submitted_at ?? parsed.memo?.submittedAt ?? null;
      const submittedAt = iso ? new Date(iso) : null;

      out.push({
        creator    : attrs[REVEAL_EVENT_ATTRS.creator],
        price      : Number(parsed.memo.prediction),
        submittedAt
      });
    });

  return out;
}

/* ───────────────────────  score calculation  ────────────────────── */
function multiplierForSubmission(
  submittedAt: Date | null,
  decryptDate: Date
): number {
  if (!submittedAt) return 1;                                   // no info → default
  /* window opens two days *before* decrypt day at 00:00 UTC */
  const openDate = new Date(decryptDate);
  openDate.setUTCDate(openDate.getUTCDate() - 2);
  openDate.setUTCHours(0, 0, 0, 0);

  const dayIndex = Math.floor(
    (submittedAt.getTime() - openDate.getTime()) / 86_400_000
  );                                                            // 0,1,≥2
  if (dayIndex <= 0) return DAY_MULTIPLIERS[0];                 // Day-1 (3×)
  if (dayIndex === 1) return DAY_MULTIPLIERS[1];                // Day-2 (2×)
  return DAY_MULTIPLIERS[2];                                    // Day-3+ (1×)
}
function inSubmissionWindow(
  submittedAt: Date | null,
  decryptDate: Date
): boolean {
  if (!submittedAt) return false;                 // no timestamp → ignore

  // window opens 2 days *before* decrypt at 00:00 UTC
  const openDate = new Date(decryptDate);
  openDate.setUTCDate(openDate.getUTCDate() - 2);
  openDate.setUTCHours(0, 0, 0, 0);

  return submittedAt >= openDate && submittedAt <= decryptDate;
}
async function updateScoresForLastDeadline() {
  const { data: last } = await supabase
    .from('deadlines')
    .select('deadline_date,target_block,coingecko_id,symbol')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single();
  if (!last) return;

  await purgeParticipantsIfEpochStart(last.symbol);

  const targetHeight = Number(last.target_block);
  if (!targetHeight) return;

  const decryptDate = new Date(last.deadline_date + 'Z');       // Wed/Sat @23:59
  let actualPrice   = await fetchPriceAt(decryptDate, last.coingecko_id);
  while (actualPrice === 0) {
    await new Promise(r => setTimeout(r, 3_000));
    actualPrice = await fetchPriceAt(decryptDate, last.coingecko_id);
  }
  /* only keep submissions inside the 3-day window */
  const revealed = (await fetchRevealedTxs(targetHeight)).filter(tx =>
    inSubmissionWindow(tx.submittedAt, decryptDate)
  );
  if (!revealed.length) return;   // nothing valid → exit
  const submitters      = [...new Set(revealed.map(r => r.creator))];
  const { data: rows }  = await supabase
    .from('participants')
    .select('address,total_score')
    .in('address', submitters);

  const prevTotals = Object.fromEntries(
    (rows ?? []).map(r => [r.address, Number(r.total_score) || 0])
  );

  const prefix = COL_PREFIX[last.symbol as Token['symbol']];

  const participantRows = revealed.map(tx => {
    const baseScore  = weekScore(tx.price, actualPrice);
    const multiplier = multiplierForSubmission(tx.submittedAt, decryptDate);
    const score      = baseScore * multiplier;
    const newTotal   = (prevTotals[tx.creator] ?? 0) + score;

    return {
      address            : tx.creator,
      total_score        : newTotal,
      [`${prefix}_guess`]: tx.price,
      [`${prefix}_delta`]: Math.abs(tx.price - actualPrice),
      [`${prefix}_score`]: score
    };
  });

  await supabase
    .from('participants')
    .upsert(participantRows, { onConflict: 'address' });
}

/* ────────────────────────────  constants  ───────────────────────── */
const BLOCK_TIME_SEC = 1.616;

/* ────────────────────────────  entrypoint  ──────────────────────── */
export async function GET() {
  const startTime = new Date();

  try {
    console.log('▶ cron/update-deadline start');

    /* 1️⃣ ensure previous decrypt finished */
    const { data: last } = await supabase
      .from('deadlines')
      .select('target_block')
      .order('deadline_date', { ascending: false })
      .limit(1)
      .single();
    if (!last?.target_block) throw new Error('no previous deadline row');

    const expectedTarget = Number(last.target_block);
    const baseHeight     = await getCurrentBlockHeight();
    console.log(`◇ base height at deadline: ${baseHeight}`);

    if (baseHeight < expectedTarget) {
      await waitUntilHeight(expectedTarget);
    } else {
      console.log(`⏩ already past target (${baseHeight} ≥ ${expectedTarget})`);
    }

    /* 2️⃣ update scores & wipe proofs */
    await updateScoresForLastDeadline();
    await wipeProofsTable();

    /* 3️⃣ schedule the next token */
    const tokenNext    = await pickNextToken();
    const deadlineTime = getNextDeadline(startTime, tokenNext);

    /* ── improved height estimator ─────────────────────────── */
    const AVG_LOOKBACK = 400;        // blocks (~7-10 min)
    const SLOW_FACTOR  = 1.002;      // +0.2 % safety → always < 23:59

    const secPerBlock = await avgBlockTime(AVG_LOOKBACK);             // moving-avg
    const latestTime  = await getBlockTime(baseHeight);               // header.time
    const secsUntil   = (deadlineTime.getTime() - latestTime.getTime()) / 1_000;

    // assume blocks will be a hair *slower* (= bigger) than recent average
    const safeSec     = secPerBlock * SLOW_FACTOR;
    const estDelta    = Math.floor(secsUntil / safeSec);              // round *down*
    let   targetBlock = baseHeight + estDelta;

    const { error } = await supabase.from('deadlines').upsert({
      deadline_date: deadlineTime.toISOString(),
      target_block : targetBlock,
      coingecko_id : tokenNext.coingecko_id,
      symbol       : tokenNext.symbol
    }, { onConflict: 'deadline_date' });
    if (error) throw new Error(`deadline upsert failed: ${error.message}`);

    console.log(`✅ ${deadlineTime.toISOString()} → ${tokenNext.symbol} @ block ${targetBlock}`);

    return NextResponse.json({
      success  : true,
      deadline : deadlineTime.toISOString(),
      targetBlock,
      token    : tokenNext.coingecko_id,
      symbol   : tokenNext.symbol
    });
  } catch (err: any) {
    console.error('❌ cron/update-deadline failed', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
