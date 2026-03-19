/**
 * Task IPC 处理器 - 任务管理
 */
import { ipcMain } from 'electron'
import { IPC } from '../../shared/constants'
import { BUILTIN_CLAUDE_PROVIDER } from '../../shared/types'
import type { AIProvider, SessionConfig } from '../../shared/types'
import { GitWorktreeService } from '../git/GitWorktreeService'
import { WorktreeRiskGuard } from '../git/WorktreeRiskGuard'
import {
  scheduleCleanupCompensation,
  withRepoProvisionCleanupLock,
} from '../git/WorktreeSessionSafety'
import {
  buildWorktreeAlreadyActivePrompt,
  injectWorkspaceSection,
  injectWorktreeAlreadyActiveRule,
  injectWorktreeAlreadyActiveToAgentsMd,
  injectWorktreeAlreadyActiveToGeminiMd,
} from '../agent/supervisorPrompt'
import { v4 as uuidv4 } from 'uuid'
import type { IpcDependencies } from './index'
import { failInternalResult, failResult, IPC_ERROR_CODES } from './errorResult'

type RepoDescriptor = {
  id: string
  repoPath: string
  isPrimary: boolean
  name?: string
}

function sanitizeToken(value: unknown, fallback: string, maxLength = 48): string {
  const raw = typeof value === 'string' ? value : ''
  const sanitized = raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
  return sanitized || fallback
}

function normalizeBranchBase(task: any): string {
  const titleToken = sanitizeToken(task?.title || '', 'task', 40)
  const taskToken = sanitizeToken(task?.id || '', 'task', 12)
  const fallback = `task/${titleToken || taskToken}`

  const raw = typeof task?.gitBranch === 'string' && task.gitBranch.trim()
    ? task.gitBranch.trim().toLowerCase()
    : fallback

  const normalized = raw
    .replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/-{2,}/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '')

  if (!normalized) return fallback
  return normalized.includes('/') ? normalized.slice(0, 120) : `task/${normalized.slice(0, 110)}`
}

async function resolveSharedBranchName(
  gitService: GitWorktreeService,
  repos: RepoDescriptor[],
  preferredBranch: string,
  uniqueSeed: string,
): Promise<string> {
  const candidates = [preferredBranch, `${preferredBranch}-${uniqueSeed}`]

  for (const candidate of candidates) {
    const existsList = await Promise.all(repos.map(r => gitService.branchExists(r.repoPath, candidate)))
    if (existsList.every(exists => !exists)) {
      return candidate
    }
  }

  for (let i = 1; i <= 1000; i++) {
    const candidate = `${preferredBranch}-${uniqueSeed}-${i}`
    const existsList = await Promise.all(repos.map(r => gitService.branchExists(r.repoPath, candidate)))
    if (existsList.every(exists => !exists)) {
      return candidate
    }
  }

  throw new Error(`无法为分支 ${preferredBranch} 生成唯一名称，请稍后重试`)
}

type CleanupFailure = {
  key: string
  repoId?: string
  repoPath: string
  worktreePath: string
  branchName?: string
  reason: string
}

async function cleanupTaskWorktreesBestEffort(task: any, database: any, gitService: GitWorktreeService): Promise<CleanupFailure[]> {
  const failures: CleanupFailure[] = []
  if (!task?.worktreeEnabled) return failures

  if (task.workspaceId && task.worktreePaths) {
    const workspace = database.getWorkspace(task.workspaceId)
    if (!workspace?.repos?.length) return failures

    await Promise.all(
      workspace.repos.map(async (repo: any) => {
        const wtp = task.worktreePaths?.[repo.id]
        if (!wtp) return
        try {
          await gitService.removeWorktree(repo.repoPath, wtp, {
            deleteBranch: true,
            branchName: task.gitBranch,
          })
        } catch (err: any) {
          failures.push({
            key: `${task.id}:${repo.repoPath}:${wtp}`,
            repoId: String(repo.id),
            repoPath: repo.repoPath,
            worktreePath: wtp,
            branchName: task.gitBranch,
            reason: err?.message || 'cleanup failed',
          })
        }
      })
    )
    return failures
  }

  if (task.worktreePath && task.gitRepoPath) {
    try {
      await gitService.removeWorktree(task.gitRepoPath, task.worktreePath, {
        deleteBranch: true,
        branchName: task.gitBranch,
      })
    } catch (err: any) {
      failures.push({
        key: `${task.id}:${task.gitRepoPath}:${task.worktreePath}`,
        repoPath: task.gitRepoPath,
        worktreePath: task.worktreePath,
        branchName: task.gitBranch,
        reason: err?.message || 'cleanup failed',
      })
    }
  }

  return failures
}

