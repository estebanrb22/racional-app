import { describe, expect, it } from 'vitest'
import { makePoints } from '@/test/fixtures'
import { availableRanges, filterByRange, subtractMonths } from './ranges'

describe('subtractMonths', () => {
  it.each([
    ['2019-12-22', 1, '2019-11-22'],
    ['2019-12-22', 6, '2019-06-22'],
    ['2019-03-31', 1, '2019-02-28'],
    ['2019-01-15', 1, '2018-12-15'],
  ])('%s − %i → %s', (date, months, expected) => {
    expect(subtractMonths(date, months)).toBe(expected)
  })
})

describe('ranges', () => {
  const yearish = makePoints(new Array(356).fill(0.001)) // 2019-01-01 .. 2019-12-22

  it('anchors ranges to the last observation, including the baseline day', () => {
    const month = filterByRange(yearish, '1M')
    expect(month[0]?.date).toBe('2019-11-22')
    expect(month.at(-1)?.date).toBe('2019-12-22')
    expect(filterByRange(yearish, 'ALL')).toHaveLength(356)
  })

  it('offers only ranges shorter than the series', () => {
    expect(availableRanges(yearish)).toEqual(['1M', '3M', '6M', 'ALL'])
    expect(availableRanges(makePoints(new Array(40).fill(0)))).toEqual(['1M', 'ALL'])
    expect(availableRanges([])).toEqual(['ALL'])
  })
})
