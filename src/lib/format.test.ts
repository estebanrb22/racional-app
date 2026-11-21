import { describe, expect, it } from 'vitest'
import { formatDay, formatMonth, formatMoney, formatSignedMoney, formatSignedPct } from './format'

describe('format', () => {
  it('formats amounts in es-CL without inventing a currency code', () => {
    expect(formatMoney(1234567.6)).toBe('$1.234.568')
    expect(formatMoney(-0.2)).toBe('$0')
    expect(formatSignedMoney(1500)).toBe('+$1.500')
    expect(formatSignedMoney(-1500)).toBe('−$1.500')
  })
  it('formats signed percentages from decimal fractions', () => {
    expect(formatSignedPct(0.05587)).toBe('+5,59 %')
    expect(formatSignedPct(-0.001)).toBe('−0,10 %')
    expect(formatSignedPct(0.00001)).toBe('0,00 %')
  })
  it('renders calendar days without timezone shifts', () => {
    expect(formatDay('2019-12-22')).toBe('22 dic 2019')
    expect(formatDay('2019-01-01')).toBe('1 ene 2019')
    expect(formatMonth('2019-12')).toBe('Diciembre de 2019')
  })
})
