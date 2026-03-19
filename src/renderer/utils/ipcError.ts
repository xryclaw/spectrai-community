import { IPC_ERROR_CODES, type IpcErrorCode } from '../../shared/ipcErrorCodes'

interface IpcLikeError {
  error?: unknown
  message?: unknown
  code?: unknown
  channel?: unknown
  details?: unknown
}

export class IpcOperationError extends Error {
  code?: IpcErrorCode
  details?: string[]

  constructor(message: string, options?: { code?: IpcErrorCode; details?: string[] }) {
    super(message)
    this.name = 'IpcOperationError'
    this.code = options?.code
    this.details = options?.details
  }
}

const DEFAULT_CODE_MESSAGE: Record<IpcErrorCode, string> = {
  [IPC_ERROR_CODES.INVALID_ARGUMENT]: '参数不合法，请检查输入后重试',
  [IPC_ERROR_CODES.NOT_FOUND]: '目标不存在或已被删除',
  [IPC_ERROR_CODES.RESOURCE_EXHAUSTED]: '资源已达上限，请稍后重试',
  [IPC_ERROR_CODES.DEPENDENCY_UNAVAILABLE]: '依赖不可用，请检查环境配置',
  [IPC_ERROR_CODES.PATH_NOT_FOUND]: '路径不存在或不可访问',
  [IPC_ERROR_CODES.NOT_GIT_REPO]: '目标目录不是 Git 仓库',
  [IPC_ERROR_CODES.EXTERNAL_OPERATION_FAILED]: '外部操作失败，请检查命令与环境',
  [IPC_ERROR_CODES.INTERNAL_ERROR]: '内部错误，请稍后重试',
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isIpcErrorCode(value: unknown): value is IpcErrorCode {
  return typeof value === 'string' && Object.values(IPC_ERROR_CODES).includes(value as IpcErrorCode)
}

function extractDetails(error: unknown): string[] | undefined {
  if (!isObject(error) || !Array.isArray(error.details)) return undefined
  const details = error.details.filter((item) => typeof item === 'string') as string[]
  return details.length > 0 ? details : undefined
}

export function extractIpcErrorCode(error: unknown): IpcErrorCode | undefined {
  if (!error) return undefined

  if (error instanceof IpcOperationError && error.code) {
    return error.code
  }

  if (error instanceof Error && isIpcErrorCode((error as any).code)) {
    return (error as any).code
  }

  if (isObject(error) && isIpcErrorCode(error.code)) {
    return error.code
  }

  return undefined
}

export function extractIpcErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (!error) return fallback
  if (typeof error === 'string') return error

  if (error instanceof Error) {
    const msg = error.message?.trim()
    return msg || fallback
  }

  if (isObject(error)) {
    const e = error as IpcLikeError
    if (typeof e.error === 'string' && e.error.trim()) return e.error
    if (typeof e.message === 'string' && e.message.trim()) return e.message

    const details = extractDetails(error)
    if (details && details.length > 0) return details.join('; ')
  }

  return fallback
}

export function resolveIpcErrorMessage(
  error: unknown,
  fallback = '操作失败',
  codeOverrides?: Partial<Record<IpcErrorCode, string>>,
): string {
  const code = extractIpcErrorCode(error)
  if (code) {
    return codeOverrides?.[code] || DEFAULT_CODE_MESSAGE[code] || extractIpcErrorMessage(error, fallback)
  }
  return extractIpcErrorMessage(error, fallback)
}

export function ensureIpcSuccess<T>(result: T, fallback = '操作失败'): T {
  if (isObject(result)) {
    const hasError = typeof result.error === 'string' && result.error.trim().length > 0
    const hasFailedSuccess = result.success === false
    if (hasError || hasFailedSuccess) {
      const code = extractIpcErrorCode(result)
      const details = extractDetails(result)
      throw new IpcOperationError(extractIpcErrorMessage(result, fallback), { code, details })
    }
  }
  return result
}
