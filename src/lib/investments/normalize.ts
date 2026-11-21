import type { EvolutionPoint, InvestmentEvolution } from '@/types/investment'

const DAY_MS = 86_400_000

export type NormalizeResult =
  | { ok: true; evolution: InvestmentEvolution }
  /** The document does not contain the expected series at all. */
  | { ok: false; reason: 'missing-series' }

/**
 * Converts a Firestore Timestamp (or anything Timestamp-like) to epoch ms.
 * Duck-typed so this module does not depend on the SDK and stays testable.
 */
export function toMillis(value: unknown): number | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value !== 'object' || value === null) return null
  if ('toMillis' in value && typeof value.toMillis === 'function') {
    const ms: unknown = value.toMillis()
    return typeof ms === 'number' && Number.isFinite(ms) ? ms : null
  }
  if ('seconds' in value && typeof value.seconds === 'number' && Number.isFinite(value.seconds)) {
    const nanos =
      'nanoseconds' in value && typeof value.nanoseconds === 'number' ? value.nanoseconds : 0
    return value.seconds * 1000 + Math.floor(nanos / 1e6)
  }
  return null
}

/**
 * The stored instants are "midnight in Chile" with inconsistent UTC offsets
 * (03:00Z, 04:00Z and 00:00Z). Their UTC date is the intended calendar day.
 */
export function toCalendarDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

type RawPoint = Omit<EvolutionPoint, 'contributedToday'>

function parsePoint(raw: unknown): RawPoint | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const ms = toMillis(r.date)
  const { portfolioValue, contributions, portfolioIndex, dailyReturn } = r
  if (
    ms === null ||
    !finite(portfolioValue) ||
    !finite(contributions) ||
    !finite(portfolioIndex) ||
    !finite(dailyReturn) ||
    portfolioValue < 0 ||
    contributions < 0 ||
    portfolioIndex <= 0
  ) {
    return null
  }
  const date = toCalendarDay(ms)
  return {
    date,
    time: Math.floor(ms / DAY_MS) * DAY_MS,
    value: portfolioValue,
    contributions,
    index: portfolioIndex,
    dailyReturn,
  }
}

/**
 * Validates and normalizes the raw document:
 * - the series lives in the `array` field;
 * - invalid elements are skipped and counted (never invented or patched);
 * - one point per calendar day (a later element for the same day wins);
 * - sorted ascending; per-day contribution derived from the cumulative field.
 */
export function normalizeEvolution(data: unknown): NormalizeResult {
  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'missing-series' }
  const series = (data as Record<string, unknown>).array
  if (!Array.isArray(series)) return { ok: false, reason: 'missing-series' }

  const byDay = new Map<string, RawPoint>()
  let discarded = 0
  for (const raw of series) {
    const point = parsePoint(raw)
    if (!point) {
      discarded += 1
      continue
    }
    if (byDay.has(point.date)) discarded += 1
    byDay.set(point.date, point)
  }

  const sorted = [...byDay.values()].sort((a, b) => a.time - b.time)
  const points: EvolutionPoint[] = sorted.map((point, i) => {
    const previous = sorted[i - 1]
    return {
      ...point,
      contributedToday: previous
        ? point.contributions - previous.contributions
        : point.contributions,
    }
  })

  return { ok: true, evolution: { points, discarded } }
}
