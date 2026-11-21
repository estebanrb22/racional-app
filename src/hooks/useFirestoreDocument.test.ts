import { act, renderHook } from '@testing-library/react'
import type { Firestore } from 'firebase/firestore'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sameData, SLOW_CONNECTION_MS, useFirestoreDocument } from './useFirestoreDocument'

/**
 * The Firestore SDK is mocked: these tests verify how the hook reacts to
 * snapshots and errors. They do NOT prove connectivity with the real Firestore.
 */
type Next = (snap: unknown) => void
type Fail = (err: unknown) => void
const listeners: {
  path: string
  options: unknown
  next: Next
  fail: Fail
  unsubscribe: ReturnType<typeof vi.fn>
}[] = []

vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, path: string) => ({ path }),
  onSnapshot: (ref: { path: string }, options: unknown, next: Next, fail: Fail) => {
    const unsubscribe = vi.fn()
    listeners.push({ path: ref.path, options, next, fail, unsubscribe })
    return unsubscribe
  },
}))

const db = {} as Firestore
const PATH = 'investmentEvolutions/user1'

function snapshot(data: unknown, { fromCache = false } = {}) {
  return {
    exists: () => data !== undefined,
    data: () => data,
    metadata: { fromCache, hasPendingWrites: false },
  }
}

beforeEach(() => {
  listeners.length = 0
})
afterEach(() => {
  vi.useRealTimers()
})

describe('useFirestoreDocument', () => {
  it('subscribes once to the requested document, with metadata changes', () => {
    const { result } = renderHook(() => useFirestoreDocument(db, PATH))
    expect(listeners).toHaveLength(1)
    expect(listeners[0]?.path).toBe(PATH)
    expect(listeners[0]?.options).toEqual({ includeMetadataChanges: true })
    expect(result.current).toEqual({ status: 'connecting', slow: false })
  })

  it('does not subscribe without a Firestore instance (invalid config)', () => {
    renderHook(() => useFirestoreDocument(null, PATH))
    expect(listeners).toHaveLength(0)
  })

  it('exposes the first snapshot and following updates', () => {
    const { result } = renderHook(() => useFirestoreDocument(db, PATH))
    act(() => listeners[0]?.next(snapshot({ value: 1 })))
    expect(result.current).toMatchObject({
      status: 'ready',
      data: { value: 1 },
      updates: 1,
      fromCache: false,
    })

    act(() => listeners[0]?.next(snapshot({ value: 2 })))
    expect(result.current).toMatchObject({ status: 'ready', data: { value: 2 }, updates: 2 })
  })

  it('distinguishes cached data from server-confirmed data without counting a new update', () => {
    const { result } = renderHook(() => useFirestoreDocument(db, PATH))
    act(() => listeners[0]?.next(snapshot({ value: 1 }, { fromCache: true })))
    expect(result.current).toMatchObject({ status: 'ready', fromCache: true, updates: 1 })
    act(() => listeners[0]?.next(snapshot({ value: 1 }, { fromCache: false })))
    expect(result.current).toMatchObject({ status: 'ready', fromCache: false, updates: 1 })
    // same content with a different key order is still not a new update
    act(() => listeners[0]?.next(snapshot({ b: [{ y: 2, x: 1 }], value: 1 }, { fromCache: false })))
    act(() => listeners[0]?.next(snapshot({ value: 1, b: [{ x: 1, y: 2 }] }, { fromCache: false })))
    expect(result.current).toMatchObject({ updates: 2 })
  })

  it('reports a missing document only when confirmed by the server', () => {
    const { result } = renderHook(() => useFirestoreDocument(db, PATH))
    act(() => listeners[0]?.next(snapshot(undefined, { fromCache: true })))
    expect(result.current).toEqual({ status: 'offline' })
    act(() => listeners[0]?.next(snapshot(undefined, { fromCache: false })))
    expect(result.current).toEqual({ status: 'not-found' })
  })

  it('classifies permission errors (never as "not found")', () => {
    const { result } = renderHook(() => useFirestoreDocument(db, PATH))
    act(() => listeners[0]?.fail({ code: 'permission-denied' }))
    expect(result.current).toEqual({
      status: 'error',
      error: { kind: 'permission-denied', code: 'permission-denied' },
    })
  })

  it('flags a slow first response', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useFirestoreDocument(db, PATH))
    act(() => vi.advanceTimersByTime(SLOW_CONNECTION_MS))
    expect(result.current).toEqual({ status: 'connecting', slow: true })
  })

  it('releases the listener on unmount', () => {
    const { unmount } = renderHook(() => useFirestoreDocument(db, PATH))
    unmount()
    expect(listeners[0]?.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('re-subscribes when the path changes and releases the previous listener', () => {
    const { result, rerender } = renderHook(({ path }) => useFirestoreDocument(db, path), {
      initialProps: { path: PATH },
    })
    act(() => listeners[0]?.next(snapshot({ value: 1 })))
    rerender({ path: 'investmentEvolutions/user2' })
    expect(listeners[0]?.unsubscribe).toHaveBeenCalledTimes(1)
    expect(listeners[1]?.path).toBe('investmentEvolutions/user2')
    expect(result.current).toEqual({ status: 'connecting', slow: false })
  })
})

describe('sameData', () => {
  it('ignores map key order (Firestore does not guarantee it)', () => {
    expect(sameData({ array: [{ a: 1, b: 2 }] }, { array: [{ b: 2, a: 1 }] })).toBe(true)
  })
  it('detects changed, missing and extra values', () => {
    expect(sameData({ a: [1, 2] }, { a: [1, 3] })).toBe(false)
    expect(sameData({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(sameData({ a: [1] }, { a: { 0: 1 } })).toBe(false)
  })
  it('compares Timestamp-like values with isEqual', () => {
    const t = (s: number) => ({ s, isEqual: (o: { s: number }) => o.s === s })
    expect(sameData({ d: t(1) }, { d: t(1) })).toBe(true)
    expect(sameData({ d: t(1) }, { d: t(2) })).toBe(false)
  })
})
