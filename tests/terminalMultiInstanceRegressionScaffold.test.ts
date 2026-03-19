import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

type Scenario = {
  id: string
  title: string
  intent: string
}

const SCENARIOS: Scenario[] = [
  {
    id: 'TM-ENTRY-001',
    title: '左下角入口可见且可触发底部终端区展开',
    intent: '覆盖入口可见性、交互可达性、点击后的状态变化',
  },
  {
    id: 'TM-PANEL-002',
    title: '底部终端面板支持展开与收起',
    intent: '覆盖展开/收起状态切换与状态持久化（如 localStorage/store）',
  },
  {
    id: 'TM-CREATE-003',
    title: '右上角可新增多个终端实例',
    intent: '覆盖多实例创建、命名与激活焦点切换',
  },
  {
    id: 'TM-SHELL-004',
    title: '支持 zsh/bash/shell 三种终端类型创建',
    intent: '覆盖 shell 类型参数传递与启动失败回退行为',
  },
  {
    id: 'TM-TABS-005',
    title: '左上角标签页支持多终端切换',
    intent: '覆盖标签激活、渲染切换与历史状态保留',
  },
  {
    id: 'TM-ISOLATION-006',
    title: '多终端会话隔离（输入输出/生命周期）',
    intent: '覆盖会话隔离、保活、销毁与资源释放',
  },
  {
    id: 'TM-EXCEPTION-007',
    title: '异常场景回退与可恢复性',
    intent: '覆盖 shell 不可用、创建失败、关闭异常终端后的恢复策略',
  },
]

test('terminal multi-instance scaffold should keep complete regression checklist IDs', () => {
  const ids = SCENARIOS.map((item) => item.id)
  assert.deepEqual(ids, [
    'TM-ENTRY-001',
    'TM-PANEL-002',
    'TM-CREATE-003',
    'TM-SHELL-004',
    'TM-TABS-005',
    'TM-ISOLATION-006',
    'TM-EXCEPTION-007',
  ])
})

test('scaffold should anchor on existing terminal/session integration files', () => {
  const sidebar = readFileSync(new URL('../src/renderer/components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  const sessionFooter = readFileSync(new URL('../src/renderer/components/layout/sidebar/SessionsFooter.tsx', import.meta.url), 'utf8')
  const terminalTabs = readFileSync(new URL('../src/renderer/components/terminal/TerminalTabs.tsx', import.meta.url), 'utf8')
  const sharedTypes = readFileSync(new URL('../src/shared/types.ts', import.meta.url), 'utf8')

  assert.match(sidebar, /showNewSessionDialog/)
  assert.match(sessionFooter, /onOpenNewSession/)
  assert.match(terminalTabs, /displaySessions/)
  assert.match(sharedTypes, /export type ShellType =/)
})

test.todo('TM-ENTRY-001 | 点击左下角入口后底部终端面板展开，并将焦点切入新增终端实例')
test.todo('TM-PANEL-002 | 底部终端面板收起后保持会话存活，再次展开恢复当前激活实例')
test.todo('TM-CREATE-003 | 右上角连续新增终端实例，标签顺序/激活态/关闭行为符合预期')
test.todo('TM-SHELL-004 | zsh/bash/shell 创建参数正确下发，失败时出现明确回退提示')
test.todo('TM-TABS-005 | 多标签切换时各终端输入输出缓冲互不串扰')
test.todo('TM-ISOLATION-006 | 终端 A 销毁不影响终端 B，且资源清理事件完整触发')
test.todo('TM-EXCEPTION-007 | shell 不可执行/启动失败/异常退出时，UI 与 store 状态保持一致')