export function registerTaskHandlers(deps: IpcDependencies): void {
  const { database, sessionManagerV2, concurrencyGuard, taskCoordinator } = deps
  const riskGuard = WorktreeRiskGuard.getInstance()
  const worktreeFallbackMode = (process.env.WORKTREE_FALLBACK_MODE || 'disabled').toLowerCase()

  // ==================== Task 相关 ====================

  ipcMain.handle(IPC.TASK_CREATE, async (_event, task: any) => {
    try {
      const taskId = task.id || uuidv4()
      const taskData: any = {
        id: taskId,
        title: task.title || 'Untitled',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        tags: task.tags || [],
        parentTaskId: task.parentTaskId,
        worktreeEnabled: task.worktreeEnabled || false,
        gitRepoPath: task.gitRepoPath,
        gitBranch: task.gitBranch,
        workspaceId: task.workspaceId,
      }

      const created = database.createTask(taskData)
      return { success: true, taskId: created.id }
    } catch (error: any) {
      console.error('[IPC] TASK_CREATE error:', error)
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TASK_UPDATE, async (_event, taskId: string, updates: any) => {
    try {
      database.updateTask(taskId, updates)
      return { success: true }
    } catch (error: any) {
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TASK_DELETE, async (_event, taskId: string) => {
    try {
      const task = database.getTask(taskId)
      const gitService = new GitWorktreeService()

      // 清理：工作区多仓库 worktree
      if (task?.worktreeEnabled && task.workspaceId && task.worktreePaths) {
        const workspace = database.getWorkspace(task.workspaceId)
        if (workspace) {
          await Promise.allSettled(
            workspace.repos.map(async (repo: any) => {
              const wtp = task.worktreePaths![repo.id]
              if (wtp) {
                try {
                  await gitService.removeWorktree(repo.repoPath, wtp, {
                    deleteBranch: true,
                    branchName: task.gitBranch,
                  })
                } catch (wtErr: any) {
                  console.warn(`[IPC] Multi-repo worktree cleanup failed (${repo.repoPath}):`, wtErr.message)
                }
              }
            })
          )
        }
      }
      // 清理：单仓库 worktree（向后兼容）
      else if (task?.worktreeEnabled && task.worktreePath && task.gitRepoPath) {
        try {
          await gitService.removeWorktree(task.gitRepoPath, task.worktreePath, {
            deleteBranch: true,
            branchName: task.gitBranch,
          })
        } catch (wtErr: any) {
          console.warn('[IPC] Worktree cleanup on delete failed:', wtErr.message)
        }
      }

      database.deleteTask(taskId)
      return { success: true }
    } catch (error: any) {
      return failInternalResult(error)
    }
  })

  ipcMain.handle(IPC.TASK_GET_ALL, async () => {
    try {
      return database.getAllTasks()
    } catch (error) {
      console.error('[IPC] TASK_GET_ALL error:', error)
      return []
    }
  })

  ipcMain.handle(IPC.TASK_START_SESSION, async (_event, taskId: string, config?: Partial<SessionConfig>) => {
    try {
      const task = database.getTask(taskId)
      if (!task) {
        return failResult(IPC_ERROR_CODES.NOT_FOUND, '任务不存在')
      }

      const allSessions = database.getAllSessions()
      const existingActive = allSessions.find(s =>
        s.taskId === taskId &&
        (s.status === 'running' || s.status === 'idle' || s.status === 'waiting_input' || s.status === 'starting')
      )
      if (existingActive) {
        return { success: true, sessionId: existingActive.id, reused: true }
      }

      const resourceCheck = concurrencyGuard.checkResources()
      if (!resourceCheck.canCreate) {
        return failResult(IPC_ERROR_CODES.RESOURCE_EXHAUSTED, resourceCheck.reason || '资源不足，无法创建新会话')
      }

      const sessionId = uuidv4()
      const gitServiceForSession = new GitWorktreeService()

      let workDir = config?.workingDirectory || process.cwd()
      let activeWorktreePath: string | undefined
      let activeWorktreeSourceRepo: string | undefined
      let activeWorktreeBranch: string | undefined
      let activeWorktreeBaseBranch: string | undefined
      let activeWorktreeBaseCommit: string | undefined
      let createdWorktreePaths: Record<string, string> | undefined
      let worktreeCleanupState: 'ok' | 'pending' = 'ok'
      let worktreeFallbackState: 'disabled' | 'not_used' | 'used' = worktreeFallbackMode === 'disabled' ? 'disabled' : 'not_used'

      if (task.worktreeEnabled) {
        const repos: RepoDescriptor[] = []

        if (task.workspaceId) {
          const workspace = database.getWorkspace(task.workspaceId)
          if (!workspace?.repos?.length) {
            return failResult(IPC_ERROR_CODES.NOT_FOUND, '工作区不存在或未配置仓库')
          }
          for (const repo of workspace.repos) {
            repos.push({
              id: String(repo.id),
              repoPath: String(repo.repoPath),
              isPrimary: !!repo.isPrimary,
              name: repo.name,
            })
          }
        } else if (task.gitRepoPath) {
          repos.push({ id: 'single', repoPath: task.gitRepoPath, isPrimary: true, name: 'repo' })
        } else {
          return failResult(IPC_ERROR_CODES.INVALID_ARGUMENT, '任务已启用 Worktree，但未配置仓库路径')
        }

        const primaryRepo = repos.find(r => r.isPrimary) || repos[0]
        const preferredBranch = normalizeBranchBase(task)
        const uniqueSeed = sanitizeToken(`${sessionId.slice(0, 8)}-${Date.now().toString(36)}`, sessionId.slice(0, 8), 24)

        try {
          await withRepoProvisionCleanupLock(
            repos.map(r => r.repoPath),
            async () => {
              const cleanupFailures = await cleanupTaskWorktreesBestEffort(task, database, gitServiceForSession)
              if (cleanupFailures.length > 0) {
                worktreeCleanupState = 'pending'
                for (const failure of cleanupFailures) {
                  scheduleCleanupCompensation({
                    key: failure.key,
                    reason: failure.reason,
                    run: async () => {
                      await gitServiceForSession.removeWorktree(failure.repoPath, failure.worktreePath, {
                        deleteBranch: true,
                        branchName: failure.branchName,
                      })
                    },
                  })
                }
              }

              const createdByRepoPath = new Map<string, { worktreePath: string; branchName: string; repoId: string }>()
              let resolvedSessionBranch: string | undefined
              try {
                activeWorktreeBaseBranch = await gitServiceForSession.getCurrentBranch(primaryRepo.repoPath)
                activeWorktreeBaseCommit = await gitServiceForSession.getHeadCommit(primaryRepo.repoPath)

                const resolvedBranch = await resolveSharedBranchName(
                  gitServiceForSession,
                  repos,
                  preferredBranch,
                  uniqueSeed,
                )
                resolvedSessionBranch = resolvedBranch

                const nextWorktreePaths: Record<string, string> = {}

                for (const repo of repos) {
                  const scopedTaskId = sanitizeToken(
                    `${taskId}-${sessionId.slice(0, 8)}-${repo.id}`,
                    `${taskId}-${sessionId.slice(0, 8)}`,
                    96,
                  )
                  const result = await gitServiceForSession.createIsolatedWorktree(
                    repo.repoPath,
                    resolvedBranch,
                    scopedTaskId,
                    uniqueSeed,
                  )

                  nextWorktreePaths[repo.id] = result.worktreePath
                  createdByRepoPath.set(repo.repoPath, {
                    worktreePath: result.worktreePath,
                    branchName: result.branch,
                    repoId: repo.id,
                  })
                }

                activeWorktreePath = nextWorktreePaths[primaryRepo.id]
                activeWorktreeSourceRepo = primaryRepo.repoPath
                activeWorktreeBranch = resolvedBranch
                createdWorktreePaths = nextWorktreePaths
                workDir = activeWorktreePath || primaryRepo.repoPath || workDir

                if (task.workspaceId) {
                  database.updateTask(taskId, {
                    gitBranch: resolvedBranch,
                    worktreePaths: nextWorktreePaths,
                    worktreePath: activeWorktreePath,
                  })
                } else {
                  database.updateTask(taskId, {
                    gitBranch: resolvedBranch,
                    worktreePath: activeWorktreePath,
                    worktreePaths: null as any,
                  })
                }
              } catch (wtErr: any) {
                const rollbackFailures: CleanupFailure[] = []

                await Promise.allSettled(
                  repos.map(async repo => {
                    const created = createdByRepoPath.get(repo.repoPath)
                    if (!created) return
                    const rollbackBranch = created.branchName || resolvedSessionBranch || activeWorktreeBranch || undefined
                    try {
                      await gitServiceForSession.removeWorktree(repo.repoPath, created.worktreePath, {
                        deleteBranch: true,
                        branchName: rollbackBranch,
                      })
                    } catch (rollbackErr: any) {
                      rollbackFailures.push({
                        key: `${taskId}:${repo.repoPath}:${created.worktreePath}`,
                        repoId: created.repoId,
                        repoPath: repo.repoPath,
                        worktreePath: created.worktreePath,
                        branchName: rollbackBranch,
                        reason: rollbackErr?.message || 'rollback cleanup failed',
                      })
                    }
                  })
                )

                if (rollbackFailures.length > 0) {
                  worktreeCleanupState = 'pending'

                  for (const failure of rollbackFailures) {
                    scheduleCleanupCompensation({
                      key: failure.key,
                      reason: failure.reason,
                      run: async () => {
                        await gitServiceForSession.removeWorktree(failure.repoPath, failure.worktreePath, {
                          deleteBranch: true,
                          branchName: failure.branchName,
                        })
                      },
                    })
                  }

                  if (task.workspaceId) {
                    const pendingWorktreePaths: Record<string, string> = {}
                    for (const failure of rollbackFailures) {
                      if (failure.repoId) {
                        pendingWorktreePaths[failure.repoId] = failure.worktreePath
                      }
                    }
                    database.updateTask(taskId, {
                      gitBranch: resolvedSessionBranch || task.gitBranch,
                      worktreePaths: pendingWorktreePaths,
                      worktreePath: pendingWorktreePaths[primaryRepo.id] || '',
                    })
                  } else {
                    const primaryFailure = rollbackFailures[0]
                    database.updateTask(taskId, {
                      gitBranch: primaryFailure?.branchName || resolvedSessionBranch || task.gitBranch,
                      worktreePath: primaryFailure?.worktreePath || '',
                      worktreePaths: null as any,
                    })
                  }
                }

                throw wtErr
              }
            }
          )
        } catch (wtErr: any) {
          riskGuard.recordProvisionFailure(String(wtErr?.message || wtErr || 'unknown'))

          // 联调期风险防护：默认关闭自动 fallback，避免在主仓直接继续导致污染。
          // 若设置为 approve，仍不自动执行 fallback，改为显式失败等待上层审批流程。
          if (worktreeFallbackMode !== 'disabled') {
            worktreeFallbackState = 'used'
            riskGuard.recordFallbackAttempt(true)
            return failResult(IPC_ERROR_CODES.EXTERNAL_OPERATION_FAILED, 'Worktree 创建失败，fallback 需审批后执行')
          }

          worktreeFallbackState = 'disabled'
          riskGuard.recordFallbackAttempt(false)
          console.error('[IPC] Session worktree creation failed:', wtErr)
          return failResult(IPC_ERROR_CODES.EXTERNAL_OPERATION_FAILED, `会话 Worktree 创建失败: ${wtErr.message || '未知错误'}`)
        }
      }

      if (task.worktreeEnabled && worktreeFallbackMode === 'disabled') {
        riskGuard.recordFallbackAttempt(false)
      }

      const provider: AIProvider = database.getProvider(config?.providerId || 'claude-code') || BUILTIN_CLAUDE_PROVIDER
      const sessionConfig: SessionConfig = {
        id: sessionId,
        name: task.title || 'Task Session',
        taskId,
        autoAccept: config?.autoAccept,
        claudeArgs: config?.claudeArgs,
        initialPrompt: config?.initialPrompt,
        providerId: provider.id,
        ...config,
        workingDirectory: workDir,
      }

      if (activeWorktreePath) {
        sessionConfig.worktreePath = activeWorktreePath
        sessionConfig.worktreeBranch = activeWorktreeBranch
        sessionConfig.worktreeSourceRepo = activeWorktreeSourceRepo
        sessionConfig.worktreeBaseBranch = activeWorktreeBaseBranch
        sessionConfig.worktreeBaseCommit = activeWorktreeBaseCommit
        ;(sessionConfig as any).worktreeWorkspaceMode = task.workspaceId ? 'workspace' : 'single'
        ;(sessionConfig as any).worktreeCleanupState = worktreeCleanupState
        ;(sessionConfig as any).worktreeFallbackState = worktreeFallbackState

        try {
          if (provider.id === 'claude-code') {
            injectWorktreeAlreadyActiveRule(workDir, activeWorktreeBranch)
          } else if (provider.id === 'codex') {
            injectWorktreeAlreadyActiveToAgentsMd(workDir, activeWorktreeBranch)
          } else if (provider.id === 'gemini-cli') {
            injectWorktreeAlreadyActiveToGeminiMd(workDir, activeWorktreeBranch)
          } else {
            const prompt = buildWorktreeAlreadyActivePrompt(activeWorktreeBranch)
            sessionConfig.systemPromptAppend = sessionConfig.systemPromptAppend
              ? `${sessionConfig.systemPromptAppend}\n\n${prompt}`
              : prompt
          }
        } catch (injectErr: any) {
          console.warn('[IPC] Failed to inject already-active worktree rule:', injectErr.message)
        }
      }

      sessionManagerV2?.createSession(sessionConfig, provider)
      concurrencyGuard.registerSession()

      // 注入 Workspace 多仓库上下文（追加到 .claude/rules/spectrai-session.md）
      if (task.workspaceId && createdWorktreePaths) {
        try {
          const workspace = database.getWorkspace(task.workspaceId)
          if (workspace) {
            const reposForSection = workspace.repos.map((r: any) => ({
              name: r.name,
              worktreePath: createdWorktreePaths?.[r.id] || r.repoPath,
              isPrimary: r.isPrimary,
            }))
            injectWorkspaceSection(workDir, reposForSection)
          }
        } catch (injectErr: any) {
          console.warn('[IPC] Failed to inject workspace section:', injectErr.message)
        }
      }

      database.createSession({
        id: sessionId,
        name: sessionConfig.name,
        workingDirectory: sessionConfig.workingDirectory,
        status: 'running',
        estimatedTokens: 0,
        config: sessionConfig,
        taskId,
        providerId: provider.id,
      })

      database.recordDirectoryUsage(sessionConfig.workingDirectory)

      if (task.status === 'todo' || task.status === 'waiting') {
        database.updateTask(taskId, { status: 'in_progress' })
        if (taskCoordinator) {
          taskCoordinator.emit('task-updated', taskId, { status: 'in_progress' })
        }
      }

      return {
        success: true,
        sessionId,
        reused: false,
        worktreePath: sessionConfig.worktreePath,
        worktreeBranch: sessionConfig.worktreeBranch,
      }
    } catch (error: any) {
      console.error('[IPC] TASK_START_SESSION error:', error)
      return failInternalResult(error)
    }
  })

}
