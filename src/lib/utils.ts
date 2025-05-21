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
  const now = Date.now();

  // 1) return cached if < 5 min old
  if (priceCache[cacheKey] && now - priceCache[cacheKey].ts < 5 * 60_000) {
    return priceCache[cacheKey].data;
  }

  // 2) otherwise fetch with retries
  const maxRetries = 3;
  let attempt = 0;
  let delay = 1000; // start with 1s

  while (attempt < maxRetries) {
    try {
      const from = Math.floor(fromMs / 1000);
      const to = Math.floor(toMs / 1000);
      const url = `https://api.coingecko.com/api/v3/coins/${asset}/market_chart/range`;

      const { data } = await axios.get<{
        prices: [number, number][];
      }>(url, {
        params: { vs_currency: 'usd', from, to },
      });

      // map to your PricePoint[]
      const mapped = data.prices.map(([ts, price]) => ({
        timestamp: ts,
        price,
      }));

      // cache and return
      priceCache[cacheKey] = { ts: now, data: mapped };
      return mapped;
    } catch (err: any) {
      // if it’s a 429, wait & retry
      if (err.response?.status === 429 && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
        attempt++;
        continue;
      }
      // otherwise bubble up
      throw err;
    }
  }

  // if we exit loop, throw generic
  throw new Error('Failed to fetch prices after multiple retries');
}
export async function getOHLC(
  fromMs: number,
  toMs: number,
  asset: string
): Promise<[number, number, number, number, number][]> {
  // compute rough days span
  const seconds = (toMs - fromMs) / 1000;
  const rawDays = Math.ceil(seconds / 86400);

  // clamp to one of Coingecko’s allowed buckets
  const allowed = [1, 7, 14, 30, 90, 180, 365];
  const days =
    rawDays <= 1
      ? 1
      : allowed.find((d) => d >= rawDays) ?? allowed[allowed.length - 1];

  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${asset}/ohlc?vs_currency=usd&days=${days}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch OHLC: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as [number, number, number, number, number][];
}

export async function fetchPriceAt(date: Date, token: string): Promise<number> {
  try {
 
    const startMs = date.getTime()
    const endMs   = startMs + 24 * 60 * 60 * 1000

   
    const pricePoints = await getPrices(startMs, endMs, token)

    return pricePoints[0]?.price ?? 0
  } catch (error) {
    console.error(`Error fetching token price at ${date.toISOString()}:`, error)
    return 0
  }
}

