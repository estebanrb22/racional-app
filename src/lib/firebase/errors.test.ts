import { describe, expect, it } from 'vitest'
import { classifyFirestoreError } from './errors'

describe('classifyFirestoreError', () => {
  it.each([
    ['permission-denied', 'permission-denied'],
    ['unauthenticated', 'unauthenticated'],
    ['unavailable', 'unavailable'],
    ['deadline-exceeded', 'unavailable'],
    ['invalid-argument', 'not-configured'],
    ['internal', 'unknown'],
  ])('%s → %s', (code, kind) => {
    expect(classifyFirestoreError({ code })).toEqual({ kind, code })
  })

  it('handles non-Firebase errors', () => {
    expect(classifyFirestoreError(new Error('boom'))).toEqual({ kind: 'unknown', code: 'unknown' })
  })
})
