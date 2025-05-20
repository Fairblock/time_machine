'use client'

import { useAccount } from 'graz'
import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/header/Header'
import CountdownClock from '@/components/countdown-timer/CountdownClock'
import LeaderboardDisplay from '@/components/winner-display/WinnerDisplay'

type LBRow = { address: string; totalPoints: number }

export default function LeaderboardPage() {
  const { data: account } = useAccount()

  /* ── local state for this wallet’s stats ─────────────────────────── */
  const [rank, setRank] = useState<number | null>(null)
  const [points, setPoints] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  /* ── fetch leaderboard & find this user ─────────────────────────── */
  useEffect(() => {
    if (!account?.bech32Address) {
      setRank(null)
      setPoints(null)
      setLoading(false)
      return
    }

    const fetchStats = async () => {
      setLoading(true)
      try {
        const res  = await fetch('/api/winner', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'failed to fetch leaderboard')

        const lb: LBRow[] = json.leaderboard
        const idx = lb.findIndex(r => r.address === account.bech32Address)
        if (idx !== -1) {
          setRank(idx + 1)
          setPoints(lb[idx].totalPoints)
        } else {
          setRank(null)
          setPoints(null)
        }
      } catch (err) {
        console.error(err)
        setRank(null)
        setPoints(null)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [account?.bech32Address])

  /* ── UI helpers ──────────────────────────────────────────────────── */
  const truncated = account?.bech32Address
    ? `${account.bech32Address.slice(0, 6)}…${account.bech32Address.slice(-4)}`
    : 'Not connected'

  const rankDisplay   = loading ? '—' : rank   ?? '—'
  const pointsDisplay = loading ? '—' : points ?? '—'

  /* ── fixed non-human style for all users ─────────────────────────── */
  const avatarUrl = useMemo(() => {
    if (!account?.bech32Address) return null
    const version = '9.x'
    const style   = 'identicon'            // <— same style for everyone
    const seed    = encodeURIComponent(account.bech32Address)
    return `https://api.dicebear.com/${version}/${style}/svg?seed=${seed}`
  }, [account?.bech32Address])

  return (
    <div className="font-sans bg-gradient-to-b from-white to-gray-100 min-h-screen">
      <Header />
      <main className="flex flex-col items-center px-4 max-w-6xl mx-auto pt-12 space-y-12 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <CountdownClock />

          <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center border border-gray-200">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User avatar"
                className="rounded-full bg-gray-200 h-20 w-20 mb-4"
              />
            ) : (
              <div className="rounded-full bg-gray-200 h-20 w-20 mb-4 flex items-center justify-center">
                <span className="text-gray-500 text-xl font-mono">⚡</span>
              </div>
            )}

            <div className="text-lg font-semibold break-all">{truncated}</div>

            <div className="flex justify-around w-full mt-4 border-t border-gray-200 pt-4 text-center">
              <div>
                <p className="text-sm text-gray-500">Your rank</p>
                <p className="text-xl font-semibold">{rankDisplay}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Points</p>
                <p className="text-xl font-semibold">{pointsDisplay}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="w-full bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
          <LeaderboardDisplay />
          <div className="flex justify-center mt-6">
            <button className="text-sm px-4 py-2 border rounded hover:bg-gray-100 transition">
              Load more
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
