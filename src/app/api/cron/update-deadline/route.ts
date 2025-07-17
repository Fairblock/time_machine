import { NextResponse }              from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import axios                         from 'axios';
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
const PER_PAGE = 100;                // Tendermint /tx_search page size
const ENC_TYPE_URL = '/fairyring.pep.MsgSubmitEncryptedTx';

/* ─────────────  2-week / 4-token rotation  ───────────── */
const TOKENS = [
  { coingecko_id: 'solana',    symbol: 'SOL' },
  { coingecko_id: 'bitcoin',   symbol: 'BTC' },
  { coingecko_id: 'arbitrum',  symbol: 'ARB' },
  { coingecko_id: 'ethereum',  symbol: 'ETH' }
] as const;

type Token = (typeof TOKENS)[number];

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

async function avgBlockTime(lookback = 400): Promise<number> {
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

  const eraStartISO = eraStart().toISOString();
  console.log("🧹  new era reset — keeping only tweets ≥", eraStartISO);

  /* 1️⃣  Up-date rows that *did* tweet in this era  */
  const blankPred = {
    sol_guess:null, sol_delta:null, sol_score:null, sol_mult:null,
    btc_guess:null, btc_delta:null, btc_score:null, btc_mult:null,
    arb_guess:null, arb_delta:null, arb_score:null, arb_mult:null,
    eth_guess:null, eth_delta:null, eth_score:null, eth_mult:null
  };

  const { error: updErr } = await supabase
    .from("participants")
    .update({
      ...blankPred,
      tweet_points : ERA_TWEET_BONUS,
      total_score : ERA_TWEET_BONUS
    })
    .gte("last_tweet_at", eraStartISO)        // ← only “fresh” tweeters
    .throwOnError();
    console.log("🧹  updated", updErr ? "error" : "success");
  /* 2️⃣  Delete everyone else                        */
  const { error: delErr } = await supabase
  .from("participants")
  .delete()
  .or(`last_tweet_at.lt.${eraStartISO},last_tweet_at.is.null`) // OR, not AND
  .throwOnError();
                  
   console.log("🧹  deleted", delErr ? "error" : "success");
  if (updErr || delErr) throw updErr || delErr;
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
interface EncTx { creator: string; submittedAt: Date }
async function fetchEncryptedTimes(targetHeight: number): Promise<Map<string,Date>> {
  const map = new Map<string,Date>();
  const now = await getCurrentBlockHeight();
  const minHeight = (now - 403_200) > 0 ? now - 403_200 : 0;
  const q = encodeURIComponent(
    `tx.height>${minHeight} AND message.action='/fairyring.pep.MsgSubmitEncryptedTx'`
  );

 
  for (let page = 1; page <= 50; page++) {
    const url =
    `${RPC_URL}/tx_search` +
    `?query=%22${q}%22` +           // "%22" … "%22" == JSON double-quotes
    `&order_by=%22desc%22` +        // `"desc"` must also be JSON-quoted
    `&per_page=${PER_PAGE}` +
    `&page=${page}`;
    const res = await fetch(url).then((r) => r.json());
    

    const txs = res.result?.txs ?? [];
    for (const row of txs) {
      const h   = Number(row.height);
      const raw = TxRaw.decode(Buffer.from(row.tx, "base64"));
      const body = TxBody.decode(raw.bodyBytes);
   
      const anyMsg = body.messages.find(
        (m) => m.typeUrl === "/fairyring.pep.MsgSubmitEncryptedTx"
      );
      
      if (!anyMsg) continue;

      const msg = MsgSubmitEncryptedTx.decode(
        new Uint8Array(anyMsg.value)
      );
      if (msg.targetBlockHeight !== targetHeight) continue;
      const creator = msg.creator;
      const prev = map.get(creator);
      const blk = await getBlockTime(h);
      if (!prev || blk > prev) map.set(creator, blk); 

    }

    /* stop early if last page had < PER_PAGE items */
    if (txs.length < PER_PAGE) break;
  }

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
  const { data:last } = await supabase
    .from('deadlines')
    .select('deadline_date,target_block,coingecko_id,symbol')
    .lt('deadline_date', new Date().toISOString())
    .order('deadline_date',{ ascending:false })
    .limit(1).single();
  if (!last) return;

  await purgeParticipantsIfEpochStart(last.symbol);

  const targetHeight = Number(last.target_block);
  if (!targetHeight) return;

  const decryptDate = new Date(last.deadline_date + 'Z');

  /* price on decrypt */
  let actual = await fetchPriceAt(decryptDate, last.coingecko_id);
  while (actual === 0) {
    await new Promise(r=>setTimeout(r,3_000));
    actual = await fetchPriceAt(decryptDate, last.coingecko_id);
  }

  /* revealed & encrypted */
  const [revealed, encTimes] = await Promise.all([
    getRevealed(targetHeight),
    fetchEncryptedTimes(targetHeight)
  ]);
  if (!revealed.length) return;

  /* slot previous totals */
  const addrs      = [...new Set(revealed.map(r=>r.creator))];
  const { data:prevRows } = await supabase
    .from('participants')
    .select('address,total_score')
    .in('address', addrs);
  const prevTotal = Object.fromEntries((prevRows??[]).map(r=>[r.address,Number(r.total_score)||0]));

  /* bucket by creator → worst score, latest time */
  interface Acc {
    worst  : number          // lowest score kept
    latest : Date | null     // latest submission time
    guess  : number
    delta  : number
    mult   : number          // ← NEW
  }
  
  const bucket = new Map<string,Acc>();

  for (const tx of revealed) {
    const submitted = encTimes.get(tx.creator) ?? null;
    if (!submitted) continue;                         // cannot verify submission time
    if (submitted > decryptDate) continue;            // sanity guard
    
    /* only keep within 3-day window */
    const open = new Date(decryptDate);
    open.setUTCDate(open.getUTCDate() - 3);
    open.setUTCHours(11, 0, 0, 0);
    if (submitted < open) continue;

    const mult = multiplierFor(submitted, decryptDate);
    console.log("mult:", mult);
    const base = weekScore(tx.price, actual);
    const scr  = base * mult;
    const dlt  = Math.abs(tx.price-actual);

    const prev = bucket.get(tx.creator);
    if (!prev || scr < prev.worst) {                  // lower score = worse
      bucket.set(tx.creator, {
        worst : scr,
        latest: submitted,
        guess : tx.price,
        delta : dlt,
        mult  : mult,                          // store it
      });
    } else if (prev && submitted>prev.latest!) {
      prev.latest = submitted; 
      prev.mult   = mult;                       // update “latest”
    }
  }
  console.log('[scoring] bucket size', bucket.size);

  if (!bucket.size) return;                           // nothing valid

  const prefix = COL_PREFIX[last.symbol as Token['symbol']];
  const rows = Array.from(bucket, ([addr, v]) => ({
    address             : addr,
    total_score         : (prevTotal[addr] ?? 0) + v.worst,
    [`${prefix}_guess`] : v.guess,
    [`${prefix}_delta`] : v.delta,
    [`${prefix}_score`] : v.worst,
    [`${prefix}_mult`]  : v.mult,            
  }));

  const { data, error, status } =
  await supabase
    .from('participants')
    .upsert(rows, { onConflict: 'address' })
    .select()          // forces DB to return the rows it touched
    .throwOnError();   // will make Supabase **throw** instead of failing silently

console.log('[db] upsert status', status, 'rows written', data?.length ?? 0);
}

/* ───────────── deadline-height estimator ───────────── */
async function estimateTargetHeight(start:Date, baseH:number, deadline:Date){
  const secPer = await avgBlockTime(400);
  const tipT   = await getBlockTime(baseH);
  const left   = (deadline.getTime()-tipT.getTime())/1_000;
  const safe   = secPer*1.002;
  return baseH + Math.floor(left/safe);
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
    if (!lastRow?.target_block) throw new Error('no previous deadline row');

    const tipH    = await getCurrentBlockHeight();
    if (tipH < Number(lastRow.target_block)) await waitUntilHeight(Number(lastRow.target_block));

    await updateScoresForLastDeadline();
    await wipeProofsTable();

    /* next schedule */
    const nextTok   = await pickNextToken();
    const deadline  = getNextDeadline(now, nextTok);
    const targetBlk = await estimateTargetHeight(now, tipH, deadline);

    const { error } = await supabase.from('deadlines').upsert({
      deadline_date: deadline.toISOString(),
      target_block : targetBlk,
      coingecko_id : nextTok.coingecko_id,
      symbol       : nextTok.symbol
    },{ onConflict:'deadline_date' });
    if (error) throw new Error(error.message);

    console.log(`✅ new deadline ${deadline.toISOString()} → ${nextTok.symbol} @ block ${targetBlk}`);
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
