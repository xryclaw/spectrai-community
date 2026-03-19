import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const agentManagerV2 = readFileSync(new URL('../src/main/agent/AgentManagerV2.ts', import.meta.url), 'utf8')
const agentManager = readFileSync(new URL('../src/main/agent/AgentManager.ts', import.meta.url), 'utf8')
const gitWorktreeService = readFileSync(new URL('../src/main/git/GitWorktreeService.ts', import.meta.url), 'utf8')

test('enter_worktree should use createIsolatedWorktree in AgentManagerV2', () => {
  assert.match(agentManagerV2, /createIsolatedWorktree\(/)
  assert.match(agentManagerV2, /const preferredBranch = typeof params\.branchName === 'string'/)
})

test('enter_worktree should use createIsolatedWorktree in legacy AgentManager', () => {
  assert.match(agentManager, /createIsolatedWorktree\(/)
  assert.match(agentManager, /const preferredBranch = typeof params\.branchName === 'string'/)
})

test('isolated branch naming should check both local and remote refs for uniqueness', () => {
  assert.match(gitWorktreeService, /async remoteBranchExists\(/)
  assert.match(gitWorktreeService, /refs\/remotes\/\*\//)
  assert.match(gitWorktreeService, /async branchExistsAnywhere\(/)
  assert.match(gitWorktreeService, /branchExistsAnywhere\(repoPath, candidate\)/)
})
