import { supabaseAdmin }         from '../lib/supabaseClient'
import {  getLastFridayStart,
         getNextFridayDeadline } from '../lib/utils'
import { fetchSolanaPriceAt }     from '../lib/utils'
import { useClient }                 from '../hooks/fairyring/useClient'
import { useLastDeadline } from '@/hooks/useDeadline'

async function run() {
const {date, block, isLoading, isError } = useLastDeadline()
  const actualPrice = await fetchSolanaPriceAt(date)
  const client      = useClient()
  
  // 1) fetch all revealed predictions in window
  const { data: { revealedTxArray }} =
    await client.FairyringPep.query.queryEncryptedTxAllFromHeight(block)
  const all = Array.isArray(revealedTxArray)
    ? revealedTxArray.flatMap(r => r.revealedTx || [])
    : revealedTxArray?.revealedTx || []

  // 2) compute each creator’s error
  const errors: Record<string, number> = {}
  for (const tx of all) {
    if (!tx.processedAtChainHeight) continue
    const height = Number(tx.processedAtChainHeight)
    const ts     = new Date(
      (await client.tendermint.getBlock({ height: String(height) }))
        .block.header.time
    )
    if (ts >= start && ts <= end) {
      const err = Math.abs(Number(tx.decryptedPrice) - actualPrice)
      errors[tx.creator] = err
    }
  }

  // 3) upsert into Supabase
  for (const [address, last_week_error] of Object.entries(errors)) {
    const { error } = await supabaseAdmin
      .from('participants')
      .upsert(
        { address, last_week_error, total_score: last_week_error },
        { onConflict: 'address' }
      )
      .eq('address', address)
      .increment('total_score', last_week_error)
    if (error) console.error('Upsert error:', address, error)
  }

  console.log(`Updated ${Object.keys(errors).length} participants`)
}

run().catch(console.error)
