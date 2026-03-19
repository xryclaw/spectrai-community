import { ipcMain } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { IPC } from '../../shared/constants'
import type { TerminalSessionCreateOptions, TerminalShellType } from '../../shared/types'
import type { IpcDependencies } from './index'
import { sendToRenderer } from './shared'
import { failInternalResult, failResult, IPC_ERROR_CODES } from './errorResult'

const ALLOWED_SHELL_TYPES = new Set<TerminalShellType>(['zsh', 'bash', 'shell'])

function normalizeCreateOptions(raw: unknown):
  | { ok: true; value: TerminalSessionCreateOptions }
  | { ok: false; code: (typeof IPC_ERROR_CODES)[keyof typeof IPC_ERROR_CODES]; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, value: {} }
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'terminal create options must be an object' }
  }

  const input = raw as Record<string, unknown>
  const next: TerminalSessionCreateOptions = {}

  if (input.shellType !== undefined) {
    if (typeof input.shellType !== 'string' || !ALLOWED_SHELL_TYPES.has(input.shellType as TerminalShellType)) {
      return {
        ok: false,
        code: IPC_ERROR_CODES.INVALID_ARGUMENT,
        error: 'shellType must be one of: zsh, bash, shell',
      }
    }
    next.shellType = input.shellType as TerminalShellType
  }

  if (input.name !== undefined) {
    if (typeof input.name !== 'string') {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'name must be a string' }
    }
    const trimmed = input.name.trim()
    if (!trimmed) {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'name cannot be empty' }
    }
    if (trimmed.length > 64) {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'name is too long (max 64)' }
    }
    next.name = trimmed
  }

  if (input.cwd !== undefined) {
    if (typeof input.cwd !== 'string') {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'cwd must be a string' }
    }
    const trimmed = input.cwd.trim()
    if (!trimmed) {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'cwd cannot be empty' }
    }
    const resolved = path.resolve(trimmed)
    if (!fs.existsSync(resolved)) {
      return { ok: false, code: IPC_ERROR_CODES.PATH_NOT_FOUND, error: `cwd does not exist: ${resolved}` }
    }
    if (!fs.statSync(resolved).isDirectory()) {
      return { ok: false, code: IPC_ERROR_CODES.PATH_NOT_FOUND, error: `cwd is not a directory: ${resolved}` }
    }
    next.cwd = resolved
  }

  if (input.cols !== undefined) {
    if (!Number.isInteger(input.cols)) {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'cols must be an integer' }
    }
    const cols = Number(input.cols)
    if (cols < 20 || cols > 400) {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'cols must be between 20 and 400' }
    }
    next.cols = cols
  }

  if (input.rows !== undefined) {
    if (!Number.isInteger(input.rows)) {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'rows must be an integer' }
    }
    const rows = Number(input.rows)
    if (rows < 10 || rows > 200) {
      return { ok: false, code: IPC_ERROR_CODES.INVALID_ARGUMENT, error: 'rows must be between 10 and 200' }
    }
    next.rows = rows
  }

  return { ok: true, value: next }
}

export function registerTerminalHandlers(deps: IpcDependencies): void {
  const terminalSessionManager = deps.terminalSessionManager
  if (!terminalSessionManager) return

  terminalSessionManager.on('output', (sessionId: string, chunk: string) => {
    sendToRenderer(IPC.TERMINAL_SESSION_OUTPUT, sessionId, chunk)
  })

  terminalSessionManager.on('status-change', (sessionId: string, status: string, meta: any) => {
    sendToRenderer(IPC.TERMINAL_SESSION_STATUS_CHANGE, sessionId, status, meta)
  })

  terminalSessionManager.on('removed', (sessionId: string) => {
    sendToRenderer(IPC.TERMINAL_SESSION_REMOVED, sessionId)
  })

  ipcMain.handle(IPC.TERMINAL_SESSION_CREATE, async (_event, options?: TerminalSessionCreateOptions) => {
    const normalized = normalizeCreateOptions(options)
    if (!normalized.ok) {
      return failResult(normalized.code, normalized.error)
    }

    try {
      const session = terminalSessionManager.createSession(normalized.value)
      return { success: true, session }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/limit reached/i.test(message)) {
        return failResult(IPC_ERROR_CODES.RESOURCE_EXHAUSTED, message)
      }
      if (/ENOENT|spawn/i.test(message)) {
        return failResult(IPC_ERROR_CODES.DEPENDENCY_UNAVAILABLE, message)
      }
      if (/cwd|no such file/i.test(message)) {
        return failResult(IPC_ERROR_CODES.PATH_NOT_FOUND, message)
      }
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TERMINAL_SESSION_DESTROY, async (_event, sessionId: string) => {
    try {
      const ok = terminalSessionManager.destroySession(sessionId)
      if (!ok) {
        return failResult(IPC_ERROR_CODES.NOT_FOUND, `Terminal session not found: ${sessionId}`)
      }
      return { success: true }
    } catch (error) {
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TERMINAL_SESSION_SWITCH, async (_event, sessionId: string) => {
    try {
      const session = terminalSessionManager.switchSession(sessionId)
      if (!session) {
        return failResult(IPC_ERROR_CODES.NOT_FOUND, `Terminal session not found: ${sessionId}`)
      }
      return { success: true, session }
    } catch (error) {
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TERMINAL_SESSION_GET_ALL, async () => {
    try {
      return { success: true, sessions: terminalSessionManager.getAllSessions() }
    } catch (error) {
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TERMINAL_SESSION_GET_OUTPUT, async (_event, sessionId: string) => {
    try {
      const session = terminalSessionManager.getSession(sessionId)
      if (!session) {
        return failResult(IPC_ERROR_CODES.NOT_FOUND, `Terminal session not found: ${sessionId}`)
      }
      return { success: true, chunks: terminalSessionManager.getOutput(sessionId) }
    } catch (error) {
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TERMINAL_SESSION_WRITE_INPUT, async (_event, sessionId: string, input: string) => {
    if (typeof input !== 'string') {
      return failResult(IPC_ERROR_CODES.INVALID_ARGUMENT, 'input must be a string')
    }
    if (input.includes('\u0000')) {
      return failResult(IPC_ERROR_CODES.INVALID_ARGUMENT, 'input contains invalid null character')
    }
    if (input.length > 200000) {
      return failResult(IPC_ERROR_CODES.INVALID_ARGUMENT, 'input is too long (max 200000)')
    }

    try {
      const ok = terminalSessionManager.writeInput(sessionId, input)
      if (!ok) {
        return failResult(IPC_ERROR_CODES.NOT_FOUND, `Terminal session not found or not running: ${sessionId}`)
      }
      return { success: true }
    } catch (error) {
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TERMINAL_SESSION_RESIZE, async (_event, sessionId: string, cols: number, rows: number) => {
    try {
      const ok = terminalSessionManager.resizeSession(sessionId, cols, rows)
      if (!ok) {
        return failResult(IPC_ERROR_CODES.NOT_FOUND, `Terminal session not found or not running: ${sessionId}`)
      }
      return { success: true }
    } catch (error) {
      return failInternalResult(error)
    }
  })
}
