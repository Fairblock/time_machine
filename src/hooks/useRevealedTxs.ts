import { useMemo } from 'react'

import {
  REVEAL_EVENT_TYPES,
  REVEAL_EVENT_ATTRS,
} from '@/constant/events'
import { useBlocks } from '@/services/fairyring/block'

export function useRevealedTxs(targetHeights: number[]) {
  const { blockQueries } = useBlocks(targetHeights)

  const revealed = useMemo(() => {
    const out: Array<{
      creator: string
      price: number
      index: string
      memo: string
      rawEvent: any
    }> = []

    blockQueries.forEach((q) => {
      const events = q.data?.result?.finalize_block_events
      if (!events) return

      events
        .filter(e => e.type === REVEAL_EVENT_TYPES)
        .forEach(e => {
          const attrs = e.attributes.reduce((acc, { key, value }) => {
            acc[key] = value
            return acc
          }, {} as Record<string,string>)

          const memoStr = attrs[REVEAL_EVENT_ATTRS.memo]
          if (!memoStr) return

          let parsed: any
          try { parsed = JSON.parse(memoStr) }
          catch { return }

          if (parsed.tag !== 'price-predict') return

          out.push({
            creator: attrs[REVEAL_EVENT_ATTRS.creator],
            price: Number(parsed.memo.prediction),
            index: attrs[REVEAL_EVENT_ATTRS.index],
            memo: memoStr,
            rawEvent: e,
          })
        })
    })

    return out
  }, [blockQueries])

  const isLoading = blockQueries.some(q => q.isLoading)
  const isError   = blockQueries.some(q => !!q.error)

  return { revealed, isLoading, isError }
}
