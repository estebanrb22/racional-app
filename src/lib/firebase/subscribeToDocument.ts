import { doc, onSnapshot, type DocumentData, type Firestore } from 'firebase/firestore'

export interface DocumentEvent {
  exists: boolean
  data: DocumentData | undefined
  /** true when the snapshot comes from the local cache, not confirmed by the server. */
  fromCache: boolean
  hasPendingWrites: boolean
}

/**
 * Listens to a single Firestore document. Returns the unsubscribe function.
 *
 * `includeMetadataChanges` makes the listener fire again when only the
 * metadata changes (e.g. cache → server confirmation), so the UI never
 * presents cached data as confirmed by the server.
 */
export function subscribeToDocument(
  db: Firestore,
  path: string,
  onEvent: (event: DocumentEvent) => void,
  onError: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(db, path),
    { includeMetadataChanges: true },
    (snapshot) => {
      onEvent({
        exists: snapshot.exists(),
        data: snapshot.data(),
        fromCache: snapshot.metadata.fromCache,
        hasPendingWrites: snapshot.metadata.hasPendingWrites,
      })
    },
    onError,
  )
}
