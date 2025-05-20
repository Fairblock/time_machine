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
import { get } from 'http'
import { getCurrentBlockHeight } from '@/services/fairyring/block'

type Capsule = { creator: string; id: string , data: string }

const MEMO      = 'price-predict'
const PER_PAGE  = 100
const RPC       = FAIRYRING_ENV.rpcURL.replace(/^ws/, 'http')


function CapsuleCard({ creator, id, data }: Capsule) {
  const shortAddr = `${creator.slice(0, 6)}…${creator.slice(-4)}`
  const preview   = data.length > 64 ? `${data.slice(0, 64)}…` : data // 1 line

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 shadow-sm text-sm max-w-full">
      {/* header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-600">
          <Image src="/lock.png" alt="capsule" width={20} height={20} />
          <span className="font-mono">{shortAddr}</span>
        </div>
        <span className="text-gray-400">🛡 {id}</span>
      </div>

      {/* payload preview */}
      <p className="font-mono text-xs break-all leading-relaxed">
        {preview}
      </p>
    </div>
  )
}

export default function CapsulesPage() {
  const { data: account } = useAccount()
  const { error: walletError } = useConnect()
  const { suggestAndConnect } = useSuggestChainAndConnect()

  const [capsules, setCapsules] = useState<Capsule[]>([])
  const [loading,  setLoading ] = useState(true)
  const [tab,      setTab     ] = useState<'all' | 'yours'>('all')

  /* wallet auto‑connect */
  useEffect(() => {
    if (walletError) {
      suggestAndConnect({ chainInfo: fairyring, walletType: WalletType.KEPLR })
    }
  }, [walletError, suggestAndConnect])

  /* main fetch */
  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        /* 1️⃣ fetch upcoming target height */
        const d = await fetch('/api/deadline/next').then(r => r.json())
        const target = Number(d?.nextDeadline?.target_block)
        const current = await getCurrentBlockHeight()
        if (!target) throw new Error('missing target_block')

        /* 2️⃣ tx_search on message.action only */
        const actionTag =
          "message.action='/fairyring.pep.MsgSubmitEncryptedTx'"
        const query    = `%22${encodeURIComponent(actionTag)}%22`
        let page       = 1
        const found: Capsule[] = []

        /* 3️⃣ pull pages until height < target or no more results */
        while (!cancelled) {
          const url =
            `${RPC}/tx_search?query=${query}` +
            `&order_by=%22desc%22&per_page=${PER_PAGE}&page=${page}`

          const res = await fetch(url).then(r => r.json())
          const txs = res.result?.txs ?? []

          for (const row of txs) {
          
            /* stop early once we’re past the height window */
            const height = Number(row.height)
            if (height < current - 403_200) { page = Infinity  }
          
            /* decode TX → body */
            const raw  = TxRaw.decode(Buffer.from(row.tx, 'base64'))
            const body = TxBody.decode(raw.bodyBytes)
           
            if (body.memo !== MEMO) continue

            const anyMsg = body.messages.find(
              m => m.typeUrl === '/fairyring.pep.MsgSubmitEncryptedTx',
            )
            if (!anyMsg) continue

            const msg = MsgSubmitEncryptedTx.decode(new Uint8Array(anyMsg.value))
            if (+msg.targetBlockHeight !== target) continue

            found.push({ creator: msg.creator, id: msg.targetBlockHeight.toString() , data: msg.data })
          }

          if (!cancelled) setCapsules([...found])

          if (txs.length < PER_PAGE) break
          page += 1
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setCapsules([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [])

  const list =
    tab === 'all'
      ? capsules
      : capsules.filter(c => c.creator === account?.bech32Address)

  return (
    <div className="font-sans bg-gradient-to-b from-white to-gray-100 min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-bold text-center uppercase tracking-wide">Predictions</h1>

        <div className="flex justify-center space-x-6 border-b pb-2 text-sm font-medium">
          {(['all', 'yours'] as const).map(t => (
            <button
              key={t}
              className={
                tab === t ? 'text-black border-b-2 border-black pb-1' : 'text-gray-500'
              }
              onClick={() => setTab(t)}
            >
              {t === 'all' ? 'All' : 'Yours'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {list.length ? (
    list.map((c) => <CapsuleCard key={`${c.id}-${c.creator}`} {...c} />)
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
