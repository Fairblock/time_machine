'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLastToken } from '../../hooks/useActiveToken';

type LeaderboardEntry = {
  address: string
  totalPoints: number
  lastPrediction?: number
  lastPoints?: number
  delta?: number | null
}

export default function LeaderboardDisplay() {
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([])
  const [solPrice, setSolPrice] = useState<number | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [symbol, setSymbol] = useState<string | null>(null)

  /* ── fetch once on mount ─────────────────────────────────────────── */
  useEffect(() => {
    async function fetchLeaderboard() {
      const { data } = await axios.get('/api/winner')
      setEntries(data.leaderboard)
      setSolPrice(data.lastFridayPrice)
      setToken(data.token)
      setSymbol(data.symbol)
    }
    fetchLeaderboard()
  }, [])

  /* ── small helpers ───────────────────────────────────────────────── */
  const medals = ['🥇', '🥈', '🥉']

  const rowBg = (idx: number) =>
    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'

  const deltaColor = (delta: number) =>
    delta <= 5 ? 'text-green-600' : delta <= 15 ? 'text-yellow-500' : 'text-red-600'

  /* ── render ──────────────────────────────────────────────────────── */
  return (
    <div className="w-full overflow-x-auto">
      <h2 className="text-2xl font-semibold mb-4 text-center">Leaderboard</h2>

      {solPrice !== null && (
        <p className="text-sm text-center text-gray-600 mb-6">
          Last Friday&nbsp;{symbol}&nbsp;Price:&nbsp;
          <span className="font-semibold">${solPrice}</span>
        </p>
      )}

      {entries.length === 0 ? (
        <p className="text-center text-gray-500">No entries yet.</p>
      ) : (
        <table className="min-w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
          <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Total&nbsp;Points</th>
              <th className="px-4 py-3">Last&nbsp;Prediction</th>
              <th className="px-4 py-3">Δ&nbsp;vs&nbsp;price</th>
              <th className="px-4 py-3">Last&nbsp;Score</th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry, idx) => {
              const delta = entry.delta
                  

              return (
                <tr key={entry.address} className={rowBg(idx)}>
                  <td className="px-4 py-3 font-medium">
                    {medals[idx] ? <img src={medals[idx]} className="h-4 w-4"/> : idx + 1}
                  </td>

                  <td className="px-4 py-3 font-mono break-all">
                    {entry.address}
                  </td>

                  <td className="px-4 py-3">{entry.totalPoints}</td>

                  <td className="px-4 py-3">
                    {entry.lastPrediction !== undefined ? `$${entry.lastPrediction}` : '—'}
                  </td>

                  <td className="px-4 py-3">
                    {delta !== null ? (
                      <span className={deltaColor(delta)}>
                        {delta === 0 ? '✔ Perfect' : `±$${delta}`}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {entry.lastPoints !== undefined ? entry.lastPoints : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
