/* app/leaderboard/page.tsx */
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'graz'
import { Copy, Menu, X as CloseIcon, Wallet }  from 'lucide-react'; 
import Header         from '@/components/header/Header'
import CountdownClock from '@/components/countdown-timer/CountdownClock'
import { Input }      from '@/components/ui/input'
import { Button }     from '@/components/ui/button'

/* ─── types from /api/winner ─────────────────────────────────────── */
type OverallRow = { address: string; totalScore: number }
type TokenRow   = { address: string; guess: number; delta: number; score: number }
type TokenMeta  = { price:number|null; date:string|null; url:string|null; block:number|null }

type ApiResp = {
  overall   : OverallRow[]
  tokens    : Record<'SOL'|'BTC'|'ETH'|'LINK', TokenRow[]>
  tokenInfo : Record<'SOL'|'BTC'|'ETH'|'LINK', TokenMeta>
}

/* ─── extra type for claiming ────────────────────────────────────── */
type PendingProof = { token: string; createdAt: string }

/* ─── constants ─────────────────────────────────────────────────── */
const TOKENS  = ['SOL','BTC','ETH','LINK'] as const
const SLIDES  = ['Overall', ...TOKENS] as const
type SlideKey = typeof SLIDES[number]

/* ─── helpers ───────────────────────────────────────────────────── */
const longShort = (addr:string) => addr.slice(0,10)+'…'+addr.slice(-6)
const medals    = ['🥇','🥈','🥉'] as const

const fmtPrice = (n:number|null) => n===null ? '—'
  : new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)

const fmtDateUTC = (iso:string|null) => {
  if(!iso) return '—'
  const d = new Date(iso)
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
  return `${String(d.getUTCDate()).padStart(2,'0')} ${m} ${d.getUTCFullYear()}`
}
const fmtBlock = (b:number|null) => b===null ? '—' : 'Block #'+b.toLocaleString()
const Bullet   = () => <span className="text-gray-400">•</span>

