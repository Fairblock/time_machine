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
import { getBlock, getCurrentBlockHeight } from '@/services/fairyring/block'
import { REVEAL_EVENT_TYPES, REVEAL_EVENT_ATTRS } from '@/constant/events'

/* ───── types ─────────────────────────────────────────────────────── */
type Capsule = {
  creator: string
  target : number
  token  : string
  type   : 'encrypted' | 'revealed'
  data?  : string
  price? : number
}

/* ───── constants ────────────────────────────────────────────────── */
const MEMO     = 'price-predict'
const PER_PAGE = 100
const RPC      = FAIRYRING_ENV.rpcURL.replace(/^ws/, 'http')

/* ───── UI card ──────────────────────────────────────────────────── */
/* ───── helpers (unchanged) ─────────────────────────────────────── */
const TOKEN_LOGOS: Record<string, string> = {
  SOL : '/sol.png',
  BTC : '/btc.png',
  ETH : '/eth.png',
  LINK: '/link.png',
};
const avatar = (addr: string) =>
  `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(addr)}`

/* ───── stylish card ────────────────────────────────────────────── */
function CapsuleCard({ creator, target, token, type, data, price }: Capsule) {
  const shortAddr = `${creator.slice(0, 6)}…${creator.slice(-4)}`
  const preview   =
    data && data.length > 64 ? `${data.slice(0, 64)}…` : data ?? ''
  const logo = TOKEN_LOGOS[token.toUpperCase()] ?? null
  const value = type === 'encrypted' ? preview : `$${price?.toLocaleString()}`

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

        {/* value row */}
        <div className="flex items-center justify-between bg-white/60 border border-gray-300 rounded-lg px-4 py-3">
          {/* text */}
          <span
            className={
              type === 'encrypted'
                ? 'font-mono text-xs break-all leading-snug text-gray-700 max-w-[70%] mr-3'
                : 'text-2xl font-semibold text-gray-900'
            }
          >
            {value}
          </span>

          {/* icon */}
          {logo && (
            <Image
              src={logo}
              alt={token}
              width={36}
              height={36}
              className="flex-shrink-0 rounded-full ring-2 ring-gray-200"
            />
          )}
        </div>

        {/* tiny footer */}
        <div className="text-xs text-gray-400 text-right">#{target}</div>
      </div>
    </div>
  )
}



/* ───── helper: fetch revealed txs ───────────────────────────────── */
async function fetchRevealedTxs(heights: number[]) {
  const out: { creator: string; price: number }[] = []

  for (const h of heights) {
    const block = await getBlock(h + 1)
    const events = block?.result?.finalize_block_events
    if (!events) continue

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
  }
  return out
}

/* ───── page component ──────────────────────────────────────────── */
export default function CapsulesPage() {
  const { data: account }     = useAccount()
  const { error: walletError } = useConnect()
  const { suggestAndConnect }  = useSuggestChainAndConnect()

  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [loading,  setLoading ] = useState(true)
  const [tab,      setTab]     = useState<'all' | 'yours'>('all')

  /* auto‑connect suggestion */
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
        /* deadlines */
        const next = await fetch('/api/deadline/next').then(r => r.json())
        const last = await fetch('/api/deadline/last').then(r => r.json())

        const nextH     = Number(next?.nextDeadline?.target_block)
        const nextToken = next?.nextDeadline?.symbol ?? next?.nextDeadline?.token ?? '—'

        const lastH     = Number(last?.lastDeadline?.target_block)
        const lastToken = last?.lastDeadline?.symbol ?? last?.lastDeadline?.token ?? '—'

        if (!nextH || !lastH) throw new Error('deadline heights missing')

        /* 1️⃣ encrypted capsules (next deadline) */
        const encryptedCaps: Capsule[] = []
        const tag   = "message.action='/fairyring.pep.MsgSubmitEncryptedTx'"
        const query = `%22${encodeURIComponent(tag)}%22`
        const now   = await getCurrentBlockHeight()
        let page    = 1

        while (!cancelled) {
          const res = await fetch(
            `${RPC}/tx_search?query=${query}&order_by=%22desc%22&per_page=${PER_PAGE}&page=${page}`
          ).then(r => r.json())

          const txs = res.result?.txs ?? []
          for (const row of txs) {
            const height = Number(row.height)
            if (height < now - 403_200) { page = Infinity }

            const raw  = TxRaw.decode(Buffer.from(row.tx, 'base64'))
            const body = TxBody.decode(raw.bodyBytes)
            if (body.memo !== MEMO) continue

            const anyMsg = body.messages.find(
              m => m.typeUrl === '/fairyring.pep.MsgSubmitEncryptedTx'
            )
            if (!anyMsg) continue

            const msg = MsgSubmitEncryptedTx.decode(new Uint8Array(anyMsg.value))
            if (+msg.targetBlockHeight !== nextH) continue

            encryptedCaps.push({
              creator: msg.creator,
              target : nextH,
              token  : nextToken,
              type   : 'encrypted',
              data   : msg.data,
            })
          }
          if (txs.length < PER_PAGE) break
          page += 1
        }

        /* 2️⃣ revealed capsules (last deadline) */
        const revealedTxs = await fetchRevealedTxs([lastH])
        const revealedCaps: Capsule[] = revealedTxs.map(tx => ({
          creator: tx.creator,
          target : lastH,
          token  : lastToken,
          type   : 'revealed',
          price  : tx.price,
        }))

        if (!cancelled) {
          /* encrypted first, revealed last */
          setCapsules([...encryptedCaps, ...revealedCaps])
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

  /* filter */
  const list =
    tab === 'all'
      ? capsules
      : capsules.filter(c => c.creator === account?.bech32Address)

  /* UI */
  return (
    <div className="font-sans bg-gradient-to-b from-white to-gray-100 min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold text-center uppercase tracking-wide">Encrypted Capsules</h1>

        {/* tabs */}
        <div className="flex justify-center space-x-6 border-b pb-2 text-sm font-medium">
          {(['all', 'yours'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t
                ? 'text-black border-b-2 border-black pb-1'
                : 'text-gray-500'}
            >
              {t === 'all' ? 'All' : 'Yours'}
            </button>
          ))}
        </div>

        {/* grid */}
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
