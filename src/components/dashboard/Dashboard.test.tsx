import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { EvolutionViewState } from '@/hooks/useInvestmentEvolution'
import { makePoints } from '@/test/fixtures'
import { Dashboard } from './Dashboard'

function readyState(
  points = makePoints(new Array(120).fill(0.001)),
  extra: Partial<EvolutionViewState> = {},
) {
  return {
    kind: 'ready',
    path: 'investmentEvolutions/user1',
    evolution: { points, discarded: 0 },
    fromCache: false,
    receivedAt: new Date('2026-01-01T12:00:00Z'),
    updates: 1,
    ...extra,
  } as EvolutionViewState
}

describe('Dashboard states', () => {
  it('shows a loading state, then a hint when it is slow', () => {
    const { rerender } = render(<Dashboard state={{ kind: 'connecting', slow: false }} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Cargando la evolución/)
    rerender(<Dashboard state={{ kind: 'connecting', slow: true }} />)
    expect(screen.getByRole('status')).toHaveTextContent(/tardando más de lo normal/)
  })

  it('reports missing permissions without calling it a missing document', () => {
    render(
      <Dashboard
        state={{ kind: 'error', error: { kind: 'permission-denied', code: 'permission-denied' } }}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Sin permisos para leer los datos')
    expect(alert).not.toHaveTextContent(/no existe/)
  })

  it('reports a document confirmed missing by the server', () => {
    render(<Dashboard state={{ kind: 'not-found', path: 'investmentEvolutions/user1' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('El documento no existe')
  })

  it('lists missing configuration variables', () => {
    render(<Dashboard state={{ kind: 'config-error', missing: ['VITE_FIREBASE_PROJECT_ID'] }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('VITE_FIREBASE_PROJECT_ID')
  })

  it('shows an empty state', () => {
    render(<Dashboard state={{ kind: 'empty', path: 'x/y' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Aún no hay observaciones')
  })
})

describe('Dashboard with data', () => {
  it('shows the position, the update time and the monthly table', () => {
    render(<Dashboard state={readyState(makePoints([0, 0.1]))} />)
    const hero = screen.getByRole('region', { name: 'Valor del portafolio' })
    expect(within(hero).getByText('$1.100.000')).toBeInTheDocument()
    expect(within(hero).getAllByText(/\+\$100\.000/).length).toBeGreaterThan(0)
    expect(within(hero).getByText(/Actualizado/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Resumen mensual' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Resumen mensual' })).toBeInTheDocument()
  })

  it('labels cached data as unconfirmed', () => {
    render(<Dashboard state={readyState(undefined, { fromCache: true })} />)
    expect(screen.getByText(/Sin confirmar/)).toBeInTheDocument()
    expect(screen.queryByText(/Actualizado/)).not.toBeInTheDocument()
  })

  it('re-renders with new snapshot data and announces the update', () => {
    const { rerender } = render(<Dashboard state={readyState(makePoints([0, 0.1]))} />)
    rerender(<Dashboard state={readyState(makePoints([0, 0.1, 0.1]), { updates: 2 })} />)
    const hero = screen.getByRole('region', { name: 'Valor del portafolio' })
    expect(within(hero).getByText('$1.210.000')).toBeInTheDocument()
    expect(screen.getByText(/Datos actualizados a las/)).toBeInTheDocument()
  })

  it('recomputes period stats when the range changes', async () => {
    const user = userEvent.setup()
    render(<Dashboard state={readyState()} />)
    expect(screen.getByRole('heading', { name: 'Análisis del período' })).toBeInTheDocument()
    expect(screen.getByText(/^1 ene 2019 – /)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Último mes' }))
    expect(screen.getByText('30 mar 2019 – 30 abr 2019')).toBeInTheDocument()
  })

  it('only offers ranges that the data can fill', () => {
    render(<Dashboard state={readyState(makePoints(new Array(20).fill(0)))} />)
    expect(screen.queryByRole('radio', { name: 'Último mes' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Toda la serie' })).toBeInTheDocument()
  })

  it('discloses skipped records', () => {
    render(
      <Dashboard
        state={readyState(undefined, {
          evolution: { points: makePoints([0, 0]), discarded: 3 },
        } as never)}
      />,
    )
    expect(screen.getByRole('note')).toHaveTextContent('Se omitieron 3 registros')
  })
})
