import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { IPC } from '../src/shared/constants.ts'

const preloadImpl = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
const sessionHandlers = readFileSync(new URL('../src/main/ipc/sessionHandlers.ts', import.meta.url), 'utf8')
const ipcIndex = readFileSync(new URL('../src/main/ipc/index.ts', import.meta.url), 'utf8')

const criticalChannels = [
  'SESSION_SEND_MESSAGE',
  'SESSION_ABORT',
  'SESSION_CONVERSATION_HISTORY',
  'SESSION_PERMISSION_RESPOND',
  'SESSION_ANSWER_QUESTION',
  'SESSION_APPROVE_PLAN',
  'SESSION_GET_QUEUE',
  'SESSION_CLEAR_QUEUE',
] as const

test('critical IPC constants should be non-empty strings', () => {
  for (const key of criticalChannels) {
    const value = IPC[key]
    assert.equal(typeof value, 'string', `${key} should be a string`)
    assert.ok(value.length > 0, `${key} should not be empty`)
  }
})

test('critical channels should be wired from preload call-site to main handler', () => {
  for (const key of criticalChannels) {
    assert.match(
      preloadImpl,
      new RegExp(`(ipcRenderer\\.invoke|invokeWithValidation)\\(IPC\\.${key}`),
      `preload call-site missing for ${key}`,
    )
    assert.match(
      sessionHandlers,
      new RegExp(`ipcMain\\.handle\\(IPC\\.${key}`),
      `session handler missing for ${key}`,
    )
  }
})

test('ipc index should register session handlers in global registration flow', () => {
  assert.match(ipcIndex, /registerSessionHandlers\(deps\)/)
})
