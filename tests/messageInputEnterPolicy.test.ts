import test from 'node:test'
import assert from 'node:assert/strict'

import { decideMessageInputEnter, normalizeImeStateOnNonEnterKey, type ImeEnterState } from '../src/renderer/components/conversation/messageInputEnterPolicy'

test('Enter in non-IME state should send', () => {
  const decision = decideMessageInputEnter({
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    nativeIsComposing: false,
    keyCode: 13,
    imeState: 'idle',
  })

  assert.equal(decision.blockSend, false)
  assert.equal(decision.nextImeState, 'idle')
})

test('Shift+Enter should never send (newline only)', () => {
  const decision = decideMessageInputEnter({
    key: 'Enter',
    shiftKey: true,
    isComposing: false,
    nativeIsComposing: false,
    keyCode: 13,
    imeState: 'idle',
  })

  assert.equal(decision.blockSend, true)
  assert.equal(decision.nextImeState, 'idle')
})

test('IME candidate Enter should not send', () => {
  const decision = decideMessageInputEnter({
    key: 'Enter',
    shiftKey: false,
    isComposing: true,
    nativeIsComposing: false,
    keyCode: 13,
    imeState: 'composing',
  })

  assert.equal(decision.blockSend, true)
})

test('Enter should be blocked when runtime IME signal exists', () => {
  const decision = decideMessageInputEnter({
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    nativeIsComposing: true,
    keyCode: 229,
    imeState: 'composing',
  })

  assert.equal(decision.blockSend, true)
  assert.equal(decision.nextImeState, 'composing')
})

test('missing compositionend fallback: stale composing blocks once then recovers', () => {
  const first = decideMessageInputEnter({
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    nativeIsComposing: false,
    keyCode: 13,
    imeState: 'composing',
  })

  assert.equal(first.blockSend, true)
  assert.equal(first.nextImeState, 'idle')

  const second = decideMessageInputEnter({
    key: 'Enter',
    shiftKey: false,
    isComposing: false,
    nativeIsComposing: false,
    keyCode: 13,
    imeState: first.nextImeState,
  })

  assert.equal(second.blockSend, false)
  assert.equal(second.nextImeState, 'idle')
})

test('non-enter key clears stale composing state', () => {
  const next: ImeEnterState = normalizeImeStateOnNonEnterKey('composing', 'a')
  assert.equal(next, 'idle')
})
