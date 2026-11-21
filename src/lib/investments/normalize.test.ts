import { describe, expect, it } from 'vitest'
import { makeRawSeries, ts } from '@/test/fixtures'
import { normalizeEvolution, toCalendarDay, toMillis } from './normalize'

describe('toMillis', () => {
  it('accepts Timestamp-like values, {seconds,nanoseconds} and Date', () => {
    expect(toMillis(ts('2019-01-01T03:00:00Z'))).toBe(Date.parse('2019-01-01T03:00:00Z'))
    expect(toMillis({ seconds: 10, nanoseconds: 5_000_000 })).toBe(10_005)
    expect(toMillis(new Date(42))).toBe(42)
  })
  it('rejects anything else', () => {
    for (const v of [
      null,
      undefined,
      '2019-01-01',
      123,
      {},
      new Date('x'),
      { seconds: Number.NaN },
    ]) {
      expect(toMillis(v)).toBeNull()
    }
  })
})

describe('toCalendarDay', () => {
  it('uses the UTC date, so the inconsistent Chile-midnight offsets map to the right day', () => {
    expect(toCalendarDay(Date.parse('2019-05-11T03:00:00Z'))).toBe('2019-05-11')
    expect(toCalendarDay(Date.parse('2019-05-12T04:00:00Z'))).toBe('2019-05-12')
    expect(toCalendarDay(Date.parse('2019-12-22T00:00:00Z'))).toBe('2019-12-22')
  })
})

describe('normalizeEvolution', () => {
  it('maps the Firestore fields and derives per-day contributions', () => {
    const result = normalizeEvolution({
      array: makeRawSeries([0, 0.01, 0.02], { deposits: { 2: 500 } }),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const [a, b, c] = result.evolution.points
    expect(a).toMatchObject({
      date: '2019-01-01',
      value: 1_000_000,
      index: 100,
      contributedToday: 1_000_000,
    })
    expect(b).toMatchObject({ date: '2019-01-02', contributedToday: 0, dailyReturn: 0.01 })
    expect(c).toMatchObject({ date: '2019-01-03', contributedToday: 500, contributions: 1_000_500 })
    expect(c?.time).toBe(Date.parse('2019-01-03T00:00:00Z'))
    expect(result.evolution.discarded).toBe(0)
  })

  it('sorts unordered input chronologically', () => {
    const raw = makeRawSeries([0, 0.01, 0.02])
    const result = normalizeEvolution({ array: [raw[2], raw[0], raw[1]] })
    expect(result.ok && result.evolution.points.map((p) => p.date)).toEqual([
      '2019-01-01',
      '2019-01-02',
      '2019-01-03',
    ])
  })

  it('skips and counts invalid elements instead of inventing values', () => {
    const [good] = makeRawSeries([0])
    const result = normalizeEvolution({
      array: [
        good,
        null,
        { ...good, date: '2019-01-05' },
        { ...good, date: ts('2019-01-06T03:00:00Z'), portfolioValue: '1000' },
        { ...good, date: ts('2019-01-07T03:00:00Z'), dailyReturn: Number.NaN },
        { ...good, date: ts('2019-01-08T03:00:00Z'), portfolioIndex: 0 },
      ],
    })
    expect(result.ok && result.evolution.points).toHaveLength(1)
    expect(result.ok && result.evolution.discarded).toBe(5)
  })

  it('keeps one point per day (the later element wins)', () => {
    const [a] = makeRawSeries([0])
    const dup = { ...a, date: ts('2019-01-01T23:00:00Z'), portfolioValue: 7 } as typeof a
    const result = normalizeEvolution({ array: [a, dup] })
    expect(result.ok && result.evolution.points.map((p) => p.value)).toEqual([7])
    expect(result.ok && result.evolution.discarded).toBe(1)
  })

  it('accepts an empty series', () => {
    expect(normalizeEvolution({ array: [] })).toEqual({
      ok: true,
      evolution: { points: [], discarded: 0 },
    })
  })

  it.each([null, 'x', {}, { array: 'nope' }, { values: [] }])(
    'reports an unrecognized document: %j',
    (data) => {
      expect(normalizeEvolution(data)).toEqual({ ok: false, reason: 'missing-series' })
    },
  )
})
