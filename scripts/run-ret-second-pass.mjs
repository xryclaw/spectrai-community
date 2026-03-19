#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const now = new Date()
const ts = now.toISOString()

function read(relPath) {
  const abs = path.join(ROOT, relPath)
  return fs.readFileSync(abs, 'utf8')
}

function checkAll(source, patterns) {
  const missing = []
  for (const p of patterns) {
    if (!p.regex.test(source)) missing.push(p.name)
  }
  return missing
}

const files = {
  unifiedSettings: 'src/renderer/components/settings/UnifiedSettingsModal.tsx',
  workspaceManager: 'src/renderer/components/settings/WorkspaceManager.tsx',
  messageBubble: 'src/renderer/components/conversation/MessageBubble.tsx',
}

const sources = {
  unifiedSettings: read(files.unifiedSettings),
  workspaceManager: read(files.workspaceManager),
  messageBubble: read(files.messageBubble),
}

const cases = [
  {
    id: 'RET-001',
    defectId: 'DEF-001',
    target: files.unifiedSettings,
    patterns: [
      { name: 'Esc key handler', regex: /Escape|key\s*===\s*['"]Escape['"]/ },
      { name: 'Unsaved change hint', regex: /未保存|unsaved|dirty/i },
      { name: 'Leave/continue confirmation actions', regex: /继续编辑|放弃更改|discard|confirm/i },
    ],
    sourceKey: 'unifiedSettings',
  },
  {
    id: 'RET-002',
    defectId: 'DEF-002',
    target: files.unifiedSettings,
    patterns: [
      { name: 'GeneralTab receives dirty/draft prop from parent', regex: /<GeneralTab[\s\S]*onDirtyChange=/ },
      { name: 'GeneralTab prop definition includes onDirtyChange', regex: /function\s+GeneralTab\s*\([\s\S]*onDirtyChange/ },
    ],
    sourceKey: 'unifiedSettings',
  },
  {
    id: 'RET-003',
    defectId: 'DEF-003',
    target: files.workspaceManager,
    patterns: [
      { name: 'Workspace load error state', regex: /const\s*\[\s*error\s*,\s*setError\s*\]/ },
      { name: 'Load catch sets error', regex: /catch[\s\S]*setError\(/ },
      { name: 'Error message for workspace load failure', regex: /工作区列表加载失败|加载失败/ },
      { name: 'Retry action present', regex: /重新加载|重试/ },
    ],
    sourceKey: 'workspaceManager',
  },
  {
    id: 'RET-005',
    defectId: 'DEF-005',
    target: files.unifiedSettings,
    patterns: [
      { name: 'Proxy saving state variable', regex: /\[\s*(?:proxy)?Saving\s*,\s*set(?:Proxy)?Saving\s*\]|\[\s*savingProxy\s*,\s*setSavingProxy\s*\]/i },
      { name: 'Save button disabled while saving', regex: /disabled=\{[^}]*saving|disabled=\{[^}]*proxySaving/i },
      { name: 'Saving label present', regex: /保存中\.\.\.|保存中…/ },
    ],
    sourceKey: 'unifiedSettings',
  },
  {
    id: 'RET-007',
    defectId: 'DEF-007',
    target: files.messageBubble,
    patterns: [
      { name: 'Empty assistant fallback text', regex: /模型未返回可显示内容/ },
      { name: 'Empty fallback action', regex: /重试|复制原始消息/ },
    ],
    sourceKey: 'messageBubble',
  },
  {
    id: 'RET-008',
    defectId: 'DEF-008',
    target: files.messageBubble,
    patterns: [
      { name: 'Markdown render error fallback text', regex: /内容渲染失败，已切换为纯文本/ },
      { name: 'Fallback still renders plain text', regex: /内容渲染失败，已切换为纯文本[\s\S]{0,600}textContent/ },
    ],
    sourceKey: 'messageBubble',
  },
]

const results = cases.map((c) => {
  const missing = checkAll(sources[c.sourceKey], c.patterns)
  return {
    id: c.id,
    defectId: c.defectId,
    target: c.target,
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    missing,
  }
})

const passed = results.filter((r) => r.status === 'PASS').length
const total = results.length
const failed = total - passed
const passRate = `${passed}/${total}`
const gate = failed === 0 ? 'GO' : 'NO-GO'

const lines = []
lines.push('# P0 二轮复测守门证据（自动脚本）')
lines.push('')
lines.push(`- 时间: ${ts}`)
lines.push(`- 命令: node scripts/run-ret-second-pass.mjs`)
lines.push(`- 通过率: ${passRate}`)
lines.push(`- 建议: ${gate}`)
lines.push('')
lines.push('| RET | DEF | 结果 | 目标文件 | 缺失项 |')
lines.push('|---|---|---|---|---|')
for (const r of results) {
  lines.push(`| ${r.id} | ${r.defectId} | ${r.status} | \`${r.target}\` | ${r.missing.length ? r.missing.join('; ') : '-'} |`)
}
lines.push('')
lines.push('## 机器摘要')
lines.push('')
lines.push('```json')
lines.push(JSON.stringify({ ts, passed, failed, total, passRate, gate, results }, null, 2))
lines.push('```')
lines.push('')

const reportPath = path.join(ROOT, 'docs/plans/2026-03-19-p0-ret-second-pass-evidence.md')
fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')

console.log(`RET second-pass summary: ${passRate}, suggestion=${gate}`)
for (const r of results) {
  if (r.status === 'PASS') {
    console.log(`[PASS] ${r.id} (${r.defectId})`)
  } else {
    console.log(`[FAIL] ${r.id} (${r.defectId}) missing: ${r.missing.join(', ')}`)
  }
}
console.log(`Evidence written: ${path.relative(ROOT, reportPath)}`)

if (failed > 0) process.exit(1)
