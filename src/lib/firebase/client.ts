import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

let db: Firestore | undefined

/**
 * Single, lazily created Firestore instance for the whole app.
 * Reuses an existing Firebase app (e.g. after Vite HMR) instead of
 * initializing a second one.
 */
export function getDb(options: FirebaseOptions): Firestore {
  if (!db) {
    const app = getApps().length > 0 ? getApp() : initializeApp(options)
    db = getFirestore(app)
  }
  return db
}