/* ─── component ─────────────────────────────────────────────────── */
export default function LeaderboardPage() {
  const { data: account } = useAccount()

  const [active,setActive]   = useState<SlideKey>('Overall')
  const [loading,setLoading] = useState(true)

  const [overall,setOverall] = useState<OverallRow[]>([])
  const [tokens,setTokens]   = useState<ApiResp['tokens']>({SOL:[],BTC:[],ETH:[],LINK:[]})
  const [meta,setMeta]       = useState<ApiResp['tokenInfo']>({
    SOL:{price:null,date:null,url:null,block:null},
    BTC:{price:null,date:null,url:null,block:null},
    ETH:{price:null,date:null,url:null,block:null},
    LINK:{price:null,date:null,url:null,block:null}
  })

  /* tweet‑claim state */
  const [pending,setPending]   = useState<PendingProof|null>(null)
  const [tweetUrl,setTweetUrl] = useState('')
  const [claiming,setClaiming] = useState(false)
  const [claimed,setClaimed]   = useState(false)
  const [claimErr,setClaimErr] = useState<string|null>(null)

  /* fetch leaderboard once */
  useEffect(()=>{
    (async()=>{
      setLoading(true)
      try{
        const res = await fetch('/api/winner',{cache:'no-store'})
        const js  = await res.json()
        if(!res.ok) throw new Error(js.error||'failed')
        setOverall(js.overall); setTokens(js.tokens); setMeta(js.tokenInfo)
      }catch(e){console.error(e)}finally{setLoading(false)}
    })()
  },[])

  /* fetch pending token */
  useEffect(()=>{
    setPending(null)
    if(!account?.bech32Address) return
    fetch(`/api/twitter/pending?wallet=${account.bech32Address}`)
      .then(async r=>r.ok?r.json():{})
      .then(js=>{ if(js.token) setPending(js as PendingProof) })
      .catch(console.error)
  },[account?.bech32Address])

  /* claim handler */
  const handleClaim = async ()=>{
    if(!pending||!tweetUrl||!account?.bech32Address) return
    setClaimErr(null); setClaiming(true)
    try{
      const res = await fetch('/api/twitter/verify',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({wallet:account.bech32Address, token:pending.token, url:tweetUrl})
      })
      if(!res.ok){ const {error}=await res.json(); throw new Error(error||'failed')}
      setClaimed(true); setPending(null)
      /* refresh points */
      fetch('/api/winner',{cache:'no-store'}).then(r=>r.json()).then(j=>setOverall(j.overall))
    }catch(e:any){setClaimErr(e.message)}finally{setClaiming(false)}
  }

  /* my rank/score */
  const me = useMemo(()=>{
    if(!account?.bech32Address) return {rank:'—',points:'—'}
    const idx = overall.findIndex(r=>r.address===account.bech32Address)
    return idx===-1?{rank:'—',points:'—'}:{rank:idx+1,points:overall[idx].totalScore}
  },[overall,account?.bech32Address])

  /* table rows */
  const rows = active==='Overall'
    ? overall.map(r=>({address:r.address,cols:[r.totalScore.toLocaleString()]}))
    : tokens[active as keyof typeof tokens].map(r=>({
        address:r.address,
        cols:[r.score.toLocaleString(),r.guess.toLocaleString(),r.delta.toLocaleString()]
      }))

  const headers:Record<SlideKey,string[]> = {
    Overall:['Total Pts'],
    SOL:['Score','Guess','Δ'],
    BTC:['Score','Guess','Δ'],
    ETH:['Score','Guess','Δ'],
    LINK:['Score','Guess','Δ']
  }

  const current  = active!=='Overall' ? meta[active as keyof typeof meta] : null
  const avatar   = account?.bech32Address
    ? `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(account.bech32Address)}`
    : null

  /* responsive grid logic */
  const showClaim  = pending && !claimed
  const showBanner = claimed
  const gridCols   = showClaim || showBanner ? 'md:grid-cols-3' : 'md:grid-cols-2'

  /* ────────────────── JSX ───────────────────────────────────────── */
  return(
    <div className="font-sans bg-gray-50 min-h-screen">
      <Header/>

      <main className="max-w-6xl mx-auto px-4 pt-12 space-y-12">

        {/* top panel grid */}
        <div className={`grid gap-8 grid-cols-1 ${gridCols}`}>

          <CountdownClock className="h-full"/>

          {/* wallet card */}
          <div className="bg-white rounded-2xl shadow p-8 flex flex-col items-center">
            {avatar
                      ? (
                            <img
                              src={avatar}
                              alt="avatar"
                              className="h-20 w-20 rounded-full mb-4"
                            />
                          )
                        : (
                            <div className="h-20 w-20 rounded-full bg-gray-100 shadow-inner mb-4 flex items-center justify-center">
                              <Wallet size={34} className="text-gray-400" />
                            </div>
                          )
            }
            <div className="text-md font-medium break-all text-center">
              {account?.bech32Address ? longShort(account.bech32Address) : 'Connect wallet'}
            </div>

            <div className="flex w-full mt-5 text-center border-t border-gray-200 pt-5">
              <div className="flex-1">
                <p className="text-gray-500 text-xs">Rank</p>
                <p className="text-lg font-semibold">{loading?'—':me.rank}</p>
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs">Points</p>
                <p className="text-lg font-semibold">{loading?'—':me.points}</p>
              </div>
            </div>
          </div>

          {/* claim panel */}
          {showClaim && (
            <div className="bg-white rounded-2xl shadow p-6 flex flex-col space-y-4">
              <h3 className="text-base font-semibold">Claim 200 pts</h3>
              <p className="text-xs text-gray-600">Paste the tweet URL below.</p>

              <Input
                value={tweetUrl}
                onChange={e=>setTweetUrl(e.target.value)}
                placeholder="https://twitter.com/…/status/…"
              />

              <Button
                disabled={!tweetUrl||claiming}
                onClick={handleClaim}
                className="w-full text-sm"
              >
                {claiming ? 'Verifying…' : 'Verify & Collect'}
              </Button>

              {claimErr && <p className="text-xs text-red-600">{claimErr}</p>}
            </div>
          )}

          {/* success banner */}
          {showBanner && (
            <div className="bg-green-50 text-green-800 rounded-2xl shadow flex items-center justify-center p-6 text-sm">
               Verified! 200 points added.
            </div>
          )}
        </div>

        {/* slide tabs */}
        <div className="flex justify-center gap-2">
          {SLIDES.map(k=>(
            <button key={k} onClick={()=>setActive(k)}
              className={`px-4 py-1 rounded-full text-sm transition
                ${active===k ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow'}`}>
              {k}
            </button>
          ))}
        </div>

        {/* price badge */}
        {current && (
          <div className="flex justify-center mb-2">
            <a href={current.url ?? '#'} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                          bg-white/70 backdrop-blur ring-1 ring-gray-300/70 shadow-sm
                          text-gray-700 hover:text-gray-900">
              <span>Price on {fmtDateUTC(current.date)} UTC</span><Bullet/>
              <span className="tabular-nums">{fmtBlock(current.block)}</span><Bullet/>
              <span className="tabular-nums font-semibold">{fmtPrice(current.price)}</span>
            </a>
          </div>
        )}

        {/* leaderboard table */}
        <section className="overflow-x-auto shadow ring-1 ring-gray-200 rounded-2xl bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Address</th>
                {headers[active].map(h=>(
                  <th key={h} className="px-4 py-3 text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0,50).map((r,i)=>(
                <tr key={r.address} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2">{i<medals.length?medals[i]:i+1}</td>
                  <td className="px-4 py-2 font-mono break-all">{longShort(r.address)}</td>
                  {r.cols.map((c,idx)=>(
                    <td key={idx} className="px-4 py-2 text-right tabular-nums">{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}
