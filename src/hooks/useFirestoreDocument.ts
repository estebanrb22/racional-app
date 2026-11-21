import { useEffect, useState } from 'react'
import type { DocumentData, Firestore } from 'firebase/firestore'
import { classifyFirestoreError, type ClassifiedError } from '@/lib/firebase/errors'
import { subscribeToDocument } from '@/lib/firebase/subscribeToDocument'

/** After this delay without a first snapshot the UI hints at a network problem. */
export const SLOW_CONNECTION_MS = 10_000

export type DocumentState =
  | { status: 'connecting'; slow: boolean }
  /** Document received. `fromCache` = not (yet) confirmed by the server. */
  | {
      status: 'ready'
      data: DocumentData
      fromCache: boolean
      receivedAt: Date
      /** Number of distinct data snapshots received (metadata-only events excluded). */
      updates: number
    }
  /** Server confirmed the document does not exist. */
  | { status: 'not-found' }
  /** Only the (empty) local cache answered: existence is unknown → connectivity issue. */
  | { status: 'offline' }
  | { status: 'error'; error: ClassifiedError }

interface Keyed {
  key: string
  state: DocumentState
}

const CONNECTING: DocumentState = { status: 'connecting', slow: false }

/**
 * Subscribes to one document with `onSnapshot` and exposes an explicit state
 * machine. The listener is created once per (db, path) and released on
 * unmount or when the path changes.
 */
export function useFirestoreDocument(db: Firestore | null, path: string): DocumentState {
  const [current, setCurrent] = useState<Keyed>({ key: path, state: CONNECTING })

  useEffect(() => {
    if (!db) return

    let updates = 0
    let lastData: DocumentData | undefined
    let received = false
    const set = (state: DocumentState) => setCurrent({ key: path, state })

    const slowTimer = setTimeout(() => {
      if (!received) set({ status: 'connecting', slow: true })
    }, SLOW_CONNECTION_MS)

    const unsubscribe = subscribeToDocument(
      db,
      path,
      (event) => {
        received = true
        clearTimeout(slowTimer)
        if (!event.exists || !event.data) {
          set(event.fromCache ? { status: 'offline' } : { status: 'not-found' })
          return
        }
        // Metadata-only events (e.g. cache → server confirmation) are not counted as updates.
        const isNewData = lastData === undefined || !sameData(event.data, lastData)
        if (isNewData) {
          updates += 1
          lastData = event.data
        }
        set({
          status: 'ready',
          data: lastData ?? event.data,
          fromCache: event.fromCache,
          receivedAt: new Date(),
          updates,
        })
      },
      (error) => {
        received = true
        clearTimeout(slowTimer)
        set({ status: 'error', error: classifyFirestoreError(error) })
      },
    )

    return () => {
      clearTimeout(slowTimer)
      unsubscribe()
    }
  }, [db, path])

  // A new path starts from "connecting" without a synchronous setState in the effect.
  return current.key === path ? current.state : CONNECTING
}

/**
 * Deep equality for Firestore data. Independent of map key order (Firestore
 * does not guarantee it between snapshots). Timestamps and other SDK classes
 * expose `isEqual`.
 */
export function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return Number.isNaN(a) && Number.isNaN(b)
  }
  if ('isEqual' in a && typeof a.isEqual === 'function') return a.isEqual(b) === true
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every(
    (k) =>
      Object.hasOwn(b, k) &&
      sameData((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  )
}
