// src/lib/score.ts
export const K = 10

export function rawScore(pred: number, act: number): number {
  if (!act) return 0
  const pctDiff = Math.abs(pred - act) / act
  return Math.exp(-pctDiff * K)        
}

export function weekScore(pred: number, act: number): number {
  const base = Math.round(rawScore(pred, act) * 1000)       
  return Math.max(5, base)                                   
}
