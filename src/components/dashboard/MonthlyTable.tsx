import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDay, formatMoney, formatMonth, formatSignedPct } from '@/lib/format'
import type { MonthSummary } from '@/lib/investments/metrics'
import { cn } from '@/lib/utils'

/** Month-by-month view of the whole series: also the textual alternative to the chart. */
export function MonthlyTable({ months }: { months: MonthSummary[] }) {
  return (
    <section aria-labelledby="monthly-title" className="flex flex-col gap-4">
      <h2 id="monthly-title" className="text-xl font-semibold tracking-tight">
        Resumen mensual
      </h2>
      <Card>
        <CardContent className="px-0 sm:px-(--card-spacing)">
          <Table aria-labelledby="monthly-title" className="tabular">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4 sm:pl-2">Mes</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Aportes</TableHead>
                <TableHead className="text-right">Valor al cierre</TableHead>
                <TableHead className="pr-4 text-right sm:pr-2">Rentabilidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...months].reverse().map((m) => (
                <TableRow key={m.month}>
                  <TableCell className="pl-4 sm:pl-2">
                    {formatMonth(m.month)}
                    {m.contributed > 0 && (
                      <span className="block text-xs text-muted-foreground sm:hidden">
                        Aportes {formatMoney(m.contributed)}
                      </span>
                    )}
                    {m.partial && (
                      <span className="block text-xs text-muted-foreground">
                        parcial · al {formatDay(m.endDate)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">
                    {m.contributed > 0 ? formatMoney(m.contributed) : '—'}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(m.endValue)}</TableCell>
                  <TableCell
                    className={cn(
                      'pr-4 text-right font-medium sm:pr-2',
                      m.twr > 0 && 'text-positive',
                      m.twr < 0 && 'text-negative',
                    )}
                  >
                    {formatSignedPct(m.twr)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
