import { normalizeEvolution } from '@/lib/investments/normalize'
import type { EvolutionPoint } from '@/types/investment'

/** Firestore-like Timestamp (only what the normalizer uses). */
export const ts = (iso: string) => ({ toMillis: () => Date.parse(iso) })

export interface RawItem {
  date: ReturnType<typeof ts>
  portfolioValue: number
  contributions: number
  portfolioIndex: number
  dailyReturn: number
}

/**
 * SYNTHETIC series that follows the relationships observed in the real document:
 * I_i = I_{i-1}(1+r_i), V_i = V_{i-1}(1+r_i) + ΔC_i, V_0 = C_0, I_0 = 100.
 * `deposits` maps a day offset to an extra contribution.
 */
export function makeRawSeries(
  returns: number[],
  { start = '2019-01-01', initial = 1_000_000, deposits = {} as Record<number, number> } = {},
): RawItem[] {
  const items: RawItem[] = []
  let value = initial
  let contributions = initial
  let index = 100
  const startMs = Date.parse(`${start}T03:00:00Z`)
  returns.forEach((r, i) => {
    if (i > 0) {
      const deposit = deposits[i] ?? 0
      index *= 1 + r
      value = value * (1 + r) + deposit
      contributions += deposit
    }
    items.push({
      date: ts(new Date(startMs + i * 86_400_000).toISOString()),
      portfolioValue: value,
      contributions,
      portfolioIndex: index,
      dailyReturn: i === 0 ? 0 : r,
    })
  })
  return items
}

export function makePoints(...args: Parameters<typeof makeRawSeries>): EvolutionPoint[] {
  const result = normalizeEvolution({ array: makeRawSeries(...args) })
  if (!result.ok) throw new Error('fixture failed to normalize')
  return result.evolution.points
}
