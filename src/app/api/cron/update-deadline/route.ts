import { NextResponse }              from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import axios, { AxiosResponse } from "axios";
import { TxRaw, TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from '@/constant/events';
import { getBlock, getBlockWithTime }            from '@/services/fairyring/block';
import { fetchPriceAt }                          from '@/lib/utils';
import { FAIRYRING_ENV }                         from '@/constant/env';
import { weekScore }                             from '@/lib/score';
import { MsgSubmitEncryptedTx } from "@/types/fairyring/codec/pep/tx";
/* ───────────────────────────  Supabase  ─────────────────────────── */
const supabase = createClient(
  FAIRYRING_ENV.supabase!,
  FAIRYRING_ENV.supabaseKey!
);

/* ───────────────────────────  RPC config  ───────────────────────── */
const RPC_URL = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network';
const ENC_TYPE_URL = '/fairyring.pep.MsgSubmitEncryptedTx';

/* ─────────────  2-week / 4-token rotation  ───────────── */
const TOKENS = [
  { coingecko_id: 'solana',    symbol: 'SOL' },
  { coingecko_id: 'bitcoin',   symbol: 'BTC' },
  { coingecko_id: 'arbitrum',  symbol: 'ARB' },
  { coingecko_id: 'ethereum',  symbol: 'ETH' }
] as const;

type Token = (typeof TOKENS)[number];

type Acc = {
  worst: number;
  latest: Date | null;
  guess: number;
  delta: number;
  mult: number;
};



const COL_PREFIX: Record<Token['symbol'], string> = {
  SOL : 'sol',
  BTC : 'btc',
  ARB : 'arb',
  ETH : 'eth'
};

const TOKEN_SCHEDULE: Record<Token['symbol'], { open: number; decrypt: number }> = {
  //           open DOW   decrypt DOW
  SOL: { open: 1, decrypt: 4 },   // Mon → Thu
  BTC: { open: 4, decrypt: 0 },   // Thu → Sun
  ARB: { open: 1, decrypt: 4 },   // Mon → Thu
  ETH: { open: 4, decrypt: 0 }    // Thu → Sun
};

const DAY_MULTIPLIERS = [1.5, 1.25, 1] as const;  // Day-1 · Day-2 · Day-3+

const TWEET_BONUS = 200;
const PER_PAGE = 100;
const MAX_PAGES = 800; // 800*100 = 80000 headroom
const MAX_TX_LOOKBACK = 403_200;

/* ───────────── LOGGING ──────────────── */
type Lvl = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR";
const LOG_LEVEL_ORDER: Record<Lvl, number> = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
};
const CURRENT_LEVEL: Lvl = (process.env.LOG_LEVEL as Lvl) ?? "DEBUG";

