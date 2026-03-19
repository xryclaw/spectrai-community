import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sessionHandlers = readFileSync(new URL('../src/main/ipc/sessionHandlers.ts', import.meta.url), 'utf8')

const guardedHandlers = [
  'SESSION_SEND_MESSAGE',
  'SESSION_ABORT',
  'SESSION_PERMISSION_RESPOND',
  'SESSION_ANSWER_QUESTION',
  'SESSION_APPROVE_PLAN',
  'SESSION_GET_QUEUE',
  'SESSION_CLEAR_QUEUE',
] as const

test('SDK V2 IPC handlers should return unified error when SessionManagerV2 is missing', () => {
  for (const key of guardedHandlers) {
    assert.match(
      sessionHandlers,
      new RegExp(
        `ipcMain\\.handle\\(IPC\\.${key}[\\s\\S]*?if \\(!smV2\\)[\\s\\S]*?success: false, error: 'SDK V2 SessionManager 未初始化'`,
      ),
      `${key} missing !smV2 failure-path contract`,
    )
  }
})

test('SDK V2 IPC handlers should catch runtime errors and return { success: false, error }', () => {
  for (const key of guardedHandlers) {
    assert.match(
      sessionHandlers,
      new RegExp(
        `ipcMain\\.handle\\(IPC\\.${key}[\\s\\S]*?catch \\(error: any\\) \\{[\\s\\S]*?return \\{ success: false, error: error\\.message \\}`,
      ),
      `${key} missing catch failure-path contract`,
    )
  }
})
