import { getCurrentBlockHeight } from '@/services/fairyring/block';
import { IPrice } from '@/types/global';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { differenceInSeconds } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLastFridayStart() {
  const now = new Date();
  const lastFriday = new Date();
  const dayDiff = (now.getUTCDay() + 2) % 7 || 7;
  lastFriday.setUTCDate(now.getUTCDate() - dayDiff);
  lastFriday.setUTCHours(0, 0, 0, 0);
  return lastFriday;
}

export function getNextFridayDeadline() {
  const now = new Date();
  const nextFriday = new Date();
  nextFriday.setUTCDate(now.getUTCDate() + ((5 - now.getUTCDay() + 7) % 7));
  nextFriday.setUTCHours(23, 59, 0, 0);
  return nextFriday;
}

interface PricePoint { timestamp: number; price: number; }
// simple in-memory cache
const priceCache: Record<string, { ts: number; data: PricePoint[] }> = {};


export async function getPrices(
  fromMs: number,
  toMs: number,
  asset: string
): Promise<PricePoint[]> {
  const cacheKey = `${asset}:${fromMs}-${toMs}`;
  const now      = Date.now();

  // ── 1) serve fresh cache (<5 min) ────────────────────────────────
  if (priceCache[cacheKey] && now - priceCache[cacheKey].ts < 5 * 60_000) {
    return priceCache[cacheKey].data;
  }

  // ── 2) fetch with adaptive retries ───────────────────────────────
  const maxRetries = 5;          // ← a bit more forgiving
  let   attempt    = 0;
  let   delay      = 1_000;      // 1 s first back‑off

  while (attempt < maxRetries) {
    try {
      const from  = Math.floor(fromMs / 1000);
      const to    = Math.floor(toMs   / 1000);

      const { data } = await axios.get<
        { prices: [number, number][] }
      >(`https://api.coingecko.com/api/v3/coins/${asset}/market_chart/range`, {
        params: { vs_currency: 'usd', from, to },
      });

      const mapped: PricePoint[] = data.prices.map(([ts, price]) => ({
        timestamp: ts,
        price,
      }));

      priceCache[cacheKey] = { ts: Date.now(), data: mapped }; // cache fresh
      return mapped;
    } catch (err: any) {
      /* 429 handling --------------------------------------------------------- */
      const status = err?.response?.status;

      if (status === 429 && attempt < maxRetries - 1) {
        // If CG supplies Retry‑After (seconds), obey it; otherwise use back‑off.
        const retryAfterHeader = err.response?.headers?.['retry-after'];
        const retryAfterMs     =
          retryAfterHeader ? Number(retryAfterHeader) * 1000 : delay;

        await new Promise((r) => setTimeout(r, retryAfterMs + Math.random() * 200));

        // Exponential back‑off, cap at 30 s so we don’t wait forever
        delay = Math.min(delay * 2, 30_000);
        attempt++;
        continue;
      }

      /* any other status or last 429 → bubble up ----------------------------- */
      throw err;
    }
  }

  throw new Error('Failed to fetch prices after multiple retries');
}
export async function getOHLC(
  fromMs: number,
  toMs: number,
  asset: string
): Promise<[number, number, number, number, number][]> {
  // ── determine the smallest Coingecko bucket that fully covers the interval ──
  const seconds  = (toMs - fromMs) / 1000;
  const rawDays  = Math.ceil(seconds / 86_400);
  const allowed  = [1, 7, 14, 30, 90, 180, 365] as const;
  const days =
    rawDays <= 1
      ? 1
      : allowed.find((d) => d >= rawDays) ?? allowed[allowed.length - 1];

  // ── retry logic (same pattern as getPrices) ──
  const maxRetries = 5;
  let attempt = 0;
  let delay   = 1_000; // 1 s

  while (attempt < maxRetries) {
    try {
      const { data } = await axios.get<
        [number, number, number, number, number][]
      >(`https://api.coingecko.com/api/v3/coins/${asset}/ohlc`, {
        params: { vs_currency: 'usd', days },
      });

      return data; // success
    } catch (err: any) {
      // 429 = rate‑limited → wait, double delay, and retry (unless out of attempts)
      if (err.response?.status === 429 && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        attempt++;
        continue;
      }
      // any other error (or final 429) → bubble up
      throw err;
    }
  }

  throw new Error('Failed to fetch OHLC after multiple retries');
}
export async function fetchPriceAt(date: Date, token: string): Promise<number> {
  try {
    console.log(`Fetching price for ${token} at ${date.toISOString()}`)
    const startMs = date.getTime()
    const endMs   = startMs + 24 * 60 * 60 * 1000

   
    let pricePoints = await getPrices(startMs, endMs, token)
    while (pricePoints[0]?.price === 0) {
      pricePoints = await getPrices(startMs, endMs, token)
    }
    console.log(`Price points for ${token}:`, pricePoints)
    return pricePoints[0]?.price ?? 0
  } catch (error) {
    console.error(`Error fetching token price at ${date.toISOString()}:`, error)
    return 0
  }
}

