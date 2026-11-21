import { describe, expect, it } from 'vitest'
import { DEFAULT_DOCUMENT_PATH, isDocumentPath, readAppConfig } from './config'

const complete = {
  VITE_FIREBASE_API_KEY: 'fake-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-project',
  VITE_FIREBASE_APP_ID: '1:0:web:0',
}

describe('readAppConfig', () => {
  it('builds Firebase options from env and defaults the document path', () => {
    const config = readAppConfig(complete)
    expect(config).toEqual({
      ok: true,
      firebase: {
        apiKey: 'fake-key',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo-project',
        appId: '1:0:web:0',
      },
      documentPath: DEFAULT_DOCUMENT_PATH,
    })
  })

  it('reports every missing required variable', () => {
    const config = readAppConfig({ VITE_FIREBASE_API_KEY: '  ' })
    expect(config.ok).toBe(false)
    if (!config.ok) {
      expect(config.missing).toEqual([
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_APP_ID',
      ])
    }
  })

  it('rejects a collection path used as document path', () => {
    const config = readAppConfig({
      ...complete,
      VITE_FIRESTORE_DOCUMENT_PATH: 'investmentEvolutions',
    })
    expect(config).toMatchObject({ ok: false, invalidDocumentPath: 'investmentEvolutions' })
  })
})

describe('isDocumentPath', () => {
  it.each([
    ['investmentEvolutions/user1', true],
    ['a/b/c/d', true],
    ['investmentEvolutions', false],
    ['a/b/c', false],
    ['a//b', false],
    ['', false],
  ])('%s → %s', (path, expected) => {
    expect(isDocumentPath(path)).toBe(expected)
  })
})
