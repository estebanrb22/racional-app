import type { EvolutionPoint } from '@/types/investment'

/** Headline position at the latest observation. Formulas: docs/firestore-data-model.md */
export interface PositionSummary {
  asOf: string
  value: number
  contributed: number
  /** V − C. Valid because the data contains no withdrawals. */
  gain: number
  /** (V − C) / C, simple and not annualized. `null` when nothing was contributed. */
  gainPct: number | null
}

export function summarizePosition(points: readonly EvolutionPoint[]): PositionSummary | null {
  const last = points.at(-1)
  if (!last) return null
  const gain = last.value - last.contributions
  return {
    asOf: last.date,
    value: last.value,
    contributed: last.contributions,
    gain,
    gainPct: last.contributions > 0 ? gain / last.contributions : null,
  }
}

export interface PeriodStats {
  from: string
  to: string
  /** Time-weighted return I_b / I_a − 1: unaffected by contributions. */
  twr: number
  /** V_b − V_a: includes new contributions, so it is NOT a return. */
  valueChange: number
  /** C_b − C_a */
  contributed: number
  /** (V_b − V_a) − (C_b − C_a): what the market added in the period. */
  marketGain: number
  /** Most negative peak-to-trough fall of the index within the period (≤ 0). */
  maxDrawdown: number
  bestDay: { date: string; return: number } | null
  worstDay: { date: string; return: number } | null
  /** Share of days with positive return among the days the period covers. */
  positiveDaysPct: number | null
}

/**
 * Stats for a period [a, b] given its points. The first point is the baseline:
 * its own daily return belongs to the previous period and is excluded.
 */
export function computePeriodStats(points: readonly EvolutionPoint[]): PeriodStats | null {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last) return null

  let peak = first.index
  let maxDrawdown = 0
  let best: PeriodStats['bestDay'] = null
  let worst: PeriodStats['worstDay'] = null
  let positive = 0

  for (let i = 1; i < points.length; i++) {
    const p = points[i] as EvolutionPoint
    peak = Math.max(peak, p.index)
    maxDrawdown = Math.min(maxDrawdown, p.index / peak - 1)
    if (!best || p.dailyReturn > best.return) best = { date: p.date, return: p.dailyReturn }
    if (!worst || p.dailyReturn < worst.return) worst = { date: p.date, return: p.dailyReturn }
    if (p.dailyReturn > 0) positive += 1
  }

  const valueChange = last.value - first.value
  const contributed = last.contributions - first.contributions
  const days = points.length - 1
  return {
    from: first.date,
    to: last.date,
    twr: last.index / first.index - 1,
    valueChange,
    contributed,
    marketGain: valueChange - contributed,
    maxDrawdown,
    bestDay: best,
    worstDay: worst,
    positiveDaysPct: days > 0 ? positive / days : null,
  }
}

export interface MonthSummary {
  /** `YYYY-MM` */
  month: string
  endDate: string
  endValue: number
  /** Capital contributed during the month (the initial contribution counts in its month). */
  contributed: number
  /** Month TWR: I(last of month) / I(last of previous month) − 1. */
  twr: number
  /** True when the series starts after day 1 or ends before the last day of the month. */
  partial: boolean
}

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function summarizeByMonth(points: readonly EvolutionPoint[]): MonthSummary[] {
  const groups = new Map<string, EvolutionPoint[]>()
  for (const p of points) {
    const month = p.date.slice(0, 7)
    const group = groups.get(month)
    if (group) group.push(p)
    else groups.set(month, [p])
  }

  const months: MonthSummary[] = []
  let baseIndex = points[0]?.index ?? 0
  for (const [month, group] of groups) {
    const first = group[0] as EvolutionPoint
    const last = group.at(-1) as EvolutionPoint
    months.push({
      month,
      endDate: last.date,
      endValue: last.value,
      contributed: group.reduce((sum, p) => sum + Math.max(0, p.contributedToday), 0),
      twr: last.index / baseIndex - 1,
      partial: first.date.slice(8) !== '01' || Number(last.date.slice(8)) !== daysInMonth(month),
    })
    baseIndex = last.index
  }
  return months
}
