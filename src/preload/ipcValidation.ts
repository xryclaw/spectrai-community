import { ipcRenderer } from 'electron'
import { IPC } from '../shared/constants'

type ArgValidator = (value: unknown, argName: string) => string | null

type ArgSchema = ArgValidator[]

interface IpcErrorResult {
  success: false
  error: string
  code: 'IPC_VALIDATION_ERROR' | 'IPC_INVOKE_ERROR' | 'IPC_RESULT_ERROR'
  channel: string
  details?: string[]
}

const MAX_TEXT_LENGTH = 200000
const MAX_PATH_LENGTH = 4096
const MAX_LIST_LENGTH = 500

const isString: ArgValidator = (value, argName) => {
  if (typeof value !== 'string') return `${argName} must be a string`
  return null
}

const nonEmptyString = (maxLen = MAX_TEXT_LENGTH): ArgValidator => (value, argName) => {
  if (typeof value !== 'string') return `${argName} must be a string`
  const trimmed = value.trim()
  if (!trimmed) return `${argName} cannot be empty`
  if (trimmed.length > maxLen) return `${argName} is too long (max ${maxLen})`
  if (trimmed.includes('\u0000')) return `${argName} contains invalid null character`
  return null
}

const optionalString = (maxLen = MAX_TEXT_LENGTH): ArgValidator => (value, argName) => {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') return `${argName} must be a string`
  if (value.length > maxLen) return `${argName} is too long (max ${maxLen})`
  if (value.includes('\u0000')) return `${argName} contains invalid null character`
  return null
}

const pathString = (): ArgValidator => (value, argName) => {
  if (typeof value !== 'string') return `${argName} must be a string`
  if (!value.trim()) return `${argName} cannot be empty`
  if (value.length > MAX_PATH_LENGTH) return `${argName} is too long (max ${MAX_PATH_LENGTH})`
  if (value.includes('\u0000')) return `${argName} contains invalid null character`
  return null
}

const booleanArg: ArgValidator = (value, argName) => {
  if (typeof value !== 'boolean') return `${argName} must be a boolean`
  return null
}

const integer = (min: number, max: number): ArgValidator => (value, argName) => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return `${argName} must be an integer`
  }
  if (value < min || value > max) return `${argName} must be between ${min} and ${max}`
  return null
}

const optionalInteger = (min: number, max: number): ArgValidator => (value, argName) => {
  if (value === undefined || value === null) return null
  return integer(min, max)(value, argName)
}

const stringArray = (maxItems = MAX_LIST_LENGTH, maxItemLen = MAX_PATH_LENGTH): ArgValidator => (value, argName) => {
  if (!Array.isArray(value)) return `${argName} must be an array`
  if (value.length > maxItems) return `${argName} has too many items (max ${maxItems})`
  for (let i = 0; i < value.length; i++) {
    const item = value[i]
    if (typeof item !== 'string') return `${argName}[${i}] must be a string`
    if (!item.trim()) return `${argName}[${i}] cannot be empty`
    if (item.length > maxItemLen) return `${argName}[${i}] is too long (max ${maxItemLen})`
    if (item.includes('\u0000')) return `${argName}[${i}] contains invalid null character`
  }
  return null
}

const objectArg: ArgValidator = (value, argName) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return `${argName} must be an object`
  }
  return null
}

const stringRecord: ArgValidator = (value, argName) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return `${argName} must be an object`
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 100) return `${argName} has too many fields`
  for (const [k, v] of entries) {
    if (!k.trim()) return `${argName} contains empty key`
    if (typeof v !== 'string') return `${argName}.${k} must be a string`
    if (v.length > MAX_TEXT_LENGTH) return `${argName}.${k} is too long`
  }
  return null
}

const optionalObject: ArgValidator = (value, argName) => {
  if (value === undefined || value === null) return null
  return objectArg(value, argName)
}

