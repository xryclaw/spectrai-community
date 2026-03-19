import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const preloadImpl = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
const preloadDts = readFileSync(new URL('../src/preload/index.d.ts', import.meta.url), 'utf8')

const requiredSessionApiMethods = [
  'sendMessage',
  'getConversation',
  'abortSession',
  'respondPermission',
  'answerQuestion',
  'approvePlan',
  'getQueue',
  'clearQueue',
]

test('preload implementation should expose SDK V2 session APIs', () => {
  for (const method of requiredSessionApiMethods) {
    assert.match(
      preloadImpl,
      new RegExp(`\\b${method}:\\s*\\(`),
      `missing session.${method} implementation in preload/index.ts`,
    )
  }
})

test('preload d.ts should declare SDK V2 session APIs', () => {
  for (const method of requiredSessionApiMethods) {
    assert.match(
      preloadDts,
      new RegExp(`\\b${method}\\??:\\s*\\(`),
      `missing session.${method} declaration in preload/index.d.ts`,
    )
  }
})
