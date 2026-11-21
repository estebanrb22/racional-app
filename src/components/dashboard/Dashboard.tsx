import { useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import { EvolutionChart, type ChartView } from '@/components/charts/EvolutionChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { EvolutionViewState } from '@/hooks/useInvestmentEvolution'
import { formatClock, formatDay, formatMoney, formatSignedPct } from '@/lib/format'
import { computePeriodStats, summarizeByMonth, summarizePosition } from '@/lib/investments/metrics'
import { availableRanges, filterByRange, RANGES, type RangeKey } from '@/lib/investments/ranges'
import type { InvestmentEvolution } from '@/types/investment'
import { ChartControls } from './ChartControls'
import { MonthlyTable } from './MonthlyTable'
import { PeriodStatsGrid } from './PeriodStatsGrid'
import { PositionHero } from './PositionHero'
import { StatusPanel } from './StatusPanel'

export function Dashboard({ state }: { state: EvolutionViewState }) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tus inversiones</h1>
        </header>

        <main className="flex flex-col gap-8">
          {state.kind === 'ready' ? (
            <ReadyView
              evolution={state.evolution}
              updates={state.updates}
              receivedAt={state.receivedAt}
              fromCache={state.fromCache}
            />
          ) : state.kind === 'connecting' ? (
            <LoadingView slow={state.slow} />
          ) : (
            <StatusPanel state={state} />
          )}
        </main>
      </div>
    </div>
  )
}

function LoadingView({ slow }: { slow: boolean }) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <p role="status" className="text-sm text-muted-foreground">
        {slow
          ? 'Está tardando más de lo normal. Revisa tu conexión: la app sigue intentando conectar con Firestore.'
          : 'Cargando la evolución de tu portafolio…'}
      </p>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}

function ReadyView({
  evolution,
  updates,
  receivedAt,
  fromCache,
}: {
  evolution: InvestmentEvolution
  updates: number
  receivedAt: Date
  fromCache: boolean
}) {
  const { points } = evolution
  const [view, setView] = useState<ChartView>('value')
  const [selectedRange, setRange] = useState<RangeKey>('ALL')

  const ranges = useMemo(() => availableRanges(points), [points])
  // If an update shortens the series, fall back to a range that still exists.
  const range = ranges.includes(selectedRange) ? selectedRange : 'ALL'
  const visible = useMemo(() => filterByRange(points, range), [points, range])
  const summary = useMemo(() => summarizePosition(points), [points])
  const stats = useMemo(() => computePeriodStats(visible), [visible])
  const months = useMemo(() => summarizeByMonth(points), [points])

  if (!summary || !stats) return null
  const rangeLabel = RANGES.find((r) => r.key === range)?.description ?? ''
  const first = visible[0]
  const last = visible.at(-1)
  const chartSummary =
    first && last
      ? `Entre el ${formatDay(first.date)} y el ${formatDay(last.date)} el valor del portafolio pasó de ${formatMoney(first.value)} a ${formatMoney(last.value)}, con aportes por ${formatMoney(stats.contributed)} y una rentabilidad de ${formatSignedPct(stats.twr)}.`
      : ''

  return (
    <>
      {/* Announces real-time updates to screen readers (not the first load). */}
      <p className="sr-only" aria-live="polite">
        {updates > 1 ? `Datos actualizados a las ${formatClock(receivedAt)}` : ''}
      </p>

      <PositionHero
        summary={summary}
        updates={updates}
        receivedAt={receivedAt}
        fromCache={fromCache}
      />

      <section aria-labelledby="period-title" className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 id="period-title" className="text-xl font-semibold tracking-tight">
            Análisis del período
          </h2>
          <p className="text-sm text-muted-foreground">
            {rangeLabel} ·{' '}
            <span className="font-medium text-foreground tabular">
              {formatDay(stats.from)} – {formatDay(stats.to)}
            </span>
          </p>
        </div>
        <ChartControls
          view={view}
          onViewChange={setView}
          range={range}
          ranges={ranges}
          onRangeChange={setRange}
        />
        <Card>
          <CardHeader>
            <CardTitle id="chart-title">
              {view === 'value'
                ? 'Valor del portafolio y capital aportado'
                : 'Rentabilidad acumulada'}
            </CardTitle>
            {view === 'return' && (
              <CardDescription>
                Ponderada por tiempo: muestra el desempeño sin el efecto de los aportes.
              </CardDescription>
            )}
            {view === 'value' && (
              <ul
                className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
                aria-label="Leyenda"
              >
                <li className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-series-value" aria-hidden="true" />
                  Valor del portafolio
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-series-contrib" aria-hidden="true" />
                  Capital aportado
                </li>
                <li className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full bg-series-contrib ring-2 ring-card"
                    aria-hidden="true"
                  />
                  Aporte
                </li>
              </ul>
            )}
          </CardHeader>
          <CardContent className="px-2 sm:px-(--card-spacing)">
            <figure>
              <div className="h-72 sm:h-80" role="img" aria-label={chartSummary}>
                <EvolutionChart points={visible} view={view} />
              </div>
              <figcaption className="sr-only">{chartSummary}</figcaption>
            </figure>
          </CardContent>
        </Card>

        <PeriodStatsGrid stats={stats} />
      </section>

      <MonthlyTable months={months} />

      {evolution.discarded > 0 && (
        <footer className="flex gap-2 border-t pt-6 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p role="note">
            Se omitieron {evolution.discarded} registros con datos incompletos o inválidos.
          </p>
        </footer>
      )}
    </>
  )
}
