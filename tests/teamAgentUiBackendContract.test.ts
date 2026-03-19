import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const teamHandlers = readFileSync(new URL('../src/main/ipc/teamHandlers.ts', import.meta.url), 'utf8')
const teamRepository = readFileSync(new URL('../src/main/storage/repositories/TeamRepository.ts', import.meta.url), 'utf8')
const sharedTypes = readFileSync(new URL('../src/shared/types.ts', import.meta.url), 'utf8')

test('team get messages handler should keep limit passthrough contract', () => {
  assert.match(teamHandlers, /IPC\.TEAM_GET_MESSAGES[\s\S]*instanceId, limit\?: number/)
  assert.match(teamHandlers, /const resolvedLimit = typeof limit === 'number' && Number\.isFinite\(limit\) && limit > 0/)
  assert.match(teamHandlers, /Math\.floor\(limit\)/)
  assert.match(teamHandlers, /database\.getTeamMessages\(instanceId, resolvedLimit\)/)
})

test('team repository should expose stable team-session aggregation fields', () => {
  assert.match(teamRepository, /const memberSessionIds = members/)
  assert.match(teamRepository, /const leader = members\.find\(m => m\.role === 'leader' && m\.sessionId\)/)
  assert.match(teamRepository, /leaderMemberId: leader\?\.id/)
  assert.match(teamRepository, /leaderSessionId: leader\?\.sessionId/)
  assert.match(teamRepository, /teamSessionId: leader\?\.sessionId/)
  assert.match(teamRepository, /memberCount: members\.length/)
  assert.match(teamRepository, /activeMemberCount,/)
  assert.match(teamRepository, /memberSessionIds,/)
  assert.match(teamRepository, /ORDER BY CASE WHEN mode = 'supervisor' THEN 0 ELSE 1 END, updated_at ASC, id ASC/)
})

test('team instance type should declare backward-compatible aggregation fields', () => {
  assert.match(sharedTypes, /leaderMemberId\?: string/)
  assert.match(sharedTypes, /leaderSessionId\?: string/)
  assert.match(sharedTypes, /teamSessionId\?: string/)
  assert.match(sharedTypes, /memberCount\?: number/)
  assert.match(sharedTypes, /activeMemberCount\?: number/)
  assert.match(sharedTypes, /memberSessionIds\?: string\[\]/)
})
