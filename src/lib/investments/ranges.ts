import type { EvolutionPoint } from '@/types/investment'

export type RangeKey = '1M' | '3M' | '6M' | 'ALL'

export const RANGES: readonly {
  key: RangeKey
  label: string
  months: number | null
  description: string
}[] = [
  { key: '1M', label: '1M', months: 1, description: 'Último mes' },
  { key: '3M', label: '3M', months: 3, description: 'Últimos 3 meses' },
  { key: '6M', label: '6M', months: 6, description: 'Últimos 6 meses' },
  { key: 'ALL', label: 'Todo', months: null, description: 'Toda la serie' },
]

/** `YYYY-MM-DD` minus N calendar months (clamped to the end of shorter months). */
export function subtractMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const target = new Date(Date.UTC(y, m - 1 - months, 1))
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate()
  target.setUTCDate(Math.min(d, lastDay))
  return target.toISOString().slice(0, 10)
}

/**
 * Ranges are anchored to the LAST observation, not to today: the series is
 * historical, so "1M" means the month before the latest data point.
 */
export function filterByRange(
  points: readonly EvolutionPoint[],
  range: RangeKey,
): EvolutionPoint[] {
  const spec = RANGES.find((r) => r.key === range)
  const last = points.at(-1)
  if (!spec?.months || !last) return [...points]
  const start = subtractMonths(last.date, spec.months)
  return points.filter((p) => p.date >= start)
}

/** A range is offered only if the series is longer than it (otherwise it equals "Todo"). */
export function availableRanges(points: readonly EvolutionPoint[]): RangeKey[] {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return ['ALL']
  return RANGES.filter(
    (r) => r.months === null || first.date < subtractMonths(last.date, r.months),
  ).map((r) => r.key)
}
