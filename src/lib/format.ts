/**
 * Formatting helpers (es-CL). The document does not declare a currency, so
 * amounts are shown with a bare `$` and no currency code.
 */
const LOCALE = 'es-CL'

const amount = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })

/** Avoids "-0" / "−$0" after rounding. */
function clean(n: number): number {
  return Math.round(n) === 0 ? 0 : n
}

export function formatMoney(n: number): string {
  const v = clean(n)
  return `${v < 0 ? '−' : ''}$${amount.format(Math.abs(v))}`
}

export function formatSignedMoney(n: number): string {
  const v = clean(n)
  if (v === 0) return '$0'
  return `${v > 0 ? '+' : '−'}$${amount.format(Math.abs(v))}`
}

export function formatCompactMoney(n: number): string {
  return `${n < 0 ? '−' : ''}$${compact.format(Math.abs(n))}`
}

/** Decimal fraction → "+5,59 %". */
export function formatSignedPct(fraction: number, digits = 2): string {
  const pct = fraction * 100
  const rounded = Number(pct.toFixed(digits))
  const body = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(rounded))
  if (rounded === 0) return `${body} %`
  return `${rounded > 0 ? '+' : '−'}${body} %`
}

export function formatPct(fraction: number, digits = 0): string {
  return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits }).format(fraction * 100)} %`
}

/** Dates are calendar days (`YYYY-MM-DD`); render them in UTC so they never shift. */
const dayFmt = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const longDayFmt = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const monthFmt = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const axisFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const axisMonthFmt = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' })
const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const day = (iso: string) => new Date(`${iso}T00:00:00Z`)
const strip = (s: string) => s.replace(/\./g, '')
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase(LOCALE) + s.slice(1)

export const formatDay = (iso: string) => strip(dayFmt.format(day(iso)))
export const formatLongDay = (iso: string) => capitalize(longDayFmt.format(day(iso)))
export const formatMonth = (yyyyMm: string) => capitalize(monthFmt.format(day(`${yyyyMm}-01`)))
export const formatAxisDay = (time: number) => strip(axisFmt.format(new Date(time)))
export const formatAxisMonth = (time: number) => strip(axisMonthFmt.format(new Date(time)))
export const formatClock = (d: Date) => timeFmt.format(d)
