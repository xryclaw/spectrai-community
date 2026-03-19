/**
 * Worktree 会话安全：同仓 provision/cleanup 互斥 + cleanup 补偿重试
 */

import { WorktreeRiskGuard } from './WorktreeRiskGuard'

const repoLocks = new Map<string, Promise<void>>()

function withRepoLock<T>(repoPath: string, fn: () => Promise<T>): Promise<T> {
  const prev = repoLocks.get(repoPath) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  repoLocks.set(repoPath, next.then(() => {}, () => {}))
  return next
}

export function withRepoProvisionCleanupLock<T>(repoPaths: string[], fn: () => Promise<T>): Promise<T> {
  const uniqueSorted = Array.from(new Set(repoPaths.filter(Boolean))).sort()
  const run = (index: number): Promise<T> => {
    if (index >= uniqueSorted.length) return fn()
    return withRepoLock(uniqueSorted[index], () => run(index + 1))
  }
  return run(0)
}

type CleanupJob = {
  key: string
  reason: string
  run: () => Promise<void>
}

class CleanupCompensator {
  private jobs = new Map<string, CleanupJob>()
  private riskGuard = WorktreeRiskGuard.getInstance()

  schedule(job: CleanupJob): void {
    if (!job.key || this.jobs.has(job.key)) return

    this.jobs.set(job.key, job)
    this.riskGuard.recordCleanupPending(job.key, job.reason)

    const execute = async (attempt: number): Promise<void> => {
      const current = this.jobs.get(job.key)
      if (!current) return

      try {
        await current.run()
        this.jobs.delete(job.key)
        this.riskGuard.recordCleanupResolved(job.key)
        console.log(`[WorktreeCleanupCompensator] resolved key=${job.key} attempt=${attempt}`)
      } catch (err: any) {
        const maxAttempts = 5
        if (attempt >= maxAttempts) {
          console.error(
            `[WorktreeCleanupCompensator] keep pending key=${job.key}, attempts=${attempt}, error=${err?.message || err}`
          )
          return
        }

        const delayMs = Math.min(30_000, 1_500 * Math.pow(2, attempt - 1))
        console.warn(
          `[WorktreeCleanupCompensator] retry key=${job.key} in ${delayMs}ms (attempt=${attempt + 1})`
        )
        setTimeout(() => {
          execute(attempt + 1).catch(() => {})
        }, delayMs)
      }
    }

    setTimeout(() => {
      execute(1).catch(() => {})
    }, 0)
  }
}

const cleanupCompensator = new CleanupCompensator()

export function scheduleCleanupCompensation(job: CleanupJob): void {
  cleanupCompensator.schedule(job)
}
