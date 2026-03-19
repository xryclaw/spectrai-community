import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sessionStore = readFileSync(new URL('../src/renderer/stores/sessionStore.ts', import.meta.url), 'utf8')
const preload = readFileSync(new URL('../src/preload/index.ts', import.meta.url), 'utf8')
const appLayout = readFileSync(new URL('../src/renderer/components/layout/AppLayout.tsx', import.meta.url), 'utf8')

test('session store should keep explicit listener unsubs buckets', () => {
  assert.match(sessionStore, /let _sessionListenerUnsubs: Array<\(\) => void> = \[\]/)
  assert.match(sessionStore, /let _agentListenerUnsubs: Array<\(\) => void> = \[\]/)
  assert.match(sessionStore, /let _conversationListenerUnsubs: Array<\(\) => void> = \[\]/)
})

test('init listener methods should clear old subscriptions before re-registering', () => {
  assert.match(sessionStore, /initListeners:[\s\S]*?_sessionListenerUnsubs\.forEach\(fn => fn\(\)\)[\s\S]*?_sessionListenerUnsubs = \[\]/)
  assert.match(sessionStore, /initAgentListeners:[\s\S]*?_agentListenerUnsubs\.forEach\(fn => fn\(\)\)[\s\S]*?_agentListenerUnsubs = \[\]/)
  assert.match(sessionStore, /initConversationListeners:[\s\S]*?_conversationListenerUnsubs\.forEach\(fn => fn\(\)\)[\s\S]*?_conversationListenerUnsubs = \[\]/)
})

test('cleanupListeners should release all listener buckets to prevent leaks', () => {
  assert.match(sessionStore, /cleanupListeners:[\s\S]*?_sessionListenerUnsubs\.forEach\(fn => fn\(\)\)[\s\S]*?_sessionListenerUnsubs = \[\]/)
  assert.match(sessionStore, /cleanupListeners:[\s\S]*?_agentListenerUnsubs\.forEach\(fn => fn\(\)\)[\s\S]*?_agentListenerUnsubs = \[\]/)
  assert.match(sessionStore, /cleanupListeners:[\s\S]*?_conversationListenerUnsubs\.forEach\(fn => fn\(\)\)[\s\S]*?_conversationListenerUnsubs = \[\]/)
})

test('preload IPC listeners should expose unsubscribe callbacks', () => {
  const channels = [
    'UPDATE_STATE_CHANGED',
    'SESSION_OUTPUT',
    'SESSION_STATUS_CHANGE',
    'SESSION_ACTIVITY',
    'SESSION_INTERVENTION',
    'SESSION_NAME_CHANGE',
    'SESSION_CONVERSATION_MESSAGE',
  ]

  for (const key of channels) {
    assert.match(
      preload,
      new RegExp(`ipcRenderer\\.on\\(IPC\\.${key}, listener\\)[\\s\\S]*?return \\(\\) => ipcRenderer\\.removeListener\\(IPC\\.${key}, listener\\)`),
      `preload listener ${key} should have unsubscribe`,
    )
  }

  assert.match(preload, /onToggleSidebar:[\s\S]*?return \(\) => ipcRenderer\.removeListener\('shortcut:toggle-sidebar', listener\)/)
})

test('settings tab event should be unsubscribed in layout effect cleanup', () => {
  assert.match(appLayout, /window\.addEventListener\('open-settings-tab', handler\)/)
  assert.match(appLayout, /return \(\) => window\.removeEventListener\('open-settings-tab', handler\)/)
})
