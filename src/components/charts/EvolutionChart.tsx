import { useId, useMemo } from 'react'
import { PiggyBank } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  formatAxisDay,
  formatAxisMonth,
  formatCompactMoney,
  formatLongDay,
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
} from '@/lib/format'
import { niceScale, timeTicks } from '@/lib/chartScale'
import type { EvolutionPoint } from '@/types/investment'

export type ChartView = 'value' | 'return'

interface Datum extends EvolutionPoint {
  /** Cumulative time-weighted return since the first point of the range. */
  cumReturn: number
  /** True for every point but the first: its contribution is a deposit, not the baseline. */
  isDeposit: boolean
}

export function EvolutionChart({
  points,
  view,
}: {
  points: readonly EvolutionPoint[]
  view: ChartView
}) {
  const gradientId = useId()
  const reducedMotion = usePrefersReducedMotion()

  const data = useMemo<Datum[]>(() => {
    const base = points[0]?.index ?? 1
    return points.map((p, i) => ({
      ...p,
      cumReturn: p.index / base - 1,
      isDeposit: i > 0 && p.contributedToday > 0,
    }))
  }, [points])

  const x = useMemo(() => timeTicks(data), [data])
  const y = useMemo(() => {
    if (view === 'return') {
      const values = data.map((d) => d.cumReturn)
      return niceScale(Math.min(0, ...values), Math.max(0, ...values))
    }
    const values = data.flatMap((d) => [d.value, d.contributions])
    return niceScale(Math.min(...values), Math.max(...values))
  }, [data, view])

  const deposits = data.filter((d) => d.isDeposit)
  const animation = { isAnimationActive: !reducedMotion, animationDuration: 500 }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-value)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--series-value)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="time"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={x.ticks}
          tickFormatter={x.monthly ? formatAxisMonth : formatAxisDay}
          interval="preserveStartEnd"
          minTickGap={12}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          tickMargin={8}
        />
        <YAxis
          domain={y.domain}
          ticks={y.ticks}
          tickFormatter={
            view === 'return' ? (v: number) => formatSignedPct(v, 1) : formatCompactMoney
          }
          tickLine={false}
          axisLine={false}
          width={64}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
          content={({ active, payload }) => {
            const datum = payload?.[0]?.payload as Datum | undefined
            return active && datum ? <ChartTooltip datum={datum} view={view} /> : null
          }}
          isAnimationActive={false}
        />

        {view === 'value' ? (
          <>
            <Area
              type="linear"
              dataKey="value"
              name="Valor del portafolio"
              stroke="var(--series-value)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              baseValue={y.domain[0]}
              activeDot={{
                r: 5,
                fill: 'var(--series-value)',
                stroke: 'var(--card)',
                strokeWidth: 2,
              }}
              {...animation}
            />
            <Line
              type="stepAfter"
              dataKey="contributions"
              name="Capital aportado"
              stroke="var(--series-contrib)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{
                r: 4,
                fill: 'var(--series-contrib)',
                stroke: 'var(--card)',
                strokeWidth: 2,
              }}
              {...animation}
            />
            {deposits.map((d) => (
              <ReferenceDot
                key={d.date}
                x={d.time}
                y={d.contributions}
                r={4}
                fill="var(--series-contrib)"
                stroke="var(--card)"
                strokeWidth={2}
                ifOverflow="hidden"
              />
            ))}
          </>
        ) : (
          <>
            <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.6} />
            <Area
              type="linear"
              dataKey="cumReturn"
              name="Rentabilidad acumulada"
              stroke="var(--series-value)"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              baseValue={0}
              activeDot={{
                r: 5,
                fill: 'var(--series-value)',
                stroke: 'var(--card)',
                strokeWidth: 2,
              }}
              {...animation}
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function Row({ label, value, swatch }: { label: string; value: string; swatch?: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {swatch && (
          <span
            className="h-0.5 w-3 rounded-full"
            style={{ background: swatch }}
            aria-hidden="true"
          />
        )}
        {label}
      </dt>
      <dd className="font-medium tabular">{value}</dd>
    </div>
  )
}

function ChartTooltip({ datum, view }: { datum: Datum; view: ChartView }) {
  return (
    <div className="min-w-52 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1.5 font-medium">{formatLongDay(datum.date)}</p>
      <dl className="space-y-1">
        {view === 'value' ? (
          <>
            <Row label="Valor" value={formatMoney(datum.value)} swatch="var(--series-value)" />
            <Row
              label="Aportado"
              value={formatMoney(datum.contributions)}
              swatch="var(--series-contrib)"
            />
            <Row label="Ganancia" value={formatSignedMoney(datum.value - datum.contributions)} />
          </>
        ) : (
          <>
            <Row
              label="Rentabilidad acumulada"
              value={formatSignedPct(datum.cumReturn)}
              swatch="var(--series-value)"
            />
            <Row label="Valor" value={formatMoney(datum.value)} />
          </>
        )}
        <Row label="Retorno del día" value={formatSignedPct(datum.dailyReturn)} />
      </dl>
      {datum.isDeposit && (
        <p className="mt-2 flex items-center gap-1.5 border-t pt-2 font-medium">
          <PiggyBank className="size-3.5" aria-hidden="true" />
          Aporte del día {formatSignedMoney(datum.contributedToday)}
        </p>
      )}
    </div>
  )
}
