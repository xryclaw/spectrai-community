import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sessionHandlers = readFileSync(new URL('../src/main/ipc/sessionHandlers.ts', import.meta.url), 'utf8')
const preloadTypes = readFileSync(new URL('../src/preload/index.d.ts', import.meta.url), 'utf8')

test('SESSION_CREATE should create isolated worktree when worktreeEnabled=true', () => {
  assert.match(sessionHandlers, /withRepoProvisionCleanupLock\(/)
  assert.match(sessionHandlers, /createIsolatedWorktree\(/)
  assert.match(sessionHandlers, /config\.workingDirectory = createdByRepoId\[primaryRepo\.id\]/)
  assert.match(sessionHandlers, /config\.worktreePath = createdByRepoId\[primaryRepo\.id\]/)
})

test('SESSION_CREATE default strategy should be enabled when worktreeEnabled is missing, and explicit false should be supported', () => {
  assert.match(sessionHandlers, /const worktreeEnabled = config\.worktreeEnabled \?\? true/)
  assert.match(sessionHandlers, /if \(worktreeEnabled\) \{/)
  assert.match(sessionHandlers, /显式 false: 允许关闭/)
})

test('SESSION_CREATE should return workspaceMeta in success and error paths', () => {
  assert.match(sessionHandlers, /let workspaceMeta: SessionWorkspaceMeta \| undefined/)
  assert.match(sessionHandlers, /workspaceMeta,\n\s*}\n\s*}\n\n\s*return \{\n\s*success: true[\s\S]*workspaceMeta,/)
})

test('SESSION_CREATE should hard-fail or controlled-fallback with explicit marker on worktree failure', () => {
  assert.match(sessionHandlers, /SESSION_CREATE Worktree 创建失败，fallback 需审批后执行/)
  assert.match(sessionHandlers, /fallbackState: 'used'/)
  assert.match(sessionHandlers, /SESSION_CREATE Worktree 创建失败:/)
  assert.match(sessionHandlers, /fallbackState: 'disabled'/)
})

test('preload session.create return type should include workspaceMeta', () => {
  assert.match(preloadTypes, /workspaceMeta\?: \{ mode: 'single' \| 'workspace'; worktreePath: string; branch: string; baseBranch: string; fallbackState: 'disabled' \| 'not_used' \| 'used' \}/)
})
