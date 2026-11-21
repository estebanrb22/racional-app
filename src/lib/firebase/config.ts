import type { FirebaseOptions } from 'firebase/app'

/** Maps each Firebase web option to the Vite env variable that provides it. */
const ENV_KEYS = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  databaseURL: 'VITE_FIREBASE_DATABASE_URL',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const satisfies Record<string, string>

/** Options without which Firestore cannot be reached at all. */
const REQUIRED: readonly (keyof typeof ENV_KEYS)[] = ['apiKey', 'projectId', 'appId']

export const DEFAULT_DOCUMENT_PATH = 'investmentEvolutions/user1'

export type AppConfig =
  | { ok: true; firebase: FirebaseOptions; documentPath: string }
  | { ok: false; missing: string[]; invalidDocumentPath?: string }

type Env = Partial<Record<string, string | boolean | undefined>>

/**
 * A Firestore document path has an even, non-zero number of non-empty
 * segments (collection/doc[/collection/doc...]). An odd count is a collection.
 */
export function isDocumentPath(path: string): boolean {
  const segments = path.split('/')
  return segments.length >= 2 && segments.length % 2 === 0 && segments.every((s) => s.trim() !== '')
}

/** Pure: builds and validates the app configuration from an env object. */
export function readAppConfig(env: Env): AppConfig {
  const firebase: FirebaseOptions = {}
  for (const [option, envName] of Object.entries(ENV_KEYS)) {
    const value = env[envName]
    if (typeof value === 'string' && value.trim() !== '') {
      firebase[option as keyof typeof ENV_KEYS] = value.trim()
    }
  }

  const missing = REQUIRED.filter((option) => !firebase[option]).map((o) => ENV_KEYS[o])
  const rawPath = env.VITE_FIRESTORE_DOCUMENT_PATH
  const documentPath =
    typeof rawPath === 'string' && rawPath.trim() !== '' ? rawPath.trim() : DEFAULT_DOCUMENT_PATH

  if (!isDocumentPath(documentPath)) {
    return { ok: false, missing, invalidDocumentPath: documentPath }
  }
  if (missing.length > 0) return { ok: false, missing }
  return { ok: true, firebase, documentPath }
}

export const appConfig: AppConfig = readAppConfig(import.meta.env)
