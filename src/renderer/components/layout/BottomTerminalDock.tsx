import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Terminal, X } from 'lucide-react'
import { ConversationView } from '../conversation'
import { useSessionStore } from '../../stores/sessionStore'
import { useUIStore } from '../../stores/uiStore'
import type { TerminalDockShell } from '../../stores/uiStore'

type ShellOption = {
  value: TerminalDockShell
  label: string
  shellPath: string
}

const SHELL_OPTIONS: ShellOption[] = [
  { value: 'zsh', label: 'zsh', shellPath: '/bin/zsh' },
  { value: 'bash', label: 'bash', shellPath: '/bin/bash' },
  { value: 'sh', label: 'shell', shellPath: '/bin/sh' },
]

function getSessionLabel(name?: string, fallback?: string): string {
  return (name || fallback || '未命名终端').trim()
}

function formatClock(): string {
  const date = new Date()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export default function BottomTerminalDock() {
  const sessions = useSessionStore((s) => s.sessions)
  const createSession = useSessionStore((s) => s.createSession)
  const terminateSession = useSessionStore((s) => s.terminateSession)

  const terminalDockOpen = useUIStore((s) => s.terminalDockOpen)
  const terminalDockCollapsed = useUIStore((s) => s.terminalDockCollapsed)
  const terminalDockSessionIds = useUIStore((s) => s.terminalDockSessionIds)
  const activeTerminalDockSessionId = useUIStore((s) => s.activeTerminalDockSessionId)
  const terminalDockShell = useUIStore((s) => s.terminalDockShell)

  const setTerminalDockOpen = useUIStore((s) => s.setTerminalDockOpen)
  const toggleTerminalDockCollapsed = useUIStore((s) => s.toggleTerminalDockCollapsed)
  const setActiveTerminalDockSession = useUIStore((s) => s.setActiveTerminalDockSession)
  const addTerminalDockSession = useUIStore((s) => s.addTerminalDockSession)
  const removeTerminalDockSession = useUIStore((s) => s.removeTerminalDockSession)
  const setTerminalDockShell = useUIStore((s) => s.setTerminalDockShell)
  const setTerminalDockSessions = useUIStore((s) => s.setTerminalDockSessions)

  const [creating, setCreating] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const dockSessions = useMemo(
    () => terminalDockSessionIds
      .map((id) => sessions.find((s) => s.id === id))
      .filter((session): session is NonNullable<typeof session> => Boolean(session)),
    [terminalDockSessionIds, sessions]
  )

  const activeSessionId = useMemo(() => {
    if (!dockSessions.length) return null
    if (activeTerminalDockSessionId && dockSessions.some((s) => s.id === activeTerminalDockSessionId)) {
      return activeTerminalDockSessionId
    }
    return dockSessions[0].id
  }, [dockSessions, activeTerminalDockSessionId])

  useEffect(() => {
    const validIds = terminalDockSessionIds.filter((id) => sessions.some((s) => s.id === id))
    if (validIds.length !== terminalDockSessionIds.length) {
      setTerminalDockSessions(validIds)
    }
  }, [sessions, terminalDockSessionIds, setTerminalDockSessions])

  useEffect(() => {
    if (!activeSessionId) return
    if (activeSessionId !== activeTerminalDockSessionId) {
      setActiveTerminalDockSession(activeSessionId)
    }
  }, [activeSessionId, activeTerminalDockSessionId, setActiveTerminalDockSession])

  const createNewTerminal = async () => {
    if (creating) return
    setCreating(true)
    setErrorText(null)

    try {
      const selectedShell = SHELL_OPTIONS.find((item) => item.value === terminalDockShell) || SHELL_OPTIONS[0]
      const providers = await window.spectrAI.provider.getAll()
      if (!providers.length) {
        throw new Error('未检测到可用 Provider，请先在设置中配置 Provider')
      }

      const cwd = window.spectrAI.app.getCwd() || ''
      if (!cwd) {
        throw new Error('无法获取当前工作目录，请确认应用初始化完成后重试')
      }

      await createSession({
        id: `terminal-${Date.now()}`,
        name: `${selectedShell.label} 终端 ${formatClock()}`,
        workingDirectory: cwd,
        providerId: providers[0]?.id || 'claude-code',
        env: {
          SHELL: selectedShell.shellPath,
        },
      })

      const latestState = useSessionStore.getState()
      const newSessionId = latestState.selectedSessionId || latestState.sessions[0]?.id
      if (newSessionId) {
        addTerminalDockSession(newSessionId)
      }
      setTerminalDockOpen(true)
    } catch (error: any) {
      setErrorText(error?.message || '新建终端失败，请稍后重试')
    } finally {
      setCreating(false)
    }
  }

  const closeDockSession = async (sessionId: string) => {
    const ok = window.confirm('关闭该终端会话将终止当前任务，是否继续？')
    if (!ok) return

    try {
      await terminateSession(sessionId)
    } finally {
      removeTerminalDockSession(sessionId)
    }
  }

  const openClass = terminalDockOpen
    ? 'translate-y-0 opacity-100'
    : 'translate-y-[calc(100%+20px)] opacity-0'

  const bodyClass = terminalDockCollapsed
    ? 'max-h-0 opacity-0'
    : 'max-h-[340px] opacity-100'

  return (
    <div className="absolute left-0 right-0 bottom-0 z-40 pointer-events-none" aria-hidden={!terminalDockOpen}>
      <div
        className={[
          'mx-3 mb-2 rounded-xl border border-border bg-bg-secondary/95 backdrop-blur-sm shadow-2xl overflow-hidden transition-all duration-200 ease-out transform-gpu',
          terminalDockOpen ? 'pointer-events-auto' : 'pointer-events-none',
          openClass,
        ].join(' ')}
      >
        <div className="h-10 border-b border-border/80 px-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
            {dockSessions.length === 0 && (
              <div className="px-2 py-1 text-xs text-text-muted">暂无终端会话，选择类型后点击右侧 + 新建</div>
            )}

            {dockSessions.map((session) => {
              const active = session.id === activeSessionId
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setActiveTerminalDockSession(session.id)}
                  className={[
                    'h-7 px-2 rounded-md text-xs border flex items-center gap-1.5 max-w-[220px] shrink-0',
                    active
                      ? 'bg-accent-blue/20 border-accent-blue/40 text-text-primary'
                      : 'bg-bg-tertiary border-border text-text-secondary hover:bg-bg-hover',
                  ].join(' ')}
                  title={getSessionLabel(session.name, session.config?.name)}
                >
                  <Terminal className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{getSessionLabel(session.name, session.config?.name)}</span>
                  <span
                    className={[
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      session.status === 'running' ? 'bg-accent-green' : 'bg-text-muted',
                    ].join(' ')}
                  />
                  <span
                    role="button"
                    aria-label="关闭终端"
                    className="inline-flex items-center justify-center rounded hover:bg-black/20 p-0.5"
                    onClick={(e) => {
                      e.stopPropagation()
                      void closeDockSession(session.id)
                    }}
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={terminalDockShell}
              onChange={(e) => setTerminalDockShell(e.target.value as TerminalDockShell)}
              className="h-7 px-2 rounded-md border border-border bg-bg-tertiary text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
              title="新终端类型"
            >
              {SHELL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void createNewTerminal()}
              disabled={creating}
              className="h-7 px-2 rounded-md border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              title="新增终端"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleTerminalDockCollapsed}
              className="h-7 px-2 rounded-md border border-border bg-bg-tertiary text-text-secondary hover:bg-bg-hover"
              title={terminalDockCollapsed ? '展开终端窗口' : '收起终端窗口'}
            >
              {terminalDockCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className={[
          'bg-bg-primary overflow-hidden transition-[max-height,opacity] duration-200 ease-out',
          bodyClass,
        ].join(' ')}>
          <div className="h-[340px]">
            {activeSessionId ? (
              <ConversationView sessionId={activeSessionId} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-text-muted">
                <span>当前没有可显示的终端</span>
                <span className="text-xs text-text-muted/80">请在右上角选择 shell 类型后点击 + 新建</span>
              </div>
            )}
          </div>
        </div>

        {errorText && (
          <div className="px-3 py-2 border-t border-accent-red/30 bg-accent-red/10 text-accent-red text-xs">
            创建失败：{errorText}
          </div>
        )}
      </div>
    </div>
  )
}
