
   import { NextResponse }  from 'next/server';
   import { createClient }  from '@supabase/supabase-js';
   import axios             from 'axios';
   
   import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from '@/constant/events';
   import { getBlock }      from '@/services/fairyring/block';
   import { fetchPriceAt }  from '@/lib/utils';
   import { FAIRYRING_ENV } from '@/constant/env';
   import { rawScore as calcRaw, weekScore } from '@/lib/score';
   
   const supabase = createClient(
     FAIRYRING_ENV.supabase!,
     FAIRYRING_ENV.supabaseKey!
   );
   
   const RPC_URL = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network';
   
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
   
   const TOKENS = [
     { coingecko_id: 'solana',    symbol: 'SOL'  },
     { coingecko_id: 'bitcoin',   symbol: 'BTC'  },
     { coingecko_id: 'ethereum',  symbol: 'ETH'  },
     { coingecko_id: 'chainlink', symbol: 'LINK' }
   ] as const;
   
   type Token = (typeof TOKENS)[number];
   const COL_PREFIX: Record<Token['symbol'], string> = {
     SOL : 'sol',
     BTC : 'btc',
     ETH : 'eth',
     LINK: 'link'
   };
   
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
   
   function getNextFridayDeadline(start: Date) {
     const day          = start.getUTCDay();
     const daysUntilFri = ((5 + 7 - day) % 7) || 7;
     const next         = new Date(start);
     next.setUTCDate(start.getUTCDate() + daysUntilFri);
     next.setUTCHours(23, 59, 0, 0);
     return next;
   }
   
   async function purgeParticipantsIfEpochStart(symbolJustFinished: string) {
     if (symbolJustFinished === TOKENS[0].symbol) {
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
   
   async function fetchRevealedTxs(height: number) {
     const out: { creator: string; price: number }[] = [];
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
   
         out.push({
           creator: attrs[REVEAL_EVENT_ATTRS.creator],
           price  : Number(parsed.memo.prediction)
         });
       });
   
     return out;
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
   
     const fridayStart = new Date(last.deadline_date + 'Z');
     let actualPrice   = await fetchPriceAt(fridayStart, last.coingecko_id);
     while (actualPrice === 0) {
       await new Promise(r => setTimeout(r, 3_000));
       actualPrice = await fetchPriceAt(fridayStart, last.coingecko_id);
     }
   
     const revealed = await fetchRevealedTxs(targetHeight);
     if (!revealed.length) return;
   
     const submitters      = [...new Set(revealed.map(r => r.creator))];
     const { data: rows }  = await supabase
       .from('participants')
       .select('address,total_score')
       .in('address', submitters);
   
     const prevTotals = Object.fromEntries(
       (rows ?? []).map(r => [r.address, Number(r.total_score) || 0])
     );
   
     const weekScores        = revealed.map(tx => weekScore(tx.price, actualPrice));
   
     const prefix = COL_PREFIX[last.symbol as Token['symbol']];
   
     const participantRows = revealed.map((tx, idx) => {
       const weekScore = weekScores[idx];
       const newTotal  = (prevTotals[tx.creator] ?? 0) + weekScore;
   
       return {
         address            : tx.creator,
         total_score        : newTotal,
         [`${prefix}_guess`]: tx.price,
         [`${prefix}_delta`]: Math.abs(tx.price - actualPrice),
         [`${prefix}_score`]: weekScore
       };
     });
   
     await supabase
       .from('participants')
       .upsert(participantRows, { onConflict: 'address' });
   }
   
   const BLOCK_TIME_SEC = 1.62;
   
   export async function GET() {
     const startTime = new Date();
   
     try {
       console.log('▶ cron/update-deadline start');
   
       const { data: last } = await supabase
         .from('deadlines')
         .select('target_block')
         .order('deadline_date', { ascending: false })
         .limit(1)
         .single();
       if (!last?.target_block) {
         throw new Error('no previous deadline row');
       }
       const expectedTarget = Number(last.target_block);
   
       const baseHeight = await getCurrentBlockHeight();
       console.log(`◇ base height at deadline: ${baseHeight}`);
   
       if (baseHeight < expectedTarget) {
         await waitUntilHeight(expectedTarget);
       } else {
         console.log(`⏩ already past target (${baseHeight} ≥ ${expectedTarget})`);
       }
   
       await updateScoresForLastDeadline();
   
       await wipeProofsTable();
   
       const tokenNext = await pickNextToken();
   
       const deadlineTime = getNextFridayDeadline(startTime);
       const secondsUntil = Math.ceil((deadlineTime.getTime() - startTime.getTime()) / 1_000);
       const targetBlock  = baseHeight + Math.ceil(secondsUntil / BLOCK_TIME_SEC);
   
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
   