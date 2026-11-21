import { describe, expect, it } from 'vitest'
import { makePoints } from '@/test/fixtures'
import { computePeriodStats, summarizeByMonth, summarizePosition } from './metrics'

describe('summarizePosition', () => {
  it('computes gain over contributed capital', () => {
    // +10 % on day 1, then a 500 000 deposit on day 2 with 0 % return
    const points = makePoints([0, 0.1, 0], { deposits: { 2: 500_000 } })
    const s = summarizePosition(points)
    expect(s?.value).toBeCloseTo(1_600_000)
    expect(s?.contributed).toBe(1_500_000)
    expect(s?.gain).toBeCloseTo(100_000)
    expect(s?.gainPct).toBeCloseTo(100_000 / 1_500_000)
    expect(s?.asOf).toBe('2019-01-03')
  })

  it('handles empty data and zero contributions', () => {
    expect(summarizePosition([])).toBeNull()
    expect(summarizePosition(makePoints([0], { initial: 0 }))?.gainPct).toBeNull()
  })
})

describe('computePeriodStats', () => {
  it('separates return (TWR) from value change caused by deposits', () => {
    const points = makePoints([0, 0.1, -0.05, 0.02], { deposits: { 2: 1_000_000 } })
    const s = computePeriodStats(points)
    if (!s) throw new Error('expected stats')
    expect(s.twr).toBeCloseTo(1.1 * 0.95 * 1.02 - 1)
    expect(s.contributed).toBe(1_000_000)
    expect(s.valueChange).toBeCloseTo((points.at(-1)?.value ?? 0) - 1_000_000)
    expect(s.marketGain).toBeCloseTo(s.valueChange - 1_000_000)
    expect(s.bestDay).toEqual({ date: '2019-01-02', return: 0.1 })
    expect(s.worstDay).toEqual({ date: '2019-01-03', return: -0.05 })
    expect(s.positiveDaysPct).toBeCloseTo(2 / 3)
  })

  it('measures max drawdown on the index', () => {
    const s = computePeriodStats(makePoints([0, 0.1, -0.1, -0.1, 0.3]))
    expect(s?.maxDrawdown).toBeCloseTo(0.9 * 0.9 - 1)
  })

  it('treats the first point as baseline (its daily return is excluded)', () => {
    const points = makePoints([0, 0.5, 0.01]).slice(1)
    const s = computePeriodStats(points)
    expect(s?.twr).toBeCloseTo(0.01)
    expect(s?.bestDay?.return).toBe(0.01)
  })

  it('handles empty and single-point periods', () => {
    expect(computePeriodStats([])).toBeNull()
    const single = computePeriodStats(makePoints([0]))
    expect(single).toMatchObject({ twr: 0, bestDay: null, positiveDaysPct: null, maxDrawdown: 0 })
  })
})

describe('summarizeByMonth', () => {
  it('chains monthly TWR and flags partial months', () => {
    // 2019-01-30 .. 2019-02-02 : Jan 30-31 (partial), Feb 1-2 (partial)
    const points = makePoints([0, 0.1, 0.2, 0.1], { start: '2019-01-30', deposits: { 2: 300 } })
    const months = summarizeByMonth(points)
    expect(months.map((m) => m.month)).toEqual(['2019-01', '2019-02'])
    expect(months[0]).toMatchObject({
      partial: true,
      contributed: 1_000_000,
      endDate: '2019-01-31',
    })
    expect(months[0]?.twr).toBeCloseTo(0.1)
    expect(months[1]).toMatchObject({ partial: true, contributed: 300 })
    expect(months[1]?.twr).toBeCloseTo(1.2 * 1.1 - 1)
  })

  it('marks a complete month as not partial', () => {
    const months = summarizeByMonth(makePoints(new Array(31).fill(0.001), { start: '2019-01-01' }))
    expect(months).toHaveLength(1)
    expect(months[0]?.partial).toBe(false)
  })
})