function log(level: Lvl, msg: string, data?: any) {
  if (LOG_LEVEL_ORDER[level] < LOG_LEVEL_ORDER[CURRENT_LEVEL]) return;
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${ts}] [${level}] ${msg}`, data);
  } else {
    console.log(`[${ts}] [${level}] ${msg}`);
  }
}
const t0 = Date.now();
function since(start = t0) {
  return `${((Date.now() - start) / 1000).toFixed(3)}s`;
}

/* ───────────── HELPERS ──────────────── */
async function retry<T>(
  fn: () => Promise<T>,
  tries = 5,
  delayMs = 2000,
  tag = "retry"
): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      log("WARN", `${tag} attempt ${i}/${tries} failed`, { error: String(e) });
      if (i < tries) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/* ───────────── helper: next 23 : 59 deadline ──────────── */
function getNextDeadline(start: Date, token: Token) {
  const targetDow  = TOKEN_SCHEDULE[token.symbol].decrypt;    // 0-6
  const todayDow   = start.getUTCDay();
  const candidate  = new Date(start);
  candidate.setUTCHours(10, 59, 0, 0);   // 10:59 UTC 

  if (todayDow === targetDow && start < candidate) return candidate;

  let days = (targetDow + 7 - todayDow) % 7;
  if (days === 0) days = 7;
  candidate.setUTCDate(start.getUTCDate() + days);
  return candidate;
}

/* ───────────── RPC helpers ───────────── */
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
}

async function getBlockTime(h: number): Promise<Date> {
  const blk = await getBlockWithTime(h);
  return new Date(blk.result.block.header.time);
}

async function avgBlockTime(lookback = 1000000): Promise<number> {
  const tip       = await getCurrentBlockHeight();
  const [tTip, tPast] = await Promise.all([getBlockTime(tip), getBlockTime(tip - lookback)]);
  return (tTip.getTime() - tPast.getTime()) / (lookback * 1000);
}

/* ───────────── token rotation ───────────── */
async function pickNextToken(): Promise<Token> {
  const { data } = await supabase
    .from('deadlines')
    .select('symbol')
    .order('deadline_date', { ascending: false })
    .limit(1)
    .single();

  if (!data?.symbol) return TOKENS[0];
  const idx = TOKENS.findIndex(t => t.symbol === data.symbol);
  return TOKENS[(idx + 1) % TOKENS.length];
}

/* ───────────── maintenance helpers ───────────── */
/* ── helpers ─────────────────────────────────────────────── */
function eraStart(now: Date = new Date()) {
  const d = new Date(now);

  /* 1️⃣  Rewind to Monday (getUTCDay: 0 = Sun … 6 = Sat) */
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));  // back to Mon
  /* 2️⃣  Snap clock to 11 : 00 UTC  */
  d.setUTCHours(11, 0, 0, 0);                                // 11:00 UTC  :contentReference[oaicite:1]{index=1}

  return d;   // Monday 11:00 UTC
}

const ERA_TWEET_BONUS = 200;

/* ── call this right after SOL decrypts (== era boundary) ── */
async function purgeParticipantsIfEpochStart(symbol: string) {
  if (symbol !== TOKENS[0].symbol) return;   // only at SOL-window end

  console.log("🧹  new era reset — clearing all participants");

  /* Delete everything from participants table */
  const { error: delErr } = await supabase
    .from("participants")
    .delete()
    .not('id', 'is', null)  // Delete all rows
    .throwOnError();
                  
  console.log("🧹  deleted all participants", delErr ? "error" : "success");
  if (delErr) throw delErr;
}


async function wipeProofsTable() {
  await supabase.from('proofs').delete().not('id', 'is', null);
}

/* ────────────────────────────────────────────────────────────
 * 1.  FETCH revealed (decrypted) events at height+1
 * 2.  FETCH **encrypted** submissions with same targetHeight
 * 3.  Join by creator to recover submission time
 * 4.  Bucket → keep LOWEST score & LATEST time   (spam =  penalty)
 * ──────────────────────────────────────────────────────────── */

/* ---------- 1️⃣  revealed events (as before) ---------------- */
interface Revealed { creator: string; price: number }
async function getRevealed(height: number): Promise<Revealed[]> {
  const blk  = await getBlock(height + 1);
  const evts = blk?.result?.finalize_block_events ?? [];
  const out: Revealed[] = [];

  evts
    .filter((e: any) => e.type === REVEAL_EVENT_TYPES.revealed)
    .forEach((e: any) => {
      const attrs = e.attributes.reduce<Record<string,string>>(
        (m,{key,value}) => (m[key]=value, m), {}
      );
      const memo = attrs[REVEAL_EVENT_ATTRS.memo];
      if (!memo) return;

      let p: any; try { p = JSON.parse(memo); } catch { return; }
      if (p.tag !== 'price-predict') return;

      out.push({
        creator: attrs[REVEAL_EVENT_ATTRS.creator],
        price  : Number(p.memo.prediction)
      });
    });
  return out;
}

/* ---------- 2️⃣  encrypted tx search ------------------------ */
async function fetchEncryptedTimes(targetHeight: number): Promise<Map<string, Date>> {
  const start = Date.now();
  log("INFO", "fetchEncryptedTimes start", { targetHeight });
  const map = new Map<string, Date>();
  const now = await getCurrentBlockHeight();
  let total = 0;
  const minHeight = 1250464;
  log("DEBUG", "fetchEncryptedTimes range", { minHeight, now });
  const q = encodeURIComponent(
    `tx.height>${minHeight} AND message.action='/fairyring.pep.MsgSubmitEncryptedTx'`
  );
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url =
      `${RPC_URL}/tx_search?query=%22${q}%22&order_by=%22desc%22` +
      `&per_page=${PER_PAGE}&page=${page}`;

     log("DEBUG", "tx_search page fetch", { page, url });
    const pageStart = Date.now();
    const res: AxiosResponse<any> = await retry(
      () => axios.get(url, { timeout: 20000 }),
      5,
      2500,
      "tx_search"
    );
    
    const txs = res.data.result?.txs ?? [];

    for (let i = 0; i < txs.length; i++) {
      const row = txs[i];
      const h = Number(row.height);
      try {
        const raw = TxRaw.decode(Buffer.from(row.tx, "base64"));
        const body = TxBody.decode(raw.bodyBytes);
        const anyMsg = body.messages.find(
          (m) => m.typeUrl === "/fairyring.pep.MsgSubmitEncryptedTx"
        );
       
        if (!anyMsg) continue;
        const msg = MsgSubmitEncryptedTx.decode(new Uint8Array(anyMsg.value));
        
        if (msg.targetBlockHeight !== targetHeight) continue;
        
        const creator = msg.creator;
        const blkT = await getBlockTime(h);
        const prev = map.get(creator);
        total++;
        if (!prev || blkT > prev) map.set(creator, blkT);
      } catch (e) {
       // log("WARN", "decode tx failed", { page, idx: i, height: h, error: String(e) });
      }
    }

    if (txs.length < PER_PAGE) {
      log("DEBUG", "tx_search early break", { page });
      break;
    }
  }

  log("INFO", "fetchEncryptedTimes done", { size: map.size, elapsed: since(start) , total: total});
  return map;
}

/* ---------- 3️⃣  scoring pipeline --------------------------- */
function multiplierFor(submitted: Date|null, decrypt: Date): number {
  if (!submitted) return 1;
  const open = new Date(decrypt);
  open.setUTCDate(open.getUTCDate() - 3);    // –3 days
  open.setUTCHours(11, 0, 0, 0);             // 11:00 UTC
  const idx  = Math.floor((submitted.getTime()-open.getTime())/86_400_000);
  return idx<=0 ? DAY_MULTIPLIERS[0] : idx===1 ? DAY_MULTIPLIERS[1] : DAY_MULTIPLIERS[2];
}

async function updateScoresForLastDeadline() {
  log("INFO", "updateScoresForLastDeadline start");

  const { data:last } = await supabase
    .from('deadlines')
    .select('deadline_date,target_block,coingecko_id,symbol')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date',{ ascending:false })
    .limit(1).single();
  if (!last) return;

  const targetHeight = Number(last.target_block);
  console.log("targetHeight: ", targetHeight);
  if (!targetHeight) {
    log("WARN", "last.target_block is falsy");
    return;
  }
  purgeParticipantsIfEpochStart(last.symbol);
  const decryptDate = new Date(last.deadline_date + "Z");

  let actual = await fetchPriceAt(decryptDate, last.coingecko_id);
  while (actual === 0) {
    await new Promise(r=>setTimeout(r,3_000));
    actual = await fetchPriceAt(decryptDate, last.coingecko_id);
  }
  log("INFO", "actual price", { actual });

  const readStart = Date.now();
  const revealed = await getRevealed(targetHeight);
  log("INFO", "revealed predictions", {
    count: revealed.length,
    elapsed: since(readStart),
  });

  const encTimes = await fetchEncryptedTimes(targetHeight);

  const addrs      = [...new Set(revealed.map(r=>r.creator))];
  console.table(addrs.slice(0, 10));
  const { data:prevRows } = await supabase
    .from('participants')
    .select('address,total_score,tweet_points');
  const prevTotal = Object.fromEntries((prevRows??[]).map(r=>[r.address,Number(r.total_score)||0]));
  const prevTweet: Record<string, number> =
    Object.fromEntries((prevRows??[]).map(r=>[r.address,Number(r.tweet_points)||0]));

  log("DEBUG", "unique creators", { count: addrs.length });

  const bucketStart = Date.now();
  const bucket = new Map<string, Acc>();
  let skippedNoTime = 0;
  let skippedTooLate = 0;
  let skippedTooEarly = 0;

  const open = new Date(decryptDate);
  open.setUTCDate(open.getUTCDate() - 3);
  open.setUTCHours(11, 0, 0, 0);
  console.log("DEBUG", "open date", { open: open.toISOString() });
  
  for (let i = 0; i < revealed.length; i++) {
    const tx = revealed[i];
    const submitted = encTimes.get(tx.creator) ?? null;
    if (!submitted) {
      skippedNoTime++;
      continue;
    }
   
    if (submitted > decryptDate) {
      skippedTooLate++;
      continue;
    }
    if (submitted < open) {
      skippedTooEarly++;
      continue;
    }

    const mult = multiplierFor(submitted, decryptDate);
    const base = weekScore(tx.price, actual);
    const scr = base * mult;
    const dlt = Math.abs(tx.price - actual);

    const prev = bucket.get(tx.creator);
    if (!prev || scr < prev.worst) {
      bucket.set(tx.creator, {
        worst: scr,
        latest: submitted,
        guess: tx.price,
        delta: dlt,
        mult,
      });
    }
    if (i % 500 === 0) {
      log("TRACE", "bucket progress", { i, size: bucket.size });
    }
  }

  log("INFO", "bucket build done", {
    creatorsBucketed: bucket.size,
    skippedNoTime,
    skippedTooLate,
    skippedTooEarly,
    elapsed: since(bucketStart),
  });

  if (!bucket.size) {
    log("WARN", "bucket empty — nothing to upsert");
    return;
  }

  const prefix = COL_PREFIX[last.symbol as Token['symbol']];
  console.log("DEBUG", "prefix", { prefix });
 
  const rows = Array.from(bucket, ([addr, v]) => {
    const prevTw = prevTweet[addr] ?? 0;          // <— default to 0
    return {
      address:      addr,
      total_score:  (prevTotal[addr] ?? 0) + v.worst,
      tweet_points: prevTw,                       // <— ALWAYS present
      [`${prefix}_guess`]:  v.guess,
      [`${prefix}_delta`]:  v.delta,
      [`${prefix}_score`]:  v.worst,
      [`${prefix}_mult`]:   v.mult,
    };
  });

  // ── NEW: apply tweet bonus from proofs.used === true ─────────────
  const { data:proofRows, error:proofErr } = await supabase
    .from('proofs')
    .select('wallet,used');
  if (proofErr) {
    log("WARN", "failed to fetch proofs", { error: proofErr.message });
  } else {
    const usedAddrs = (proofRows ?? []).filter(p => p.used).map(p => p.wallet);
    log("DEBUG", "tweet bonus addresses", { count: usedAddrs.length });
    const rowMap = new Map(rows.map(r => [r.address, r]));
    for (const addr of usedAddrs) {
      const existing = rowMap.get(addr);
      const prevTot = prevTotal[addr] ?? 0;
      const prevTw  = prevTweet[addr] ?? 0;
      if (existing) {
        existing.tweet_points = prevTw + TWEET_BONUS;
        existing.total_score += TWEET_BONUS;
      } else {
        // user had no prediction this week, still grant tweet bonus
        rowMap.set(addr, {
          address: addr,
          total_score: prevTot + TWEET_BONUS,
          tweet_points: prevTw + TWEET_BONUS,
        } as any);
      }
    }
    // rebuild rows array (some new rows may have been added)
    rows.length = 0;
    for (const r of rowMap.values()) rows.push(r);
  }
  // ── END tweet bonus ───────────────────────────────────────────── 
  
  log("DEBUG", "rows prepared", { rows: rows.length, prefix });
  // quick sanity check before making the call
  const approxSize = Buffer.byteLength(JSON.stringify(rows));
  console.log("DEBUG", "approx size of rows", { approxSize });
  console.table(rows.slice(100, 300));
  
  const {error, status } =
    await supabase
      .from('participants')
      .upsert(rows, { onConflict: 'address' })
      .throwOnError();   // will make Supabase **throw** instead of failing silently

  console.log("INFO", "updateScoresForLastDeadline complete", error, status);
}

/* ───────────── deadline-height estimator ───────────── */
async function estimateTargetHeight(baseH:number, deadline:Date){
  const lookback = 1000000;  
  const slowFac = 1.02;      
  const baseBlock  = await getBlock(baseH);
  const baseTime   = new Date(baseBlock.header.time);
  const avgSec = await avgBlockTime(lookback);
  const estSec = avgSec * slowFac;
  const secsUntil = (deadline.getTime() - baseTime.getTime()) / 1000;
  const blocksAhead = Math.floor(secsUntil / estSec);
  let predicted = baseH + blocksAhead;

  
  return predicted;
}

/* ───────────── GET handler ───────────── */
export async function GET(req: Request) {

 // Skip the check locally so dev is easy
  if (process.env.NODE_ENV !== 'development') {
    const auth = req.headers.get('Authorization');
    if (auth !== ("Bearer "+process.env.CRON_SECRET)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  try {
    console.log('▶ cron/update-deadline start');

    /* wait for previous target */
    const { data:lastRow } = await supabase
      .from('deadlines')
      .select('target_block')
      .order('deadline_date',{ ascending:false })
      .limit(1).single();
  

    const tipH    = await getCurrentBlockHeight();
    /* next schedule */
    const nextTok   = await pickNextToken();
    const deadline  = getNextDeadline(now, nextTok);
    const targetBlk = await estimateTargetHeight(tipH, deadline);

    const { error } = await supabase.from('deadlines').upsert({
      deadline_date: deadline.toISOString(),
      target_block : targetBlk,
      coingecko_id : nextTok.coingecko_id,
      symbol       : nextTok.symbol
    },{ onConflict:'deadline_date' });
    if (error) throw new Error(error.message);

    console.log(`✅ new deadline ${deadline.toISOString()} → ${nextTok.symbol} @ block ${targetBlk}`);
    if (lastRow?.target_block){
    if (tipH < Number(lastRow.target_block)) await waitUntilHeight(Number(lastRow.target_block));

    await updateScoresForLastDeadline();
    await wipeProofsTable();
    }

    return NextResponse.json({
      success:true,
      deadline:deadline.toISOString(),
      targetBlock:targetBlk,
      token:nextTok.coingecko_id,
      symbol:nextTok.symbol
    });
  } catch (err:any) {
    console.error('❌ cron/update-deadline failed', err);
    return NextResponse.json({ error:err.message },{ status:500 });
  }
}
