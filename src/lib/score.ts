// src/lib/score.ts
export const K = 10              // keep configurable for tests

export function rawScore(pred: number, act: number): number {
  if (!act) return 0
  const pctDiff = Math.abs(pred - act) / act
  return Math.exp(-pctDiff * K)         // 1 → perfect, →0 when far off
}

export function weekScore(pred: number, act: number): number {
  const base = Math.round(rawScore(pred, act) * 1000)        // 0 … 1000
  return Math.max(5, base)                                   // ← floor at 5
}
