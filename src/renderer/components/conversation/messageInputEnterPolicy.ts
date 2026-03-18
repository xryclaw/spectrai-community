export type ImeEnterState = 'idle' | 'composing'

export interface MessageInputEnterPolicyContext {
  key: string
  shiftKey: boolean
  isComposing: boolean
  nativeIsComposing: boolean
  keyCode?: number
  imeState: ImeEnterState
}

export interface MessageInputEnterPolicyDecision {
  blockSend: boolean
  nextImeState: ImeEnterState
}

/**
 * 发送判定有限状态机（新语义）：
 * - 仅 Enter（不带 Shift）尝试发送
 * - Shift+Enter 只换行，不发送
 * - IME 活跃时 Enter 不发送
 */
export function decideMessageInputEnter(ctx: MessageInputEnterPolicyContext): MessageInputEnterPolicyDecision {
  const isPlainEnter = ctx.key === 'Enter' && !ctx.shiftKey
  const runtimeImeActive = ctx.isComposing || ctx.nativeIsComposing || ctx.keyCode === 229

  if (!isPlainEnter) {
    return { blockSend: true, nextImeState: ctx.imeState }
  }

  if (runtimeImeActive) {
    return { blockSend: true, nextImeState: ctx.imeState }
  }

  // 兼容极少数输入法未触发 compositionend 的情况：本次不发送并回到 idle
  if (ctx.imeState === 'composing') {
    return { blockSend: true, nextImeState: 'idle' }
  }

  return { blockSend: false, nextImeState: 'idle' }
}

/**
 * 非 Enter 键时尝试恢复到 idle，避免状态残留导致后续 Enter 误拦截。
 */
export function normalizeImeStateOnNonEnterKey(state: ImeEnterState, key: string): ImeEnterState {
  if (state !== 'composing') return state

  const modifierKeys = new Set(['Shift', 'Control', 'Alt', 'Meta'])
  if (modifierKeys.has(key)) return state

  return 'idle'
}
