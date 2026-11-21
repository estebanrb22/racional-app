import type { ReactNode } from 'react'
import { formatDay, formatMoney, formatPct, formatSignedMoney, formatSignedPct } from '@/lib/format'
import type { PeriodStats } from '@/lib/investments/metrics'
import { Delta } from './Delta'

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}

export function PeriodStatsGrid({ stats }: { stats: PeriodStats }) {
  return (
    <div className="space-y-3">
      <dl aria-label="Métricas del período" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Rentabilidad"
          value={<Delta value={stats.twr}>{formatSignedPct(stats.twr)}</Delta>}
          hint="Ponderada por tiempo: no la afectan los aportes"
        />
        <Stat
          label="Ganancia de mercado"
          value={<Delta value={stats.marketGain}>{formatSignedMoney(stats.marketGain)}</Delta>}
          hint="Cambio de valor descontando aportes"
        />
        <Stat
          label="Aportes"
          value={formatMoney(stats.contributed)}
          hint={`Valor ${formatSignedMoney(stats.valueChange)} en total`}
        />
        <Stat
          label="Caída máxima"
          value={<Delta value={stats.maxDrawdown}>{formatSignedPct(stats.maxDrawdown)}</Delta>}
          hint={
            stats.positiveDaysPct === null
              ? 'Sin días suficientes'
              : `${formatPct(stats.positiveDaysPct)} de días positivos`
          }
        />
      </dl>
      {stats.bestDay && stats.worstDay && (
        <p className="text-xs text-muted-foreground">
          Mejor día: {formatDay(stats.bestDay.date)} ({formatSignedPct(stats.bestDay.return)}) ·
          Peor día: {formatDay(stats.worstDay.date)} ({formatSignedPct(stats.worstDay.return)})
        </p>
      )}
    </div>
  )
}
