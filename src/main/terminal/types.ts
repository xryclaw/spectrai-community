import type { IPty } from 'node-pty'
import type { RingBuffer } from '../session/types'
import type { TerminalSessionMeta, TerminalSessionStatus, TerminalShellType } from '../../shared/types'

export interface InternalTerminalSession {
  id: string
  name: string
  shellType: TerminalShellType
  shellCommand: string
  cwd: string
  pty: IPty
  outputBuffer: RingBuffer
  status: TerminalSessionStatus
  createdAt: string
  updatedAt: string
  lastActiveAt: string
  pid: number
  exitCode?: number
  signal?: number
}

export interface TerminalSessionCreateInput {
  shellType?: TerminalShellType
  cwd?: string
  cols?: number
  rows?: number
  name?: string
}

export interface TerminalSessionExitInfo {
  exitCode?: number
  signal?: number
}

export interface TerminalSessionStatusPayload {
  sessionId: string
  status: TerminalSessionStatus
  meta: TerminalSessionMeta
}
