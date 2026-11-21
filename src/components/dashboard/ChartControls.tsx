import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ChartView } from '@/components/charts/EvolutionChart'
import { RANGES, type RangeKey } from '@/lib/investments/ranges'

interface Props {
  view: ChartView
  onViewChange: (view: ChartView) => void
  range: RangeKey
  ranges: readonly RangeKey[]
  onRangeChange: (range: RangeKey) => void
}

/** View and period selectors, in one row above the chart; they drive chart and stats together. */
export function ChartControls({ view, onViewChange, range, ranges, onRangeChange }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        size="sm"
        value={view}
        onValueChange={(v) => v && onViewChange(v as ChartView)}
        aria-label="Qué mostrar en el gráfico"
      >
        <ToggleGroupItem value="value" className="px-3">
          Valor
        </ToggleGroupItem>
        <ToggleGroupItem value="return" className="px-3">
          Rentabilidad
        </ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        size="sm"
        value={range}
        onValueChange={(v) => v && onRangeChange(v as RangeKey)}
        aria-label="Período"
      >
        {RANGES.filter((r) => ranges.includes(r.key)).map((r) => (
          <ToggleGroupItem
            key={r.key}
            value={r.key}
            aria-label={r.description}
            className="px-3 tabular"
          >
            {r.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
