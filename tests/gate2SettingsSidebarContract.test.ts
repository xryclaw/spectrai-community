import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const appLayout = readFileSync(new URL('../src/renderer/components/layout/AppLayout.tsx', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('../src/renderer/components/layout/Sidebar.tsx', import.meta.url), 'utf8')
const mcpSidebarView = readFileSync(new URL('../src/renderer/components/sidebar/McpSidebarView.tsx', import.meta.url), 'utf8')
const skillsSidebarView = readFileSync(new URL('../src/renderer/components/sidebar/SkillsSidebarView.tsx', import.meta.url), 'utf8')

test('settings full-screen flow should be wired in AppLayout', () => {
  assert.match(appLayout, /className="flex flex-col h-screen bg-bg-primary"/)
  assert.match(appLayout, /window\.addEventListener\('open-settings-tab', handler\)/)
  assert.match(appLayout, /return \(\) => window\.removeEventListener\('open-settings-tab', handler\)/)
  assert.match(appLayout, /setSettingsInitialTab\(tab\)/)
  assert.match(appLayout, /setShowSettings\(true\)/)
  assert.match(appLayout, /<ActivityBar onOpenSettings=\{\(\) => setShowSettings\(true\)\} \/>/)
  assert.match(appLayout, /<UnifiedSettingsModal[\s\S]*initialTab=\{settingsInitialTab\}/)
  assert.match(appLayout, /setSettingsInitialTab\(undefined\)/)
})

test('sidebar should keep child view routing contract consistent', () => {
  const requiredCases = [
    "case 'dashboard':",
    "case 'explorer':",
    "case 'git':",
    "case 'timeline':",
    "case 'stats':",
    "case 'mcp':",
    "case 'skills':",
    "case 'teams':",
    "case 'sessions':",
  ]

  for (const mark of requiredCases) {
    assert.match(sidebar, new RegExp(mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  assert.match(sidebar, /default:[\s\S]*return <SessionsPanelWrapper \/>/)
})

test('sidebar subviews should dispatch open-settings-tab with stable tab keys', () => {
  assert.match(mcpSidebarView, /new CustomEvent\('open-settings-tab', \{ detail: 'mcp' \}\)/)
  assert.match(skillsSidebarView, /new CustomEvent\('open-settings-tab', \{ detail: 'skills' \}\)/)
})
