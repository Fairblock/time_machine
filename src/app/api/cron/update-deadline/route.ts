/* app/api/cron/update-deadline/route.ts
 * ──────────────────────────────────────────────────────────────────────────
 *  – keeps every existing feature (rotation, scoring, wiping, etc.)
 *  – NEW ①: fetchEncryptedTimes()  → latest send-time per creator
 *  – NEW ②: uses that timestamp if the reveal memo had none
 *  – NEW ③: “worst-score & latest-time” per creator when multiple reveals
 *  – height estimator unchanged (fast –0.3 %)
 * ------------------------------------------------------------------------ */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios            from 'axios'
import { Buffer }       from 'buffer'
import { TxRaw, TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { MsgSubmitEncryptedTx } from '@/types/fairyring/codec/pep/tx'

import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from '@/constant/events'
import { getBlock, getBlockWithTime }             from '@/services/fairyring/block'
import { fetchPriceAt }  from '@/lib/utils'
import { FAIRYRING_ENV } from '@/constant/env'
import { weekScore }     from '@/lib/score'

/* ───── env / clients ───────────────────────────────────────────── */
const supabase = createClient(FAIRYRING_ENV.supabase!, FAIRYRING_ENV.supabaseKey!)
const RPC_URL  = FAIRYRING_ENV.rpcURL ?? 'https://testnet-rpc.fairblock.network'
const RPC_HTTP = RPC_URL.replace(/^ws/, 'http')

/* ───── constants ───────────────────────────────────────────────── */
const TOKENS = [
  { coingecko_id: 'solana',  symbol: 'SOL' },
  { coingecko_id: 'bitcoin', symbol: 'BTC' },
  { coingecko_id: 'arbitrum',symbol: 'ARB' },
  { coingecko_id: 'ethereum',symbol: 'ETH' }
] as const
type Token = (typeof TOKENS)[number]

const COL_PREFIX: Record<Token['symbol'], string> = {
  SOL: 'sol', BTC: 'btc', ARB: 'arb', ETH: 'eth'
}
const TOKEN_SCHEDULE: Record<Token['symbol'],{open:number;decrypt:number}> = {
  SOL:{open:1,decrypt:3}, BTC:{open:4,decrypt:6},
  ARB:{open:1,decrypt:3}, ETH:{open:4,decrypt:6}
}
const DAY_MULTIPLIERS = [2.25,1.5,1] as const
const ENC_TYPE_URL    = '/fairyring.pep.MsgSubmitEncryptedTx'
const ONE_WEEK        = 403_200       // ~7 days of Tendermint-1 s blocks
const PER_PAGE        = 100

/* ───── misc helpers ────────────────────────────────────────────── */
function getNextDeadline(start:Date, token:Token){
  const target = TOKEN_SCHEDULE[token.symbol].decrypt
  const cand = new Date(start); cand.setUTCHours(23,59,0,0)
  if(start.getUTCDay()===target && start<cand) return cand
  let d = (target+7-start.getUTCDay())%7; if(d===0)d=7
  cand.setUTCDate(start.getUTCDate()+d); return cand
}
async function getCurrentBlockHeight(){
  const {data}=await axios.get(`${RPC_URL}/status`); return +data.result.sync_info.latest_block_height
}
async function waitUntilHeight(target:number){
  let h=await getCurrentBlockHeight()
  while(h<target){await new Promise(r=>setTimeout(r,5_000));h=await getCurrentBlockHeight()}
}
async function getBlockTime(h:number){const b=await getBlockWithTime(h);return new Date(b.result.block.header.time)}
async function avgBlockTime(lookback=400){
  const latest=await getCurrentBlockHeight()
  const [t1,t0]=await Promise.all([getBlockTime(latest),getBlockTime(latest-lookback)])
  return (t1.getTime()-t0.getTime())/(lookback*1000)
}
async function pickNextToken():Promise<Token>{
  const {data}=await supabase.from('deadlines').select('symbol').order('deadline_date',{ascending:false}).limit(1).single()
  if(!data?.symbol) return TOKENS[0]
  const i=TOKENS.findIndex(t=>t.symbol===data.symbol); return TOKENS[(i+1)%TOKENS.length]
}
async function purgeParticipantsIfEpochStart(sym:string){
  if(sym===TOKENS[0].symbol) await supabase.from('participants').delete().neq('address','')
}
async function wipeProofsTable(){
  await supabase.from('proofs').delete().not('id','is',null)
}

/* ╭──────────────────────────────────────────────────────────────╮
 * │  ①  Fetch latest *encrypted* send-time for every creator     │
 * ╰──────────────────────────────────────────────────────────────╯ */
async function fetchEncryptedTimes(deadlineHeight:number){
  const latest = await getCurrentBlockHeight()
  const minH   = Math.max(latest-ONE_WEEK,1)
  const q      = encodeURIComponent(`tx.height>${minH} AND message.action='${ENC_TYPE_URL}'`)
  const times  = new Map<string,Date>()                       // creator → latest send-time

  for(let page=1;;page++){
    const url = `${RPC_HTTP}/tx_search?query="%22${q}%22"&order_by="desc"&per_page=${PER_PAGE}&page=${page}`
    const {data}=await axios.get(url); const txs=data.result?.txs??[]
    for(const row of txs){
      /* fast height filter */
      if(+row.height < minH) break
      /* decode msg */
      const raw  = TxRaw.decode(Buffer.from(row.tx,'base64'))
      const body = TxBody.decode(raw.bodyBytes)
      const any  = body.messages.find(m=>m.typeUrl===ENC_TYPE_URL)
      if(!any) continue
      const msg  = MsgSubmitEncryptedTx.decode(new Uint8Array(any.value))
      if(msg.targetBlockHeight!==deadlineHeight) continue

      const creator = msg.creator
      const blockT  = await getBlockTime(+row.height)
      const prev    = times.get(creator)
      if(!prev || blockT>prev) times.set(creator,blockT)      // keep LATEST
    }
    if(txs.length<PER_PAGE) break
  }
  return times                                            // may be empty
}

/* ╭──────────────────────────────────────────────────────────────╮
 * │  ②  Revealed predictions                                     │
 * ╰──────────────────────────────────────────────────────────────╯ */
interface RevealedTx{creator:string;price:number;submittedAt:Date|null}
async function fetchRevealedTxs(h:number):Promise<RevealedTx[]>{
  const out:RevealedTx[]=[]
  const blk=await getBlock(h+1)
  const evs=blk?.result?.finalize_block_events??[]
  evs.filter((e:any)=>e.type===REVEAL_EVENT_TYPES.revealed).forEach((e:any)=>{
    const attrs=e.attributes.reduce<Record<string,string>>((a:{[k:string]:string},x:any)=>(a[x.key]=x.value,a),{})
    const memoStr=attrs[REVEAL_EVENT_ATTRS.memo]; if(!memoStr) return
    let parsed:any;try{parsed=JSON.parse(memoStr)}catch{return}
    if(parsed.tag!=='price-predict')return
    const iso=parsed.memo?.submitted_at??parsed.memo?.submittedAt??null
    out.push({creator:attrs[REVEAL_EVENT_ATTRS.creator],
              price:Number(parsed.memo.prediction),
              submittedAt: iso?new Date(iso):null})
  })
  return out
}

/* ╭──────────────────────────────────────────────────────────────╮
 * │  ③  Scoring helpers                                          │
 * ╰──────────────────────────────────────────────────────────────╯ */
function multiplierForSubmission(s:Date|null,dec:Date){
  if(!s) return 1
  const open=new Date(dec);open.setUTCDate(dec.getUTCDate()-2);open.setUTCHours(0,0,0,0)
  const idx=Math.floor((s.getTime()-open.getTime())/86_400_000)
  return idx<=0?DAY_MULTIPLIERS[0]:idx===1?DAY_MULTIPLIERS[1]:DAY_MULTIPLIERS[2]
}
function inWindow(s:Date|null,dec:Date){
  if(!s) return false
  const open=new Date(dec);open.setUTCDate(dec.getUTCDate()-2);open.setUTCHours(0,0,0,0)
  return s>=open && s<=dec
}

/* ╭──────────────────────────────────────────────────────────────╮
 * │  ④  Update scores after last deadline                        │
 * ╰──────────────────────────────────────────────────────────────╯ */
async function updateScoresForLastDeadline(){
  const {data:last}=await supabase
    .from('deadlines')
    .select('deadline_date,target_block,coingecko_id,symbol')
    .lt('deadline_date',new Date().toISOString())
    .order('deadline_date',{ascending:false})
    .limit(1).single()
  if(!last) return

  await purgeParticipantsIfEpochStart(last.symbol)
  const targetHeight=+last.target_block; if(!targetHeight) return

  const decryptDate=new Date(last.deadline_date+'Z')
  let actual=await fetchPriceAt(decryptDate,last.coingecko_id)
  while(actual===0){await new Promise(r=>setTimeout(r,3_000));actual=await fetchPriceAt(decryptDate,last.coingecko_id)}

  /* ④-a  pull chain data */
  const encryptedTimes = await fetchEncryptedTimes(targetHeight)          // Map
  console.log("encryptedTimes: ",encryptedTimes);
  const revealedRaw    = (await fetchRevealedTxs(targetHeight)).filter(tx=>inWindow(tx.submittedAt??encryptedTimes.get(tx.creator)??null,decryptDate))

  if(!revealedRaw.length) return

  /* ④-b  per-creator: worst score, latest submit */
  interface Agg{price:number;submittedAt:Date|null;score:number}
  const agg=new Map<string,Agg>()
  for(const tx of revealedRaw){
    const submitTime = tx.submittedAt ?? encryptedTimes.get(tx.creator) ?? null
    const mul   = multiplierForSubmission(submitTime,decryptDate)
    const score = weekScore(tx.price,actual)*mul
    const prev  = agg.get(tx.creator)
    if(!prev || score<prev.score || (score===prev.score && submitTime && prev.submittedAt && submitTime>prev.submittedAt)){
      agg.set(tx.creator,{price:tx.price,submittedAt:submitTime,score})
    }
  }

  /* ④-c  fetch previous totals & write */
  const creators=[...agg.keys()]
  const {data:rows}=await supabase.from('participants').select('address,total_score').in('address',creators)
  const prevTotals=Object.fromEntries((rows??[]).map(r=>[r.address,+r.total_score||0]))
  const prefix = COL_PREFIX[last.symbol as Token['symbol']]

  const upserts=[...agg.entries()].map(([addr,val])=>{
    return {
      address:addr,
      total_score:(prevTotals[addr]??0)+val.score,
      [`${prefix}_guess`]:val.price,
      [`${prefix}_delta`]:Math.abs(val.price-actual),
      [`${prefix}_score`]:val.score
    }
  })
  await supabase.from('participants').upsert(upserts,{onConflict:'address'})
}

/* ╭──────────────────────────────────────────────────────────────╮
 * │  ⑤  API handler                                              │
 * ╰──────────────────────────────────────────────────────────────╯ */
export async function GET(){
  const start=new Date()
  try{
    console.log('▶ cron/update-deadline start')

    /* ensure previous decrypt finished */
    const {data:last}=await supabase.from('deadlines').select('target_block').order('deadline_date',{ascending:false}).limit(1).single()
    if(!last?.target_block) throw new Error('no previous deadline row')
    const baseH=await getCurrentBlockHeight()
    if(baseH<+last.target_block) await waitUntilHeight(+last.target_block)

    await updateScoresForLastDeadline()
    await wipeProofsTable()

    /* schedule next */
    const tokenNext=await pickNextToken()
    const deadline = getNextDeadline(start,tokenNext)

    const secPer = await avgBlockTime(400)
    const safe   = secPer*1.003        // –0.3 % early bias
    const secs   = (deadline.getTime() - (await getBlockTime(baseH)).getTime())/1000
    const target = baseH + Math.floor(secs/safe)

    await supabase.from('deadlines').upsert({
      deadline_date:deadline.toISOString(),
      target_block :target,
      coingecko_id :tokenNext.coingecko_id,
      symbol       :tokenNext.symbol
    },{onConflict:'deadline_date'})

    console.log(`✅ ${deadline.toISOString()} → ${tokenNext.symbol} @ block ${target}`)
    return NextResponse.json({success:true,deadline:deadline.toISOString(),targetBlock:target,token:tokenNext.coingecko_id,symbol:tokenNext.symbol})
  }catch(e:any){
    console.error('❌ cron/update-deadline failed',e)
    return NextResponse.json({error:e.message},{status:500})
  }
}
