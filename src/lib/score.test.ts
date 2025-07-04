/* tests/score.test.ts ----------------------------------------------------
 * Verifies our campaign formula:
 *   finalScore = weekScore(prediction, actual) × multiplier
 *   multiplier = 2.25 (Day-1) · 1.5 (Day-2) · 1 (Day-3+)
 * ---------------------------------------------------------------------- */
import { weekScore } from './score'
import { describe, it, expect } from 'vitest'

/* multipliers – keep in sync with production */
const MUL = [1.1, 1.05, 1] as const

/* helper: 0-based day index → multiplier */
const m = (d: number) => (d <= 0 ? MUL[0] : d === 1 ? MUL[1] : MUL[2])

/* full campaign score */
const score = (p: number, a: number, d: number) => weekScore(p, a) * m(d)

/* ── diagnostic printer ─────────────────────────────────────────────── */
function dump (title: string, rows: Array<{ p: number; a: number; d: number }>) {
  // eslint-disable-next-line no-console
  console.log(`\n${title}`)
  // eslint-disable-next-line no-console
  console.table(
    rows.map((r) => ({
      prediction : r.p,
      actual     : r.a,
      day        : r.d + 1,               // show 1-based
      baseScore  : weekScore(r.p, r.a),
      finalScore : score(r.p, r.a, r.d),
    }))
  )
}

/* test matrix – diverse magnitudes & errors */
const cases: Array<{ p: number; a: number; d: number }> = [
  { p: 1,         a: 1,        d: 0 },
  { p: 1.05,      a: 1,        d: 0 },
  { p: 0.9,       a: 1,        d: 1 },
  { p: 0.001,     a: 0.001,    d: 2 },
  { p: 0.0012,    a: 0.001,    d: 0 },
  { p: 10,        a: 12,       d: 0 },
  { p: 11,        a: 12,       d: 1 },
  { p: 15,        a: 12,       d: 2 },
  { p: 100,       a: 80,       d: 0 },
  { p: 80,        a: 100,      d: 1 },
  { p: 60,        a: 100,      d: 2 },
  { p: 1234,      a: 1234,     d: 0 },
  { p: 1500,      a: 1234,     d: 1 },
  { p: 1000,      a: 1234,     d: 2 },
  { p: 5e4,       a: 5e4,      d: 0 },
  { p: 6e4,       a: 5e4,      d: 1 },
  { p: 4e4,       a: 5e4,      d: 2 },
  { p: 2e6,       a: 2e6,      d: 0 },
  { p: 2.6e6,     a: 2e6,      d: 1 },
  { p: 1.8e6,     a: 2e6,      d: 2 },
  { p: 0.23,      a: 0.25,     d: 0 },
  { p: 0.27,      a: 0.25,     d: 1 },
  { p: 0.19,      a: 0.25,     d: 2 },
  { p: 9_999_999, a: 1_234_567,d: 0 },
  { p: 50,        a: 1,        d: 1 },
]

dump('Sample predictions', cases)

/* ── unit tests ─────────────────────────────────────────────────────── */
describe('campaign score (weekScore × new multipliers)', () => {
  it('applies the correct 1.1 / 1.05 / 1 multiplier', () => {
    const base = weekScore(130, 100)
    expect(score(130, 100, 0)).toBeCloseTo(base * 1.1)
    expect(score(130, 100, 1)).toBeCloseTo(base * 1.05)
    expect(score(130, 100, 2)).toBeCloseTo(base * 1)
    expect(score(130, 100, 99)).toBeCloseTo(base * 1) // ≥2 uses Day-3 multiplier
  })

  it('outputs stay within 0‥2250 (1000 × 2.25)', () => {
    for (const r of cases) {
      const s = score(r.p, r.a, r.d)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(2250)
    }
  })

  it('perfect late guess still beats far-off early guess (2.25× multipliers)', () => {
    const act = 400
    const perfectDay3 = score(act, act, 2)          // 1000 × 1 = 1000
    const offDay1     = score(act * 1.3, act, 0)    // ~50 × 2.25 ≈ 113
    expect(perfectDay3).toBeGreaterThan(offDay1)
  })

  it('scale-invariant: same % error at same day → identical score', () => {
    expect(score(90, 100, 0)).toBe(score(9000, 10000, 0))   // −10% Day-1
    expect(score(110, 100, 1)).toBe(score(1100, 1000, 1))   // +10% Day-2
  })

  it('monotone with multiplier for identical guess', () => {
    const s0 = score(120, 100, 0)
    const s1 = score(120, 100, 1)
    const s2 = score(120, 100, 2)
    expect(s0).toBeGreaterThan(s1)
    expect(s1).toBeGreaterThan(s2)
  })
})
