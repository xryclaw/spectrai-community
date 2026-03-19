import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const teamStore = readFileSync(new URL('../src/renderer/stores/teamStore.ts', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/renderer/components/layout/Sidebar.tsx', import.meta.url), 'utf8')
const terminalPanel = readFileSync(new URL('../src/renderer/components/terminal/TerminalPanel.tsx', import.meta.url), 'utf8')
const teamPanel = readFileSync(new URL('../src/renderer/components/team/TeamPanel.tsx', import.meta.url), 'utf8')
const sessionItem = readFileSync(new URL('../src/renderer/components/layout/sidebar/SessionItem.tsx', import.meta.url), 'utf8')

test('teamStore should keep session-team mapping and selected member state', () => {
  assert.match(teamStore, /sessionTeamMap:\s*Record<string,\s*string>/)
  assert.match(teamStore, /selectedMemberId:\s*string\s*\|\s*null/)
  assert.match(teamStore, /function buildSessionTeamMap\(instances: TeamInstance\[\]\): Record<string, string>/)
  assert.match(teamStore, /set\(\{\s*instances,\s*sessionTeamMap: buildSessionTeamMap\(instances\)\s*\}\)/)
  assert.match(teamStore, /selectMember:\s*\(id\)\s*=>\s*set\(\{ selectedMemberId: id \}\)/)
  assert.match(teamStore, /getTeamForSession:\s*\(sessionId\)\s*=>\s*\{/)
})

test('sidebar should route team sessions to TeamMembersSidebar and fallback to SessionsContent', () => {
  assert.match(sidebar, /function SessionsPanelWrapper\(\)/)
  assert.match(sidebar, /const teamInstance = teamInited && selectedSessionId\s*\?\s*getTeamForSession\(selectedSessionId\)\s*:\s*null/)
  assert.match(sidebar, /if \(teamInstance\) \{[\s\S]*<TeamMembersSidebar/)
  assert.match(sidebar, /selectMember\(null\)/)
  assert.match(sidebar, /selectSession\(''\)/)
  assert.match(sidebar, /return <SessionsContent \/>/)
})

test('terminal panel should switch between team conversation and member conversation', () => {
  assert.match(terminalPanel, /const teamInstance = useTeamStore\(state => state\.getTeamForSession\(sessionId\)\)/)
  assert.match(terminalPanel, /const selectedMemberId = useTeamStore\(state => state\.selectedMemberId\)/)
  assert.match(terminalPanel, /if \(teamInstance\) \{[\s\S]*if \(selectedMemberId\)/)
  assert.match(terminalPanel, /return <ConversationView sessionId=\{member\.sessionId\} \/>/)
  assert.match(terminalPanel, /return <TeamConversation instanceId=\{teamInstance\.id\} \/>/)
  assert.match(terminalPanel, /return <ConversationView sessionId=\{sessionId\} \/>/)
})

test('team panel should jump to leader session and switch left panel to sessions', () => {
  assert.match(teamPanel, /const handleJumpToInstance = \(instanceId: string\) => \{[\s\S]*selectSession\(leader\.sessionId\)/)
  assert.match(teamPanel, /setActivePanelLeft\('sessions'\)/)
  assert.match(teamPanel, /if \(viewMode !== 'tabs'\) setViewMode\('tabs'\)/)
})

test('session item should show team badge with users icon and member count', () => {
  assert.match(sessionItem, /const teamInstance = useTeamStore\(\(s\) => s\.getTeamForSession\(session\.id\)\)/)
  assert.match(sessionItem, /const isTeamSession = !!teamInstance/)
  assert.match(sessionItem, /title=\{`团队会话 · \$\{teamMemberCount\} 名成员`\}/)
  assert.match(sessionItem, /<Users className="w-2\.5 h-2\.5" \/>/)
})
