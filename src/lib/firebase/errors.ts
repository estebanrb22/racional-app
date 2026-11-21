export type FirestoreErrorKind =
  'permission-denied' | 'unauthenticated' | 'unavailable' | 'not-configured' | 'unknown'

export interface ClassifiedError {
  kind: FirestoreErrorKind
  /** SDK error code, safe to show (never includes document content). */
  code: string
}

/** Maps a Firestore SDK error to a small set of user-facing categories. */
export function classifyFirestoreError(error: unknown): ClassifiedError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'unknown'

  switch (code) {
    case 'permission-denied':
      return { kind: 'permission-denied', code }
    case 'unauthenticated':
      return { kind: 'unauthenticated', code }
    case 'unavailable':
    case 'deadline-exceeded':
      return { kind: 'unavailable', code }
    case 'invalid-argument':
    case 'failed-precondition':
    case 'not-found':
      // e.g. wrong projectId / database not created
      return { kind: 'not-configured', code }
    default:
      return { kind: 'unknown', code }
  }
}
