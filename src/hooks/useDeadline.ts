// hooks/useDeadline.ts
import useSWR from 'swr'

export function useNextDeadline() {
  const { data, error } = useSWR(
    '/api/deadline/next',
    url => fetch(url).then(r => r.json())
  )
  return {
    deadline: data?.nextDeadline?.deadline_date,
    block:    data?.nextDeadline?.target_block,
    coingecko: data?.nextDeadline?.coingecko_id,
    symbol:   data?.nextDeadline?.symbol,
    isLoading: !error && !data,
    isError:   error,
  }
}
export function useLastDeadline() {
    const { data, error } = useSWR(
      '/api/deadline/last',
      url => fetch(url).then(r => r.json())
    )
    return {
      date:      data?.lastDeadline?.deadline_date  ?? null,
      block:     data?.lastDeadline?.target_block   ?? null,
      coingecko: data?.lastDeadline?.coingecko_id ?? null,
      symbol:    data?.lastDeadline?.symbol        ?? null,
      isLoading: !error && !data,
      isError:   error,
    }
  }