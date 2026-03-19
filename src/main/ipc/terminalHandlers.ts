import { ipcMain } from 'electron'
import { IPC } from '../../shared/constants'
import type { TerminalSessionCreateOptions } from '../../shared/types'
import type { IpcDependencies } from './index'
import { sendToRenderer } from './shared'
import { failInternalResult, failResult, IPC_ERROR_CODES } from './errorResult'

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
    try {
      const session = terminalSessionManager.createSession(options || {})
      return { success: true, session }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/limit reached/i.test(message)) {
        return failResult(IPC_ERROR_CODES.RESOURCE_EXHAUSTED, message)
      }
      if (/cwd|ENOENT|no such file/i.test(message)) {
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