const SCHEMAS: Record<string, ArgSchema> = {
  [IPC.SESSION_TERMINATE]: [nonEmptyString(128)],
  [IPC.SESSION_DELETE]: [nonEmptyString(128)],
  [IPC.SESSION_SEND_INPUT]: [nonEmptyString(128), nonEmptyString(MAX_TEXT_LENGTH)],
  [IPC.SESSION_SEND_MESSAGE]: [nonEmptyString(128), nonEmptyString(MAX_TEXT_LENGTH)],
  [IPC.SESSION_ABORT]: [nonEmptyString(128)],
  [IPC.SESSION_PERMISSION_RESPOND]: [nonEmptyString(128), booleanArg],
  [IPC.SESSION_ANSWER_QUESTION]: [nonEmptyString(128), stringRecord],
  [IPC.SESSION_APPROVE_PLAN]: [nonEmptyString(128), booleanArg],
  [IPC.SESSION_GET_QUEUE]: [nonEmptyString(128)],
  [IPC.SESSION_CLEAR_QUEUE]: [nonEmptyString(128)],

  [IPC.TASK_CREATE]: [objectArg],
  [IPC.TASK_UPDATE]: [nonEmptyString(128), objectArg],
  [IPC.TASK_DELETE]: [nonEmptyString(128)],
  [IPC.TASK_START_SESSION]: [nonEmptyString(128), optionalObject],

  [IPC.GIT_STAGE]: [pathString(), stringArray()],
  [IPC.GIT_UNSTAGE]: [pathString(), stringArray()],
  [IPC.GIT_DISCARD]: [pathString(), stringArray()],
  [IPC.GIT_COMMIT]: [pathString(), nonEmptyString(2000)],
  [IPC.GIT_PULL]: [pathString()],
  [IPC.GIT_PUSH]: [pathString()],

  [IPC.WORKTREE_CREATE]: [pathString(), nonEmptyString(255), nonEmptyString(128)],
  [IPC.WORKTREE_REMOVE]: [pathString(), pathString(), optionalString(255), optionalString(255)],
  [IPC.WORKTREE_MERGE]: [pathString(), nonEmptyString(255), optionalObject],

  [IPC.WORKSPACE_CREATE]: [objectArg],
  [IPC.WORKSPACE_UPDATE]: [nonEmptyString(128), objectArg],
  [IPC.WORKSPACE_DELETE]: [nonEmptyString(128)],
  [IPC.WORKSPACE_SCAN_REPOS]: [pathString()],
  [IPC.WORKSPACE_IMPORT_VSCODE]: [pathString()],

  [IPC.PROVIDER_CREATE]: [objectArg],
  [IPC.PROVIDER_UPDATE]: [nonEmptyString(128), objectArg],
  [IPC.PROVIDER_DELETE]: [nonEmptyString(128)],
  [IPC.PROVIDER_REORDER]: [stringArray()],
  [IPC.PROVIDER_CHECK_CLI]: [nonEmptyString(255)],
  [IPC.PROVIDER_TEST_EXECUTABLE]: [optionalString(MAX_PATH_LENGTH)],

  ['file-manager:open-path']: [pathString()],
  ['file-manager:watch-dir']: [pathString()],
  ['file-manager:unwatch-dir']: [pathString()],
  ['file-manager:write-file']: [objectArg],
  ['file-manager:create-file']: [pathString()],
  ['file-manager:create-dir']: [pathString()],
  ['file-manager:rename']: [objectArg],
  ['file-manager:delete']: [pathString()],
  ['file-manager:show-in-folder']: [pathString()],

  [IPC.DIRECTORY_TOGGLE_PIN]: [pathString()],
  [IPC.DIRECTORY_REMOVE]: [pathString()],
  [IPC.SEARCH_LOGS]: [nonEmptyString(200), optionalString(128), optionalInteger(1, 5000)],
}

function validateArgs(channel: string, args: unknown[]): string[] {
  const schema = SCHEMAS[channel]
  if (!schema) return []

  const errors: string[] = []
  for (let i = 0; i < schema.length; i++) {
    const validator = schema[i]
    const err = validator(args[i], `arg${i + 1}`)
    if (err) errors.push(err)
  }

  if (channel === 'file-manager:write-file') {
    const payload = args[0] as { path?: unknown; content?: unknown }
    if (!payload || typeof payload !== 'object') {
      errors.push('arg1 must be { path, content } object')
    } else {
      const pathErr = pathString()(payload.path, 'arg1.path')
      if (pathErr) errors.push(pathErr)
      const contentErr = isString(payload.content, 'arg1.content')
      if (contentErr) {
        errors.push(contentErr)
      } else if ((payload.content as string).length > MAX_TEXT_LENGTH) {
        errors.push(`arg1.content is too long (max ${MAX_TEXT_LENGTH})`)
      }
    }
  }

  if (channel === 'file-manager:rename') {
    const payload = args[0] as { oldPath?: unknown; newPath?: unknown }
    if (!payload || typeof payload !== 'object') {
      errors.push('arg1 must be { oldPath, newPath } object')
    } else {
      const oldPathErr = pathString()(payload.oldPath, 'arg1.oldPath')
      if (oldPathErr) errors.push(oldPathErr)
      const newPathErr = pathString()(payload.newPath, 'arg1.newPath')
      if (newPathErr) errors.push(newPathErr)
    }
  }

  return errors
}

function toErrorResult(channel: string, code: IpcErrorResult['code'], message: string, details?: string[]): IpcErrorResult {
  return {
    success: false,
    error: message,
    code,
    channel,
    details,
  }
}

function normalizeResult(channel: string, result: unknown): unknown {
  if (!result || typeof result !== 'object') return result
  const value = result as Record<string, unknown>

  if (typeof value.error === 'string' && value.error.trim()) {
    if (value.success === false && typeof value.code === 'string') {
      return result
    }
    return toErrorResult(channel, 'IPC_RESULT_ERROR', value.error)
  }

  return result
}

export async function invokeWithValidation(channel: string, ...args: unknown[]): Promise<unknown> {
  const validationErrors = validateArgs(channel, args)
  if (validationErrors.length > 0) {
    return toErrorResult(
      channel,
      'IPC_VALIDATION_ERROR',
      `IPC parameter validation failed for ${channel}`,
      validationErrors,
    )
  }

  try {
    const result = await ipcRenderer.invoke(channel, ...args)
    return normalizeResult(channel, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return toErrorResult(channel, 'IPC_INVOKE_ERROR', message)
  }
}
