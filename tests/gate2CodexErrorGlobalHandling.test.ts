import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const codexRules = readFileSync(new URL('../src/main/parser/codexRules.ts', import.meta.url), 'utf8')
const parserRules = readFileSync(new URL('../src/main/parser/rules.ts', import.meta.url), 'utf8')
const ipcError = readFileSync(new URL('../src/renderer/utils/ipcError.ts', import.meta.url), 'utf8')
const useConversation = readFileSync(new URL('../src/renderer/hooks/useConversation.ts', import.meta.url), 'utf8')
const sessionStore = readFileSync(new URL('../src/renderer/stores/sessionStore.ts', import.meta.url), 'utf8')
const taskStore = readFileSync(new URL('../src/renderer/stores/taskStore.ts', import.meta.url), 'utf8')

test('codex parser should cover high-risk error stream branches', () => {
  assert.match(codexRules, /providerId:\s*'codex'/)
  assert.match(codexRules, /\/turn\\\.failed\//)
  assert.match(codexRules, /\/"type"\\s\*:\\s\*"error"\//)
  assert.match(codexRules, /\/\\\[ERROR\\\]\\s\*\(\.\+\)\/i/)
  assert.match(codexRules, /\/exit_code\[:\\s\]\+\(\\d\+\)\/i/)
})

test('parser registry should include codex rule set in final merged rules', () => {
  assert.match(parserRules, /import \{ CODEX_RULES \} from '\.\/codexRules'/)
  assert.match(parserRules, /\.\.\.CODEX_RULES/)
})

test('ipc global error normalization should throw typed operation error on failed result', () => {
  assert.match(ipcError, /export class IpcOperationError extends Error/)
  assert.match(ipcError, /this\.name = 'IpcOperationError'/)
  assert.match(ipcError, /const hasError = typeof result\.error === 'string' && result\.error\.trim\(\)\.length > 0/)
  assert.match(ipcError, /const hasFailedSuccess = result\.success === false/)
  assert.match(ipcError, /throw new IpcOperationError\(extractIpcErrorMessage\(result, fallback\), \{ code, details \}\)/)
  assert.match(ipcError, /return codeOverrides\?\.\[code\] \|\| DEFAULT_CODE_MESSAGE\[code\] \|\| extractIpcErrorMessage\(error, fallback\)/)
})

test('renderer critical paths should consume shared ipc error helpers', () => {
  assert.match(useConversation, /ensureIpcSuccess/)
  assert.match(useConversation, /extractIpcErrorMessage/)

  assert.match(sessionStore, /ensureIpcSuccess/)
  assert.match(sessionStore, /extractIpcErrorMessage/)

  assert.match(taskStore, /ensureIpcSuccess/)
  assert.match(taskStore, /resolveIpcErrorMessage/)
})
