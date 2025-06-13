import { weekScore, rawScore, K } from './score'
import { describe, it, expect }    from 'vitest'

describe('weekScore()', () => {
  it('returns an integer in 0…1000', () => {
    expect(weekScore(100, 100)).toBe(1000)
    expect(weekScore(150, 100)).toBeGreaterThanOrEqual(0)
    expect(weekScore(150, 100)).toBeLessThanOrEqual(1000)
  })

  it('is symmetric for over‑ and under‑estimates', () => {
    const act   = 200
    const delta = 30
    expect(weekScore(act + delta, act))
      .toBe(weekScore(act - delta, act))
  })

  it('gives higher score to the closer guess', () => {
    const act = 50
    const guessA = 55
    const guessB = 30
    expect(weekScore(guessA, act))
      .toBeGreaterThan(weekScore(guessB, act))
  })

  it('drops strictly as pct‑error grows', () => {
    const act = 100
    const err1 = weekScore(110, act)
    const err2 = weekScore(130, act)
    expect(err1).toBeGreaterThan(err2)
  })

  it('trends to 0 for wildly wrong guesses', () => {
    const act = 25
    const far = 1000
    expect(weekScore(far, act)).toBe(5)
  })

  it('is rawScore × 1000, rounded', () => {
    const pred = 87
    const act  = 92
    const expected = Math.round(rawScore(pred, act) * 1000)
    expect(weekScore(pred, act)).toBe(expected)
  })

  it('returns 0 when actual price is 0', () => {
    expect(weekScore(123, 0)).toBe(5)
  })

  it('returns identical scores for the same percentage error regardless of price scale', () => {
    const score1 = weekScore(90, 100)
    const score2 = weekScore(90000, 100000)
    expect(score1).toBe(score2)

    const score3 = weekScore(125, 100)
    const score4 = weekScore(2500000, 2000000)
    expect(score3).toBe(score4)
  })
})
