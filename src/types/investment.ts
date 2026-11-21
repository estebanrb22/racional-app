/**
 * Domain model derived from the observed contract of `investmentEvolutions/user1`
 * (see docs/firestore-data-model.md). Raw Firestore field names are mapped here.
 */
export interface EvolutionPoint {
  /** Calendar day, `YYYY-MM-DD`, taken from the UTC date of the Firestore Timestamp. */
  date: string
  /** UTC midnight of `date` in ms — numeric x value for the chart. */
  time: number
  /** `portfolioValue`: market value of the portfolio at the end of the day. */
  value: number
  /** `contributions`: cumulative capital contributed up to that day. */
  contributions: number
  /** `portfolioIndex`: time-weighted performance index, base 100. */
  index: number
  /** `dailyReturn`: return of that day as a decimal fraction (0.01 = 1 %). */
  dailyReturn: number
  /** Capital contributed on that day (`contributions[i] − contributions[i−1]`; first point = initial). */
  contributedToday: number
}

export interface InvestmentEvolution {
  /** Valid points, ascending by date, one per day. */
  points: EvolutionPoint[]
  /** Elements present in the document that failed validation and were skipped. */
  discarded: number
}
