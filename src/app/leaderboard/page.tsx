'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useAccount }   from 'graz'

import Header          from '@/components/header/Header'
import CountdownClock  from '@/components/countdown-timer/CountdownClock'

/* ─────────────────────── types coming from /api/winner ───────────── */
type OverallRow = { address: string; totalScore: number }
type TokenRow   = { address: string; guess: number; delta: number; score: number }
type TokenMeta  = { price:number|null; date:string|null; url:string|null; block:number|null }

type ApiResp = {
  overall   : OverallRow[]
  tokens    : Record<'SOL'|'BTC'|'ETH'|'LINK', TokenRow[]>
  tokenInfo : Record<'SOL'|'BTC'|'ETH'|'LINK', TokenMeta>
}

/* ─────────────────────── constants ───────────────────────────────── */
const TOKENS    = ['SOL','BTC','ETH','LINK'] as const
const SLIDES    = ['Overall', ...TOKENS] as const
type SlideKey   = typeof SLIDES[number]

/* ─────────────────────── utilities ───────────────────────────────── */
const longShort = (addr:string) => addr.slice(0,10) + '…' + addr.slice(-6)
const medals    = ['🥇','🥈','🥉'] as const

const fmtPrice = (n:number|null) =>
  n === null ? '—'
             : new Intl.NumberFormat(undefined,{
                 style:'currency',currency:'USD',
                 maximumFractionDigits:2,minimumFractionDigits:2
               }).format(n)

const fmtDateUTC = (iso:string|null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const y = d.getUTCFullYear()
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]
  const day = String(d.getUTCDate()).padStart(2,'0')
  return `${day} ${m} ${y}`
}

const fmtBlock = (b:number|null) =>
  b === null ? '—' : 'Block #'+b.toLocaleString()

/* visually neutral bullet separator */
const Bullet = () => <span className="text-gray-400 select-none">•</span>

/* ─────────────────────── page component ──────────────────────────── */
export default function LeaderboardPage() {
  const { data: account } = useAccount()

  const [active,setActive]   = useState<SlideKey>('Overall')
  const [loading,setLoading] = useState(true)

  const [overall,setOverall] = useState<OverallRow[]>([])
  const [tokens,setTokens]   = useState<ApiResp['tokens']>({
    SOL:[],BTC:[],ETH:[],LINK:[]
  })
  const [meta,setMeta]       = useState<ApiResp['tokenInfo']>({
    SOL:{price:null,date:null,url:null,block:null},
    BTC:{price:null,date:null,url:null,block:null},
    ETH:{price:null,date:null,url:null,block:null},
    LINK:{price:null,date:null,url:null,block:null}
  })

  /* ─ fetch leaderboard once ─ */
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/winner', { cache:'no-store' })
        const js  = await res.json()
        if (!res.ok) throw new Error(js?.error || 'failed')
        setOverall(js.overall)
        setTokens(js.tokens)
        setMeta(js.tokenInfo)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  /* ─ my rank & score ─ */
  const me = useMemo(() => {
    if (!account?.bech32Address) return { rank:'—', points:'—' }
    const idx = overall.findIndex(r => r.address === account.bech32Address)
    return idx === -1 ? { rank:'—', points:'—' }
                      : { rank:idx+1, points:overall[idx].totalScore }
  }, [overall, account?.bech32Address])

  const avatarUrl = useMemo(() => {
    if (!account?.bech32Address) return null
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(account.bech32Address)}`
  }, [account?.bech32Address])

  /* ─ rows for active slide ─ */
  const rows = active === 'Overall'
    ? overall.map(r => ({ address:r.address, cols:[r.totalScore.toLocaleString()] }))
    : tokens[active as keyof typeof tokens].map(r => ({
        address:r.address,
        cols:[
          r.score.toLocaleString(),
          r.guess.toLocaleString(),
          r.delta.toLocaleString()
        ]
      }))

  const headers: Record<SlideKey,string[]> = {
    Overall:['Total Pts'],
    SOL:['Score','Guess','Δ'],
    BTC:['Score','Guess','Δ'],
    ETH:['Score','Guess','Δ'],
    LINK:['Score','Guess','Δ']
  }

  const current = active!=='Overall' ? meta[active as keyof typeof meta] : null

  /* ─────────── render ─────────── */
  return (
    <div className="font-sans bg-gray-50 min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-12 space-y-12">

        {/* header grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CountdownClock />

          <div className="bg-white rounded-2xl shadow flex flex-col items-center p-8">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="h-24 w-24 rounded-full mb-4"/>
              : <div className="h-24 w-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center text-3xl">⚡</div>
            }
            <div className="text-lg font-medium break-all text-center">
              {account?.bech32Address ? longShort(account.bech32Address) : 'Connect your wallet'}
            </div>

            <div className="flex w-full mt-6 text-center border-t border-gray-200 pt-6">
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Rank</p>
                <p className="text-xl font-semibold">{loading?'—':me.rank}</p>
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Points</p>
                <p className="text-xl font-semibold">{loading?'—':me.points}</p>
              </div>
            </div>
          </div>
        </div>

        {/* slide tabs */}
        <div className="flex justify-center gap-2">
          {SLIDES.map(k => (
            <button
              key={k}
              onClick={() => setActive(k)}
              className={`px-4 py-1 rounded-full text-sm transition
                ${active===k
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
                }`}
            >
              {k}
            </button>
          ))}
        </div>

        {/* badge with price / block / date */}
        {current && (
          <div className="flex justify-center mb-2">
            <a
              href={current.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="
                inline-flex items-center gap-2
                px-3 py-1 rounded-full
                bg-white/70 backdrop-blur
                ring-1 ring-gray-300/70 shadow-sm
                text-gray-700 hover:text-gray-900
                transition
              "
            >
              <span className="font-normal">
                Price&nbsp;on&nbsp;{fmtDateUTC(current.date)} UTC
              </span>
              <Bullet />
              <span className="tabular-nums font-medium">{fmtBlock(current.block)}</span>
              <Bullet />
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
                {headers[active].map(h => (
                  <th key={h} className="px-4 py-3 text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0,50).map((r,i)=>(
                <tr key={r.address} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2">
                    {i < medals.length ? medals[i] : i+1}
                  </td>
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
