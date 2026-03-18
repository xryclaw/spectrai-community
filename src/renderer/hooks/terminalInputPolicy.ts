export interface TerminalKeyEventLike {
  key: string
  isComposing?: boolean
  keyCode?: number
  which?: number
}

/**
 * 输入法候选确认（IME）期间的 Enter 需要被拦截，避免直接向终端发送回车执行命令。
 */
export function shouldBlockTerminalEnterDuringIme(event: TerminalKeyEventLike): boolean {
  if (event.key !== 'Enter') return false

  return event.isComposing === true || event.keyCode === 229 || event.which === 229
}
