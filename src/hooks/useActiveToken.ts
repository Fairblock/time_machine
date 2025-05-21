'use client';

import { useQuery } from '@tanstack/react-query';

/** Shape returned by /api/deadline/next (or last) */
export interface ActiveToken {
  coingecko_id: string;   // e.g. 'solana'
  symbol: string;         // e.g. 'SOL'
}

async function fetchActiveToken(): Promise<ActiveToken> {
  // 1️⃣ Try the upcoming (next) deadline row
  let res = await fetch('/api/deadline/next');
  let json = await res.json();
  if (json?.nextDeadline) return json.nextDeadline;

  throw new Error('No active token found');
}

async function fetchLastToken(): Promise<ActiveToken> {
 
    let res = await fetch('/api/deadline/last');
    let json = await res.json();
    if (json?.lastDeadline) return json.lastDeadline;
    
    throw new Error('No active token found');
    }

export function useActiveToken() {
  return useQuery<ActiveToken>({
    queryKey : ['active-token'],
    queryFn  : fetchActiveToken,
    staleTime: 5 * 60_000,     // 5 min
  });
}

export function useLastToken() {
  return useQuery<ActiveToken>({
    queryKey : ['last-token'],
    queryFn  : fetchLastToken,
    staleTime: 5 * 60_000,     // 5 min
  });
}