// Axis helpers for the evolution chart (pure, testable).

const DAY = 86_400_000

/** Rounds [lo, hi] outwards to a "nice" step and returns the tick list. */
export function niceScale(
  lo: number,
  hi: number,
  count = 4,
): { domain: [number, number]; ticks: number[] } {
  if (!(hi > lo)) {
    const pad = Math.abs(lo) * 0.05 || 1
    return niceScale(lo - pad, hi + pad, count)
  }
  const raw = (hi - lo) / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(12)))
  return { domain: [start, end], ticks }
}

/** Month starts for long spans, weekly (counting back from the last day) for short ones. */
export function timeTicks(data: readonly { date: string; time: number }[]): {
  ticks: number[]
  monthly: boolean
} {
  const first = data[0]
  const last = data.at(-1)
  if (!first || !last) return { ticks: [], monthly: false }
  const spanDays = (last.time - first.time) / DAY
  if (spanDays > 75) {
    const ticks = data.filter((d) => d.date.endsWith('-01')).map((d) => d.time)
    return { ticks, monthly: true }
  }
  const ticks: number[] = []
  for (let t = last.time; t >= first.time; t -= 7 * DAY) ticks.unshift(t)
  return { ticks, monthly: false }
}
