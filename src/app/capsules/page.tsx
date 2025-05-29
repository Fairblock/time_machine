'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useAccount } from 'graz'
import { useConnect, useSuggestChainAndConnect, WalletType } from 'graz'
import { TxRaw, TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { Buffer } from 'buffer'

import Header from '@/components/header/Header'
import { fairyring } from '@/constant/chains'
import { FAIRYRING_ENV } from '@/constant/env'
import { MsgSubmitEncryptedTx } from '@/types/fairyring/codec/pep/tx'
import { getCurrentBlockHeight } from '@/services/fairyring/block'
import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from '@/constant/events'

/* ───── tiny helper: block_results (light) ──────────────────────── */
async function getBlockResults(height: number) {
  return fetch(`${RPC}/block_results?height=${height}`).then((r) => r.json())
}

/* ───── types ───────────────────────────────────────────────────── */
type Capsule = {
  creator: string
  target : number
  token  : string
  type   : 'encrypted' | 'revealed'
  data?  : string
  price? : number
}

/* ───── constants ──────────────────────────────────────────────── */
const MEMO      = 'price-predict'
const PER_PAGE  = 100
const RPC       = FAIRYRING_ENV.rpcURL.replace(/^ws/, 'http')
const ONE_WEEK  = 403_200          // Tendermint blocks (~7 days)

/* ───── UI helpers (unchanged) ─────────────────────────────────── */
const TOKEN_LOGOS: Record<string, string> = {
  SOL : '/sol.png',
  BTC : '/btc.png',
  ETH : '/eth.png',
  LINK: '/link.png',
}
const avatar = (addr: string) =>
  `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(addr)}`

/* ───── capsule card ─────────────────────────────────────────────── */

function CapsuleCard({ creator, target, token, type, data, price }: Capsule) {
  const shortAddr = `${creator.slice(0, 6)}…${creator.slice(-4)}`
  const tail      = data ? `…${data.slice(-6)}` : '—'
  const logo      = TOKEN_LOGOS[token.toUpperCase()] ?? null

  return (
    <div className="rounded-3xl border border-gray-200 shadow-md overflow-hidden bg-gradient-to-b from-white to-gray-50">
      {/* header */}
      <div className="flex items-center gap-3 bg-[#F3F8FE] px-5 py-4">
        <img src={avatar(creator)} alt="" className="h-11 w-11 rounded" />
        <span className="font-mono text-sm text-gray-700">{shortAddr}</span>
      </div>

      {/* body */}
      <div className="p-5 space-y-3">
        <p className="text-sm font-medium text-gray-600">Predicted price</p>

        {/* value box */}
        <div className="relative flex items-center bg-white/60 border border-gray-300 rounded-lg px-4 py-3">
          {type === 'encrypted' ? (
            <>
          
              <span className="ml-auto inline-block rounded-full bg-gray-200 px-8 py-0.5 text-[15px] font-semibold text-gray-600">
                Encrypted
              </span>
            </>
          ) : (
            <span className="mr-auto text-2xl font-semibold text-gray-900">
              ${price?.toLocaleString()}
            </span>
          )}

          {/* token logo (always sharp) */}
          {logo && (
            <Image
              src={logo}
              alt={token}
              width={36}
              height={36}
              className="flex-shrink-0 rounded-full ring-2 ring-gray-200 ml-3"
            />
          )}
        </div>

        <div className="text-xs text-gray-400 text-right">#{target}</div>
      </div>
    </div>
  )
}




/* ───── revealed-tx helper (parallel & correct events) ─────────── */
async function fetchRevealedTxs(heights: number[]) {
  const out: { creator: string; price: number }[] = []

  await Promise.all(
    heights.map(async (h) => {
      const res = await getBlockResults(h + 1)
      const events =
        res?.result?.finalize_block_events ?? res?.result?.end_block_events
      if (!events) return

      events
        .filter((e: any) => e.type === REVEAL_EVENT_TYPES.revealed)
        .forEach((e: any) => {
          const attrs = e.attributes.reduce<Record<string, string>>((acc, x) => {
            acc[x.key] = x.value
            return acc
          }, {})

          const memoStr = attrs[REVEAL_EVENT_ATTRS.memo]
          if (!memoStr) return

          let parsed: any
          try {
            parsed = JSON.parse(memoStr)
          } catch {
            return
          }
          if (parsed.tag !== MEMO) return

          out.push({
            creator: attrs[REVEAL_EVENT_ATTRS.creator],
            price  : Number(parsed.memo.prediction),
          })
        })
    }),
  )
  return out
}

/* ───── main page component ────────────────────────────────────── */
export default function CapsulesPage() {
  const { data: account }      = useAccount()
  const { error: walletError } = useConnect()
  const { suggestAndConnect }  = useSuggestChainAndConnect()

  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [loading,  setLoading ] = useState(true)
  const [tab,      setTab]     = useState<'all' | 'yours'>('all')

  /* auto-connect */
  useEffect(() => {
    if (walletError) {
      suggestAndConnect({ chainInfo: fairyring, walletType: WalletType.KEPLR })
    }
  }, [walletError, suggestAndConnect])

  /* main fetch */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const next = await fetch('/api/deadline/next').then((r) => r.json())
        const last = await fetch('/api/deadline/last').then((r) => r.json())

        const nextH     = Number(next?.nextDeadline?.target_block)
        const nextToken = next?.nextDeadline?.symbol ?? next?.nextDeadline?.token ?? '—'

        const lastH     = Number(last?.lastDeadline?.target_block)
        const lastToken = last?.lastDeadline?.symbol ?? last?.lastDeadline?.token ?? '—'

        if (!nextH || !lastH) throw new Error('deadline heights missing')

        /* 1️⃣ encrypted capsules (height-bounded message query) */
        const encryptedCaps: Capsule[] = []
        const now       = await getCurrentBlockHeight()
        const minHeight = now - ONE_WEEK
        const q = encodeURIComponent(
          `tx.height>${minHeight} AND message.action='/fairyring.pep.MsgSubmitEncryptedTx'`
        )

        let page = 1
        while (!cancelled) {
          const res = await fetch(
            `${RPC}/tx_search?query=%22${q}%22&order_by=%22desc%22&per_page=${PER_PAGE}&page=${page}`
          ).then((r) => r.json())

          const txs = res.result?.txs ?? []
          for (const row of txs) {
            const raw  = TxRaw.decode(Buffer.from(row.tx, 'base64'))
            const body = TxBody.decode(raw.bodyBytes)

            const anyMsg = body.messages.find(
              (m) => m.typeUrl === '/fairyring.pep.MsgSubmitEncryptedTx',
            )
            if (!anyMsg) continue

            const msg = MsgSubmitEncryptedTx.decode(new Uint8Array(anyMsg.value))
            if (msg.targetBlockHeight !== nextH) continue   // filter to this deadline

            encryptedCaps.push({
              creator: msg.creator,
              target : nextH,
              token  : nextToken,
              type   : 'encrypted' as const,
              data   : msg.data,
            })
          }
          if (txs.length < PER_PAGE) break
          page += 1
        }

        /* 2️⃣ revealed capsules */
        const revealedTxs  = await fetchRevealedTxs([lastH])
        const revealedCaps: Capsule[] = revealedTxs.map((tx): Capsule => ({
          creator: tx.creator,
          target : lastH,
          token  : String(lastToken),
          type   : 'revealed' as const,
          price  : tx.price,
        }))

        if (!cancelled) {
            const merged = [...encryptedCaps, ...revealedCaps]
            const uniqueMap = new Map<string, Capsule>()
          
            for (const c of merged) {
              uniqueMap.set(`${c.type}-${c.creator}-${c.target}`, c)
            }
          
            setCapsules(Array.from(uniqueMap.values()))
          }
      } catch (err) {
        console.error(err)
        if (!cancelled) setCapsules([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const list =
    tab === 'all'
      ? capsules
      : capsules.filter((c) => c.creator === account?.bech32Address)

  /* UI */
  return (
    <div className="font-sans bg-gradient-to-b from-white to-gray-100 min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold text-center uppercase tracking-wide">
          Encrypted Capsules
        </h1>

        <div className="flex justify-center space-x-6 border-b pb-2 text-sm font-medium">
          {(['all', 'yours'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                tab === t
                  ? 'text-black border-b-2 border-black pb-1'
                  : 'text-gray-500'
              }
            >
              {t === 'all' ? 'All' : 'Yours'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {list.length ? (
            list.map((c, i) => (
              <CapsuleCard key={`${c.target}-${c.creator}-${i}`} {...c} />
            ))
          ) : loading ? (
            <p className="text-center text-gray-400 col-span-full mt-12">
              Loading capsules…
            </p>
          ) : (
            <p className="text-center text-gray-400 col-span-full mt-12">
              No capsules found.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
