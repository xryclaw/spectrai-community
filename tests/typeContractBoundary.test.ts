import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const preloadDts = readFileSync(new URL('../src/preload/index.d.ts', import.meta.url), 'utf8')

test('session SDK V2 APIs should stay declared in type contract', () => {
  const methods = [
    'sendMessage',
    'getConversation',
    'abortSession',
    'respondPermission',
    'answerQuestion',
    'approvePlan',
    'getQueue',
    'clearQueue',
    'onConversationMessage',
    'onInitData',
    'onTokenUpdate',
  ]

  for (const method of methods) {
    assert.match(
      preloadDts,
      new RegExp(`\\b${method}\\??:\\s*\\(`),
      `session.${method} should exist in preload d.ts`,
    )
  }
})

test('queue-related contracts should keep explicit error boundary fields', () => {
  assert.match(preloadDts, /getQueue\??:\s*\(sessionId: string\)\s*=>\s*Promise<\{\s*success: boolean;/)
  assert.match(preloadDts, /getQueue[\s\S]*?error\?: string\s*\}>/)

  assert.match(preloadDts, /clearQueue\??:\s*\(sessionId: string\)\s*=>\s*Promise<\{\s*success: boolean;/)
  assert.match(preloadDts, /clearQueue[\s\S]*?error\?: string\s*\}>/)
})
