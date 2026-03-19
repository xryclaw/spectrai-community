import { IPC_ERROR_CODES, type IpcErrorCode } from '../../shared/ipcErrorCodes'

export { IPC_ERROR_CODES }

export function failResult<T extends Record<string, unknown> = Record<string, never>>(
  code: IpcErrorCode,
  error: string,
  extra?: T,
): { success: false; error: string; code: IpcErrorCode } & T {
  return {
    success: false,
    error,
    code,
    ...(extra || ({} as T)),
  }
}

export function failInternalResult<T extends Record<string, unknown> = Record<string, never>>(
  err: unknown,
  extra?: T,
): { success: false; error: string; code: IpcErrorCode } & T {
  const message = err instanceof Error ? err.message : String(err)
  return failResult(IPC_ERROR_CODES.INTERNAL_ERROR, message || 'Unknown error', extra)
}
