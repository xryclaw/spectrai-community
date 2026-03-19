import { EventEmitter } from 'events'
import * as path from 'path'
import * as pty from 'node-pty'
import { v4 as uuidv4 } from 'uuid'
import { RingBuffer } from '../session/types'
import type {
  TerminalSessionCreateOptions,
  TerminalSessionMeta,
  TerminalShellType,
  TerminalSessionStatus,
} from '../../shared/types'
import type { InternalTerminalSession, TerminalSessionCreateInput } from './types'

const MAX_TERMINAL_SESSIONS = 16
const DEFAULT_COLS = 120
const DEFAULT_ROWS = 30
const MIN_COLS = 20
const MAX_COLS = 400
const MIN_ROWS = 10
const MAX_ROWS = 200

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function normalizeShellType(shellType?: TerminalShellType): TerminalShellType {
  if (shellType === 'zsh' || shellType === 'bash' || shellType === 'shell') return shellType
  return 'shell'
}

function resolveShellCommand(shellType: TerminalShellType): string {
  if (shellType === 'zsh') return 'zsh'
  if (shellType === 'bash') return 'bash'

  const systemShell = process.env.SHELL
  if (systemShell && systemShell.trim()) return systemShell

  if (process.platform === 'win32') {
    return process.env.ComSpec || 'powershell.exe'
  }

  return '/bin/sh'
}

function normalizeCwd(input?: string): string {
  if (input && input.trim()) return path.resolve(input)
  return process.cwd()
}

function normalizeName(id: string, shellType: TerminalShellType, name?: string): string {
  const trimmed = (name || '').trim()
  if (trimmed) return trimmed.slice(0, 64)
  return `${shellType}-${id.slice(0, 8)}`
}

function safePid(ptyProcess: pty.IPty): number {
  return Number.isFinite(ptyProcess.pid) ? Number(ptyProcess.pid) : -1
}

export class TerminalSessionManager extends EventEmitter {
  private sessions: Map<string, InternalTerminalSession> = new Map()

  createSession(options: TerminalSessionCreateOptions = {}): TerminalSessionMeta {
    if (this.sessions.size >= MAX_TERMINAL_SESSIONS) {
      throw new Error(`Terminal session limit reached (max ${MAX_TERMINAL_SESSIONS})`)
    }

    const input = options as TerminalSessionCreateInput
    const shellType = normalizeShellType(input.shellType)
    const shellCommand = resolveShellCommand(shellType)
    const cwd = normalizeCwd(input.cwd)
    const cols = clamp(Number(input.cols) || DEFAULT_COLS, MIN_COLS, MAX_COLS)
    const rows = clamp(Number(input.rows) || DEFAULT_ROWS, MIN_ROWS, MAX_ROWS)

    const ptyProcess = pty.spawn(shellCommand, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    })

    const id = uuidv4()
    const now = new Date().toISOString()
    const session: InternalTerminalSession = {
      id,
      name: normalizeName(id, shellType, input.name),
      shellType,
      shellCommand,
      cwd,
      pty: ptyProcess,
      outputBuffer: new RingBuffer(6000),
      status: 'running',
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      pid: safePid(ptyProcess),
    }

    this.sessions.set(id, session)

    ptyProcess.onData((chunk: string) => {
      const current = this.sessions.get(id)
      if (!current) return
      current.outputBuffer.push(chunk)
      current.updatedAt = new Date().toISOString()
      this.emit('output', id, chunk)
    })

    ptyProcess.onExit(({ exitCode, signal }) => {
      const current = this.sessions.get(id)
      if (!current) return
      current.status = 'exited'
      current.exitCode = Number.isInteger(exitCode) ? exitCode : undefined
      current.signal = Number.isInteger(signal) ? signal : undefined
      current.updatedAt = new Date().toISOString()
      this.emit('status-change', id, current.status, this.toMeta(current))
    })

    return this.toMeta(session)
  }

  destroySession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    try {
      if (session.status === 'running') {
        session.pty.kill()
      }
    } catch {
      // ignore process cleanup errors
    }

    this.sessions.delete(sessionId)
    this.emit('removed', sessionId)
    return true
  }

  switchSession(sessionId: string): TerminalSessionMeta | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    session.lastActiveAt = new Date().toISOString()
    session.updatedAt = session.lastActiveAt
    const meta = this.toMeta(session)
    this.emit('status-change', sessionId, session.status, meta)
    return meta
  }

  writeInput(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') return false
    session.pty.write(data)
    session.updatedAt = new Date().toISOString()
    return true
  }

  resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.status !== 'running') return false

    const normalizedCols = clamp(Number(cols) || DEFAULT_COLS, MIN_COLS, MAX_COLS)
    const normalizedRows = clamp(Number(rows) || DEFAULT_ROWS, MIN_ROWS, MAX_ROWS)
    session.pty.resize(normalizedCols, normalizedRows)
    session.updatedAt = new Date().toISOString()
    return true
  }

  getOutput(sessionId: string): string[] {
    const session = this.sessions.get(sessionId)
    if (!session) return []
    return session.outputBuffer.getAll()
  }

  getSession(sessionId: string): TerminalSessionMeta | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    return this.toMeta(session)
  }

  getAllSessions(): TerminalSessionMeta[] {
    return [...this.sessions.values()]
      .sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt))
      .map((session) => this.toMeta(session))
  }

  cleanup(): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      try {
        session.pty.kill()
      } catch {
        // ignore
      }
      this.sessions.delete(sessionId)
    }
  }

  private toMeta(session: InternalTerminalSession): TerminalSessionMeta {
    return {
      id: session.id,
      name: session.name,
      shellType: session.shellType,
      shellCommand: session.shellCommand,
      cwd: session.cwd,
      pid: session.pid,
      status: session.status as TerminalSessionStatus,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastActiveAt: session.lastActiveAt,
      exitCode: session.exitCode,
      signal: session.signal,
    }
  }
}
