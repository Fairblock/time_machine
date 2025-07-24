import { FAIRYRING_ENV } from '@/constant/env';
import { getCurrentBlockHeight } from '@/services/fairyring/block';
import { IPrice } from '@/types/global';
import axios from 'axios';
import { clsx, type ClassValue } from 'clsx';
import { differenceInSeconds } from 'date-fns';
import { twMerge } from 'tailwind-merge';

// ─────────── CoinGecko auth config ──────────────────────────
const COINGECKO_KEY = FAIRYRING_ENV.coinGeckoKey!;      // set in .env
const IS_PRO        = FAIRYRING_ENV.coinGeckoPlan === 'pro';

const BASE_URL = IS_PRO
  ? 'https://pro-api.coingecko.com/api/v3'             // Pro root URL :contentReference[oaicite:0]{index=0}
  : 'https://api.coingecko.com/api/v3';                // Demo/Public root URL :contentReference[oaicite:1]{index=1}

const AUTH_HEADER = IS_PRO
  ? { 'x-cg-pro-api-key': COINGECKO_KEY }              // Pro header name :contentReference[oaicite:2]{index=2}
  : { 'x-cg-demo-api-key': COINGECKO_KEY };            // Demo header name :contentReference[oaicite:3]{index=3}

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
      console.log(`Fetching prices for ${asset} from ${new Date(fromMs).toISOString()} to ${new Date(toMs).toISOString()}`);
      const { data } = await axios.get<{ prices: [number, number][] }>(
        `${BASE_URL}/coins/${asset}/market_chart/range`,
        {
          params: { vs_currency: 'usd', from, to },
          headers: AUTH_HEADER,        // ← new
        }
      );

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
// utils/prices.ts
export async function fetchPriceAt(date: Date, token: string): Promise<number> {
  const targetMs = date.getTime();            // the instant you really care about

  /* 1) widen the range to ±10 minutes (plenty for 5‑min buckets) */
  const fromMs   = targetMs - 10 * 60_000;    // 10 min before
  const toMs     = targetMs + 10 * 60_000;    // 10 min after

  /* 2) fetch points inside that window */
  const pts = await getPrices(fromMs, toMs, token);
  if (!pts.length) throw new Error('No price data in 20‑minute window');

  /* 3) choose the timestamp that is closest to the target */
  const closest = pts.reduce((a, b) =>
    Math.abs(b.timestamp - targetMs) < Math.abs(a.timestamp - targetMs) ? b : a
  );
  console.log(`Closest price to ${date.toISOString()} is at ${new Date(closest.timestamp).toISOString()}`);
  return closest.price;                       // ← exact (or nearest‑5‑min) price
}


