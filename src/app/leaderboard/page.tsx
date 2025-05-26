'use client'

import { useAccount } from 'graz'
import { useEffect, useMemo, useState } from 'react'
import Header          from '@/components/header/Header'
import CountdownClock  from '@/components/countdown-timer/CountdownClock'

type OverallRow = { address: string; totalScore: number }
type TokenRow   = { address: string; guess: number; delta: number; score: number }
type TokenMeta  = { price:number|null, date:string|null, url:string|null }

type ApiResp = {
  overall   : OverallRow[]
  tokens    : Record<'SOL'|'BTC'|'ETH'|'LINK', TokenRow[]>
  tokenInfo : Record<'SOL'|'BTC'|'ETH'|'LINK', TokenMeta>
}

const TOKENS    = ['SOL', 'BTC', 'ETH', 'LINK'] as const
const SLIDES    = ['Overall', ...TOKENS] as const
type SlideKey   = typeof SLIDES[number]

/* ───────────────────────────────────  util */
const longShort = (addr: string) => addr.slice(0,10) + '…' + addr.slice(-6)
const medals    = ['🥇','🥈','🥉'] as const
const fmtPrice = (n: number|null) =>
  n === null ? '—'
             : new Intl.NumberFormat(undefined, {
                 style: 'currency',
                 currency: 'USD',
                 maximumFractionDigits: 2,   // ← show at most 2 decimals
                 minimumFractionDigits: 2    // ← pad with .00 if needed
               }).format(n)

const fmtDate   = (s: string|null) =>
  s ? new Date(s).toLocaleDateString(undefined,{ year:'numeric', month:'short', day:'numeric' }) : '—'

/* ───────────────────────────────────  Page */
export default function LeaderboardPage() {
  const { data: account } = useAccount()

  const [active,   setActive]   = useState<SlideKey>('Overall')
  const [loading,  setLoading]  = useState(true)
  const [overall,  setOverall]  = useState<OverallRow[]>([])
  const [tokens,   setTokens]   = useState<ApiResp['tokens']>({
    SOL:[],BTC:[],ETH:[],LINK:[]
  })
  const [meta,     setMeta]     = useState<ApiResp['tokenInfo']>({
    SOL:{price:null,date:null,url:null},
    BTC:{price:null,date:null,url:null},
    ETH:{price:null,date:null,url:null},
    LINK:{price:null,date:null,url:null}
  })

  /* fetch once */
  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/winner', { cache:'no-store' })
        const js  = await res.json()
        if (!res.ok) throw new Error(js?.error || 'fail')
        setOverall(js.overall)
        setTokens(js.tokens)
        setMeta(js.tokenInfo)
      } catch (e) { console.error(e) }
      finally     { setLoading(false) }
    })()
  }, [])

  /* user’s rank & score from overall board */
  const me = useMemo(() => {
    if (!account?.bech32Address) return { rank:'—', points:'—' }
    const idx = overall.findIndex(r => r.address === account.bech32Address)
    return idx === -1
      ? { rank:'—', points:'—' }
      : { rank: idx+1, points: overall[idx].totalScore }
  }, [overall, account?.bech32Address])

  const avatarUrl = useMemo(() => {
    if (!account?.bech32Address) return null
    const seed = encodeURIComponent(account.bech32Address)
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}`
  }, [account?.bech32Address])

  /* pick rows for current slide */
  const rows = active === 'Overall'
    ? overall.map(r => ({
        cols: [r.totalScore.toLocaleString()],
        address: r.address
      }))
    : tokens[active as keyof typeof tokens].map(r => ({
        cols: [
          r.score.toLocaleString(),
          r.guess.toLocaleString(),
          r.delta.toLocaleString()
        ],
        address: r.address
      }))

  /* column headers per slide */
  const headers: Record<SlideKey,string[]> = {
    Overall: ['Total Pts'],
    SOL:['Score','Guess','Δ'],
    BTC:['Score','Guess','Δ'],
    ETH:['Score','Guess','Δ'],
    LINK:['Score','Guess','Δ']
  }

  /* meta for current token slide */
  const currentMeta = active !== 'Overall'
    ? meta[active as keyof typeof meta]
    : null

  return (
    <div className="font-sans bg-gray-50 min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-12 space-y-12">
        {/* top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <CountdownClock />

          <div className="bg-white rounded-2xl shadow flex flex-col items-center p-8">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="h-24 w-24 rounded-full mb-4" />
              : <div className="h-24 w-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center text-3xl">⚡</div>
            }
            <div className="text-lg font-medium break-all text-center">
              {account?.bech32Address ? longShort(account.bech32Address) : 'Not connected'}
            </div>

            <div className="flex w-full mt-6 text-center border-t border-gray-200 pt-6">
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Rank</p>
                <p className="text-xl font-semibold">{loading ? '—' : me.rank}</p>
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-sm">Points</p>
                <p className="text-xl font-semibold">{loading ? '—' : me.points}</p>
              </div>
            </div>
          </div>
        </div>

        {/* slide selector */}
        <div className="flex justify-center gap-2">
          {SLIDES.map(key => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`px-4 py-1 rounded-full text-sm transition
                ${active===key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow'
                }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* price badge for token slides */}
        {currentMeta && (
          <p className="text-center text-sm text-gray-600 mb-1">
            <a
              href={currentMeta.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-gray-800"
            >
              Price on {fmtDate(currentMeta.date)}: {fmtPrice(currentMeta.price)}
            </a>
          </p>
        )}

        {/* table */}
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
              {rows.slice(0,50).map((r, i) => (
                <tr key={r.address} className="odd:bg-white even:bg-gray-50">
                  {/* medal or rank */}
                  <td className="px-4 py-2">
                    {i < medals.length ? medals[i] : i + 1}
                  </td>

                  {/* address */}
                  <td className="px-4 py-2 font-mono break-all">{longShort(r.address)}</td>

                  {/* numeric columns */}
                  {r.cols.map((c, idx) => (
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
