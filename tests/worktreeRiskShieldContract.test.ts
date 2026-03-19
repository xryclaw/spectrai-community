import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const taskHandlers = readFileSync(new URL('../src/main/ipc/taskHandlers.ts', import.meta.url), 'utf8')
const riskGuard = readFileSync(new URL('../src/main/git/WorktreeRiskGuard.ts', import.meta.url), 'utf8')
const gitHandlers = readFileSync(new URL('../src/main/ipc/gitHandlers.ts', import.meta.url), 'utf8')
const agentManager = readFileSync(new URL('../src/main/agent/AgentManager.ts', import.meta.url), 'utf8')
const agentManagerV2 = readFileSync(new URL('../src/main/agent/AgentManagerV2.ts', import.meta.url), 'utf8')
const sessionItem = readFileSync(new URL('../src/renderer/components/layout/sidebar/SessionItem.tsx', import.meta.url), 'utf8')
const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
const rollbackScript = readFileSync(new URL('../scripts/db-migration-rollback.mjs', import.meta.url), 'utf8')

test('task session start should serialize provision+cleanup for same repo', () => {
  assert.match(taskHandlers, /withRepoProvisionCleanupLock\(/)
  assert.match(taskHandlers, /repos\.map\(r => r\.repoPath\)/)
})

test('task session start should disable auto fallback by default and record fallback sample', () => {
  assert.match(taskHandlers, /process\.env\.WORKTREE_FALLBACK_MODE \|\| 'disabled'/)
  assert.match(taskHandlers, /Worktree 创建失败，fallback 需审批后执行/)
  assert.match(taskHandlers, /riskGuard\.recordFallbackAttempt\(false\)/)
})

test('cleanup failure should schedule compensation task and mark pending', () => {
  assert.match(taskHandlers, /scheduleCleanupCompensation\(/)
  assert.match(taskHandlers, /worktreeCleanupState = 'pending'/)
})

test('risk escalation thresholds should match joint-debug policy', () => {
  assert.match(riskGuard, /provisionFailureThreshold = 3/)
  assert.match(riskGuard, /cleanupPendingThreshold = 20/)
  assert.match(riskGuard, /fallbackRateThreshold = 0\.05/)
})

test('threshold breach should trigger merge pause with trigger/resume log evidence', () => {
  assert.match(riskGuard, /WORKTREE_MERGE_GATE_TRIGGER/)
  assert.match(riskGuard, /WORKTREE_MERGE_GATE_RESOLVED/)
  assert.match(riskGuard, /PROVISION_FAILED>=/)
  assert.match(riskGuard, /CLEANUP_PENDING>/)
  assert.match(riskGuard, /fallbackRate>/)
  assert.match(riskGuard, /assertMergeAllowed\(/)
})

test('all worktree merge entry points should be blocked by merge gate', () => {
  assert.match(gitHandlers, /assertMergeAllowed\('IPC\.WORKTREE_MERGE'\)/)
  assert.match(agentManager, /assertMergeAllowed\('AgentManager\.merge_worktree'\)/)
  assert.match(agentManagerV2, /assertMergeAllowed\('AgentManagerV2\.merge_worktree'\)/)
})

test('session page should show red labels for mode branch cleanup fallback', () => {
  assert.match(sessionItem, /mode:\{workspaceMode\}/)
  assert.match(sessionItem, /branch:\{branchName\}/)
  assert.match(sessionItem, /cleanup:\{cleanupState\}/)
  assert.match(sessionItem, /fallback:\{fallbackState\}/)
})

test('migration rollback command should be executable from package scripts', () => {
  assert.match(pkg, /"db:migration:rollback"\s*:\s*"node scripts\/db-migration-rollback\.mjs/)
  assert.match(rollbackScript, /--execute/)
  assert.match(rollbackScript, /Dry run only/)
})
