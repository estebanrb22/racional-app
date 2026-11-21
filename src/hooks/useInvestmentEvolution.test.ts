import { describe, expect, it } from 'vitest'
import type { AppConfig } from '@/lib/firebase/config'
import { makeRawSeries } from '@/test/fixtures'
import { toViewState } from './useInvestmentEvolution'

const config: AppConfig = { ok: true, firebase: {}, documentPath: 'investmentEvolutions/user1' }
const ready = (data: Record<string, unknown>) =>
  ({ status: 'ready', data, fromCache: false, receivedAt: new Date(0), updates: 1 }) as const

describe('toViewState', () => {
  it('surfaces configuration problems before anything else', () => {
    expect(
      toViewState(
        { ok: false, missing: ['VITE_FIREBASE_API_KEY'] },
        { status: 'connecting', slow: false },
      ),
    ).toEqual({
      kind: 'config-error',
      missing: ['VITE_FIREBASE_API_KEY'],
    })
  })

  it('normalizes a ready document', () => {
    const state = toViewState(config, ready({ array: makeRawSeries([0, 0.01]) }))
    expect(state.kind).toBe('ready')
    expect(state.kind === 'ready' && state.evolution.points).toHaveLength(2)
  })

  it('flags an unrecognized structure and an empty series', () => {
    expect(toViewState(config, ready({ other: 1 })).kind).toBe('invalid-data')
    expect(toViewState(config, ready({ array: [] })).kind).toBe('empty')
  })

  it('passes through connection states', () => {
    expect(toViewState(config, { status: 'not-found' })).toEqual({
      kind: 'not-found',
      path: 'investmentEvolutions/user1',
    })
    expect(toViewState(config, { status: 'offline' })).toEqual({ kind: 'offline' })
  })
})
