import { CalendarDays, Clock, CloudOff } from 'lucide-react'
import {
  formatClock,
  formatDay,
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
} from '@/lib/format'
import type { PositionSummary } from '@/lib/investments/metrics'
import { Delta } from './Delta'

interface Props {
  summary: PositionSummary
  updates: number
  receivedAt: Date
  /** Snapshot served from the local cache, not yet confirmed by the server. */
  fromCache: boolean
}

export function PositionHero({ summary, updates, receivedAt, fromCache }: Props) {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <h2 id="hero-title" className="text-sm font-medium text-muted-foreground">
          Valor del portafolio
        </h2>
        <p className="text-right text-xs text-muted-foreground">
          {fromCache ? (
            <span className="inline-flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
              <CloudOff className="size-3.5" aria-hidden="true" />
              Sin confirmar · datos en caché de las{' '}
              <span className="tabular">{formatClock(receivedAt)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden="true" />
              Actualizado <span className="tabular">{formatClock(receivedAt)}</span>
            </span>
          )}
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          {/* key → a discreet highlight replays when a new snapshot changes the data */}
          <p
            key={updates}
            className="w-fit rounded-md text-4xl font-semibold tracking-tight sm:text-5xl data-[updated=true]:animate-[flash_1.2s_ease-out]"
            data-updated={updates > 1}
          >
            {formatMoney(summary.value)}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Delta value={summary.gain}>
              {formatSignedMoney(summary.gain)}
              {summary.gainPct !== null && ` (${formatSignedPct(summary.gainPct)})`}
            </Delta>
            <span className="text-muted-foreground">ganancia sobre lo aportado</span>
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            Datos al {formatDay(summary.asOf)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:min-w-80">
          <div className="rounded-xl border bg-card px-4 py-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-0.5 w-3 rounded-full bg-series-contrib" aria-hidden="true" />
              Capital aportado
            </dt>
            <dd className="mt-1 text-lg font-semibold">{formatMoney(summary.contributed)}</dd>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">Ganancia acumulada</dt>
            <dd className="mt-1 text-lg font-semibold">
              <Delta value={summary.gain}>{formatSignedMoney(summary.gain)}</Delta>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
