import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const terminalHandlers = readFileSync(new URL('../src/main/ipc/terminalHandlers.ts', import.meta.url), 'utf8')
const preloadImpl = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
const preloadDts = readFileSync(new URL('../src/preload/index.d.ts', import.meta.url), 'utf8')

const requiredTerminalApiMethods = [
  'createSession',
  'destroySession',
  'switchSession',
  'getAllSessions',
  'getOutput',
  'writeInput',
  'resize',
  'onOutput',
  'onStatusChange',
  'onRemoved',
]

test('preload implementation should expose terminal APIs', () => {
  for (const method of requiredTerminalApiMethods) {
    assert.match(
      preloadImpl,
      new RegExp(`\\b${method}:\\s*\\(`),
      `missing terminal.${method} implementation in preload/index.ts`,
    )
  }
})

test('preload d.ts should declare terminal APIs', () => {
  for (const method of requiredTerminalApiMethods) {
    assert.match(
      preloadDts,
      new RegExp(`\\b${method}:\\s*\\(`),
      `missing terminal.${method} declaration in preload/index.d.ts`,
    )
  }
})

test('terminal handlers should enforce argument validation with stable error codes', () => {
  assert.match(terminalHandlers, /shellType must be one of: zsh, bash, shell/)
  assert.match(terminalHandlers, /IPC_ERROR_CODES\.INVALID_ARGUMENT/)
  assert.match(terminalHandlers, /IPC_ERROR_CODES\.PATH_NOT_FOUND/)
  assert.match(terminalHandlers, /IPC_ERROR_CODES\.RESOURCE_EXHAUSTED/)
  assert.match(terminalHandlers, /IPC_ERROR_CODES\.DEPENDENCY_UNAVAILABLE/)
  assert.match(terminalHandlers, /IPC_ERROR_CODES\.NOT_FOUND/)
})
