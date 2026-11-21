import { describe, expect, it } from 'vitest'
import { makePoints } from '@/test/fixtures'
import { niceScale, timeTicks } from './chartScale'

describe('niceScale', () => {
  it('rounds the domain outwards to an evenly spaced nice step', () => {
    const { domain, ticks } = niceScale(1_003_000, 1_412_000)
    expect(domain).toEqual([1_000_000, 1_600_000])
    expect(ticks).toEqual([1_000_000, 1_200_000, 1_400_000, 1_600_000])
    expect(niceScale(0, 100).ticks).toEqual([0, 25, 50, 75, 100])
  })
  it('handles percentage ranges crossing zero', () => {
    const { domain, ticks } = niceScale(-0.012, 0.061)
    expect(domain[0]).toBeLessThanOrEqual(-0.012)
    expect(domain[1]).toBeGreaterThanOrEqual(0.061)
    expect(ticks).toContain(0)
  })
  it('pads a flat series instead of collapsing the axis', () => {
    const { domain } = niceScale(100, 100)
    expect(domain[0]).toBeLessThan(100)
    expect(domain[1]).toBeGreaterThan(100)
  })
})

describe('timeTicks', () => {
  it('uses month starts for long spans', () => {
    const { ticks, monthly } = timeTicks(makePoints(new Array(120).fill(0)))
    expect(monthly).toBe(true)
    expect(ticks.map((t) => new Date(t).toISOString().slice(0, 10))).toEqual([
      '2019-01-01',
      '2019-02-01',
      '2019-03-01',
      '2019-04-01',
    ])
  })
  it('uses weekly ticks ending on the last day for short spans', () => {
    const points = makePoints(new Array(31).fill(0))
    const { ticks, monthly } = timeTicks(points)
    expect(monthly).toBe(false)
    expect(ticks.at(-1)).toBe(points.at(-1)?.time)
    expect(ticks).toHaveLength(5)
  })
})
