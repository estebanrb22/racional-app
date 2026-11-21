import { useMemo } from 'react'
import type { ClassifiedError } from '@/lib/firebase/errors'
import { getDb } from '@/lib/firebase/client'
import type { AppConfig } from '@/lib/firebase/config'
import { normalizeEvolution } from '@/lib/investments/normalize'
import type { InvestmentEvolution } from '@/types/investment'
import { useFirestoreDocument, type DocumentState } from './useFirestoreDocument'

export type EvolutionViewState =
  | { kind: 'config-error'; missing: string[]; invalidDocumentPath?: string }
  | { kind: 'connecting'; slow: boolean }
  | { kind: 'not-found'; path: string }
  | { kind: 'offline' }
  | { kind: 'error'; error: ClassifiedError }
  | { kind: 'invalid-data' }
  | { kind: 'empty'; path: string }
  | {
      kind: 'ready'
      path: string
      evolution: InvestmentEvolution
      fromCache: boolean
      receivedAt: Date
      updates: number
    }

/** Pure mapping, kept separate so it can be tested without React or Firebase. */
export function toViewState(config: AppConfig, doc: DocumentState): EvolutionViewState {
  if (!config.ok) {
    return config.invalidDocumentPath === undefined
      ? { kind: 'config-error', missing: config.missing }
      : {
          kind: 'config-error',
          missing: config.missing,
          invalidDocumentPath: config.invalidDocumentPath,
        }
  }
  const path = config.documentPath
  switch (doc.status) {
    case 'connecting':
      return { kind: 'connecting', slow: doc.slow }
    case 'not-found':
      return { kind: 'not-found', path }
    case 'offline':
      return { kind: 'offline' }
    case 'error':
      return { kind: 'error', error: doc.error }
    case 'ready': {
      const result = normalizeEvolution(doc.data)
      if (!result.ok) return { kind: 'invalid-data' }
      if (result.evolution.points.length === 0) return { kind: 'empty', path }
      return {
        kind: 'ready',
        path,
        evolution: result.evolution,
        fromCache: doc.fromCache,
        receivedAt: doc.receivedAt,
        updates: doc.updates,
      }
    }
  }
}

/** Firestore → onSnapshot → validation → normalization → view state. */
export function useInvestmentEvolution(config: AppConfig): EvolutionViewState {
  const db = useMemo(() => (config.ok ? getDb(config.firebase) : null), [config])
  const doc = useFirestoreDocument(db, config.ok ? config.documentPath : '')
  // Normalization only reruns when the snapshot state object changes.
  return useMemo(() => toViewState(config, doc), [config, doc])
}
