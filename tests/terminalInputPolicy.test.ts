import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldBlockTerminalEnterDuringIme } from '../src/renderer/hooks/terminalInputPolicy.ts'

test('should block Enter when isComposing is true', () => {
  const blocked = shouldBlockTerminalEnterDuringIme({
    key: 'Enter',
    isComposing: true,
    keyCode: 13,
  })

  assert.equal(blocked, true)
})

test('should block Enter when keyCode is 229', () => {
  const blocked = shouldBlockTerminalEnterDuringIme({
    key: 'Enter',
    isComposing: false,
    keyCode: 229,
  })

  assert.equal(blocked, true)
})

test('should block Enter when which is 229', () => {
  const blocked = shouldBlockTerminalEnterDuringIme({
    key: 'Enter',
    isComposing: false,
    which: 229,
  })

  assert.equal(blocked, true)
})

test('should allow Enter when IME is inactive', () => {
  const blocked = shouldBlockTerminalEnterDuringIme({
    key: 'Enter',
    isComposing: false,
    keyCode: 13,
  })

  assert.equal(blocked, false)
})

test('should not block non-Enter key', () => {
  const blocked = shouldBlockTerminalEnterDuringIme({
    key: 'a',
    isComposing: true,
    keyCode: 229,
  })

  assert.equal(blocked, false)
})
