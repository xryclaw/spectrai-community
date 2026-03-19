import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const preloadValidation = readFileSync(new URL('../src/preload/ipcValidation.ts', import.meta.url), 'utf8')
const taskHandlers = readFileSync(new URL('../src/main/ipc/taskHandlers.ts', import.meta.url), 'utf8')
const workspaceHandlers = readFileSync(new URL('../src/main/ipc/workspaceHandlers.ts', import.meta.url), 'utf8')
const providerHandlers = readFileSync(new URL('../src/main/ipc/providerHandlers.ts', import.meta.url), 'utf8')
const errorCodes = readFileSync(new URL('../src/shared/ipcErrorCodes.ts', import.meta.url), 'utf8')

const managedHandlerSources = [taskHandlers, workspaceHandlers, providerHandlers]

test('preload validation should preserve backend business error code when present', () => {
  assert.match(preloadValidation, /if \(value\.success === false && typeof value\.code === 'string'\) \{\s*return result\s*\}/)
  assert.match(preloadValidation, /return toErrorResult\(channel, 'IPC_RESULT_ERROR', value\.error\)/)
})

test('backend managed IPC handlers should use shared failure helpers', () => {
  for (const source of managedHandlerSources) {
    assert.match(source, /import \{ failInternalResult, failResult, IPC_ERROR_CODES \} from '\.\/errorResult'/)
    assert.match(source, /failInternalResult\(/)
    assert.match(source, /failResult\(/)
  }
})

test('backend managed IPC handlers should not return raw { success:false, error } literals', () => {
  for (const source of managedHandlerSources) {
    assert.doesNotMatch(source, /success:\s*false,\s*error:\s*/)
  }
})

test('shared IPC business error codes should include agreed core set', () => {
  const requiredCodes = [
    'INVALID_ARGUMENT',
    'NOT_FOUND',
    'RESOURCE_EXHAUSTED',
    'PATH_NOT_FOUND',
    'NOT_GIT_REPO',
    'EXTERNAL_OPERATION_FAILED',
    'INTERNAL_ERROR',
  ]

  for (const code of requiredCodes) {
    assert.match(errorCodes, new RegExp(`\\b${code}\\b`), `${code} should exist in shared error-code dictionary`)
  }
})
