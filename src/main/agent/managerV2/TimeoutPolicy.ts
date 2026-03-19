const DEFAULT_CODEX_TOOL_CALL_TIMEOUT_MS = 120000
const DEFAULT_CODEX_TOOL_CALL_SAFETY_MS = 15000
const DEFAULT_CODEX_WAIT_MAX_MS = 90000

export function getPositiveTimeout(value: unknown, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function getEnvTimeoutMs(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  return getPositiveTimeout(raw, fallback)
}

export function getCodexSafeWaitMaxMs(): number {
  const toolCallTimeoutMs = getEnvTimeoutMs(
    'SPECTRAI_CODEX_TOOL_CALL_TIMEOUT_MS',
    DEFAULT_CODEX_TOOL_CALL_TIMEOUT_MS,
  )
  const safetyBufferMs = getEnvTimeoutMs(
    'SPECTRAI_CODEX_TOOL_CALL_SAFETY_MS',
    DEFAULT_CODEX_TOOL_CALL_SAFETY_MS,
  )
  const configuredWaitMaxMs = getEnvTimeoutMs(
    'SPECTRAI_CODEX_WAIT_MAX_MS',
    DEFAULT_CODEX_WAIT_MAX_MS,
  )
  const budgetedMax = Math.max(5000, toolCallTimeoutMs - safetyBufferMs)
  return Math.max(5000, Math.min(configuredWaitMaxMs, budgetedMax))
}

export function resolveBridgeWaitTimeoutMs(
  isCodexParentSession: boolean,
  requestedTimeout: unknown,
  fallbackTimeout: number,
): number {
  const requested = getPositiveTimeout(requestedTimeout, fallbackTimeout)
  if (!isCodexParentSession) return requested

  const codexSafeMax = getCodexSafeWaitMaxMs()
  return requested <= codexSafeMax ? requested : codexSafeMax
}
