import { SpectralError } from '../../errors/SpectralError'

export interface RetryOptions {
  retries: number
  delayMs: number
  factor?: number
  maxDelayMs?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
  onRetry?: (error: unknown, attempt: number, nextDelayMs: number) => void
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const factor = options.factor ?? 1
  const maxDelayMs = options.maxDelayMs ?? Number.MAX_SAFE_INTEGER

  let attempt = 0
  let delay = options.delayMs

  while (true) {
    attempt += 1
    try {
      return await operation(attempt)
    } catch (error) {
      const canRetryByPolicy = options.shouldRetry ? options.shouldRetry(error, attempt) : true
      const canRetryByBudget = attempt <= options.retries
      if (!canRetryByPolicy || !canRetryByBudget) {
        throw new SpectralError('Retry attempts exhausted', {
          code: 'TIMEOUT',
          cause: error,
          details: { attempt, retries: options.retries },
          retryable: false,
        })
      }

      const nextDelayMs = Math.min(delay, maxDelayMs)
      options.onRetry?.(error, attempt, nextDelayMs)
      await wait(nextDelayMs)
      delay = Math.min(Math.floor(delay * factor), maxDelayMs)
    }
  }
}
