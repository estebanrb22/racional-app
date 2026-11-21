import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Signed figure: sign + icon + color, so direction never depends on color alone. */
export function Delta({
  value,
  children,
  className,
}: {
  value: number
  children: React.ReactNode
  className?: string
}) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        value > 0 && 'text-positive',
        value < 0 && 'text-negative',
        value === 0 && 'text-muted-foreground',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  )
}
