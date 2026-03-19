import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const taskHandlers = readFileSync(new URL('../src/main/ipc/taskHandlers.ts', import.meta.url), 'utf8')

test('TASK_START_SESSION should track created multi-repo worktrees with precise path+branch for rollback', () => {
  assert.match(taskHandlers, /createdByRepoPath = new Map<string, \{ worktreePath: string; branchName: string; repoId: string \}>\(\)/)
  assert.match(taskHandlers, /createdByRepoPath\.set\(repo\.repoPath, \{[\s\S]*?worktreePath: result\.worktreePath,[\s\S]*?branchName: result\.branch,[\s\S]*?repoId: repo\.id,[\s\S]*?\}\)/)
})

test('TASK_START_SESSION should rollback per-repo with created worktreePath and branchName', () => {
  assert.match(taskHandlers, /const rollbackBranch = created\.branchName \|\| resolvedSessionBranch \|\| activeWorktreeBranch \|\| undefined/)
  assert.match(taskHandlers, /removeWorktree\(repo\.repoPath, created\.worktreePath, \{[\s\S]*?branchName: rollbackBranch,[\s\S]*?\}\)/)
})

test('rollback failure should mark cleanup pending, schedule compensation and persist pending worktree paths', () => {
  assert.match(taskHandlers, /const rollbackFailures: CleanupFailure\[\] = \[\]/)
  assert.match(taskHandlers, /worktreeCleanupState = 'pending'/)
  assert.match(taskHandlers, /scheduleCleanupCompensation\(/)
  assert.match(taskHandlers, /const pendingWorktreePaths: Record<string, string> = \{\}/)
  assert.match(taskHandlers, /worktreePaths: pendingWorktreePaths/)
})
