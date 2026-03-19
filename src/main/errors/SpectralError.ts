export type SpectralErrorCode =
  | 'INVALID_STATE'
  | 'INVALID_TRANSITION'
  | 'TIMEOUT'
  | 'NOT_FOUND'
  | 'PROCESS_EXIT'
  | 'PERMISSION_DENIED'
  | 'UNKNOWN'

export interface SpectralErrorOptions {
  code?: SpectralErrorCode
  details?: Record<string, unknown>
  cause?: unknown
  retryable?: boolean
}

/**
 * SpectrAI 全局错误类型：统一 code / details / cause 语义。
 */
export class SpectralError extends Error {
  readonly code: SpectralErrorCode
  readonly details?: Record<string, unknown>
  readonly cause?: unknown
  readonly retryable: boolean

  constructor(message: string, options: SpectralErrorOptions = {}) {
    super(message)
    this.name = 'SpectralError'
    this.code = options.code ?? 'UNKNOWN'
    this.details = options.details
    this.cause = options.cause
    this.retryable = Boolean(options.retryable)
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      retryable: this.retryable,
      cause: this.cause instanceof Error
        ? { name: this.cause.name, message: this.cause.message }
        : this.cause,
    }
  }
}

export function toSpectralError(error: unknown, fallbackMessage = 'Unexpected error'): SpectralError {
  if (error instanceof SpectralError) return error
  if (error instanceof Error) {
    return new SpectralError(error.message || fallbackMessage, {
      cause: error,
      code: 'UNKNOWN',
    })
  }
  return new SpectralError(fallbackMessage, {
    cause: error,
    code: 'UNKNOWN',
  })
}

export function formatSpectralError(error: unknown): string {
  const normalized = toSpectralError(error)
  return `[${normalized.code}] ${normalized.message}`
}
