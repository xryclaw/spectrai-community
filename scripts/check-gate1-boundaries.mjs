#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

const INCLUDE_DIRS = [
  'src/main',
  'src/renderer',
]

const EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs'])

const RULES = [
  {
    id: 'renderer-no-main-import',
    description: 'Renderer 层禁止直接引用 main 层实现',
    from: (p) => p.startsWith('src/renderer/'),
    to: (p) => p.startsWith('src/main/'),
  },
  {
    id: 'main-no-renderer-import',
    description: 'Main 层禁止引用 renderer 层实现',
    from: (p) => p.startsWith('src/main/'),
    to: (p) => p.startsWith('src/renderer/'),
  },
  {
    id: 'renderer-layout-sidebar-no-settings-modal',
    description: 'Sidebar 单体文件禁止直接引用统一设置弹窗',
    from: (p) => p === 'src/renderer/components/layout/Sidebar.tsx',
    to: (p) => p === 'src/renderer/components/settings/UnifiedSettingsModal.tsx',
  },
  {
    id: 'renderer-detailpanel-no-sidebar-monolith',
    description: 'DetailPanel 禁止回连 Sidebar 单体文件',
    from: (p) => p === 'src/renderer/components/layout/DetailPanel.tsx',
    to: (p) => p === 'src/renderer/components/layout/Sidebar.tsx',
  },
  {
    id: 'renderer-sidebar-submodules-no-settings',
    description: 'Sidebar 子模块禁止越层引用 settings 模块',
    from: (p) => p.startsWith('src/renderer/components/layout/sidebar/'),
    to: (p) => p.startsWith('src/renderer/components/settings/'),
  },
  {
    id: 'renderer-settings-no-layout',
    description: 'settings 模块禁止反向依赖 layout 模块',
    from: (p) => p.startsWith('src/renderer/components/settings/'),
    to: (p) => p.startsWith('src/renderer/components/layout/'),
  },
  {
    id: 'main-ipc-providerhandlers-no-adapter-direct',
    description: 'providerHandlers 禁止直接依赖 adapter 层实现',
    from: (p) => p === 'src/main/ipc/providerHandlers.ts',
    to: (p) => p.startsWith('src/main/adapter/'),
  },
  {
    id: 'main-adapter-no-ipc-import',
    description: 'adapter 层禁止反向引用 ipc 层',
    from: (p) => p.startsWith('src/main/adapter/'),
    to: (p) => p.startsWith('src/main/ipc/'),
  },
]

function toRel(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/')
}

function walkFiles(dir) {
  const absDir = path.join(ROOT, dir)
  if (!fs.existsSync(absDir)) return []
  const out = []
  const stack = [absDir]

  while (stack.length > 0) {
    const cur = stack.pop()
    const entries = fs.readdirSync(cur, { withFileTypes: true })
    for (const ent of entries) {
      const abs = path.join(cur, ent.name)
      if (ent.isDirectory()) {
        stack.push(abs)
        continue
      }
      const ext = path.extname(ent.name)
      if (!EXTS.has(ext)) continue
      out.push(abs)
    }
  }

  return out
}

function readWaivers() {
  const waiverPath = path.join(ROOT, 'docs/plans/gate1-boundary-waivers.json')
  if (!fs.existsSync(waiverPath)) return []
  try {
    const parsed = JSON.parse(fs.readFileSync(waiverPath, 'utf8'))
    if (Array.isArray(parsed)) return parsed
  } catch (err) {
    console.warn(`[gate1-boundary] failed to parse waiver file: ${String(err)}`)
  }
  return []
}

function isRelativeSpecifier(spec) {
  return spec.startsWith('./') || spec.startsWith('../')
}

function resolveImport(fromAbs, spec) {
  const base = path.resolve(path.dirname(fromAbs), spec)
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}.cjs`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
    path.join(base, 'index.js'),
    path.join(base, 'index.mjs'),
    path.join(base, 'index.cjs'),
  ]

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c
    }
  }
  return null
}

function extractImportSpecifiers(content) {
  const specs = new Set()

  const importRe = /import\s+(?:type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = importRe.exec(content)) !== null) {
    specs.add(m[1])
  }

  const exportFromRe = /export\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g
  while ((m = exportFromRe.exec(content)) !== null) {
    specs.add(m[1])
  }

  const requireRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = requireRe.exec(content)) !== null) {
    specs.add(m[1])
  }

  return [...specs]
}

function isWaived(waivers, violation) {
  return waivers.some((w) => (
    w.ruleId === violation.ruleId
    && w.from === violation.from
    && w.to === violation.to
  ))
}

function collectViolations() {
  const files = INCLUDE_DIRS.flatMap(walkFiles)
  const waivers = readWaivers()
  const violations = []

  for (const fromAbs of files) {
    const content = fs.readFileSync(fromAbs, 'utf8')
    const specs = extractImportSpecifiers(content)
    const fromRel = toRel(fromAbs)

    for (const spec of specs) {
      if (!isRelativeSpecifier(spec)) continue
      const toAbs = resolveImport(fromAbs, spec)
      if (!toAbs) continue
      const toRelPath = toRel(toAbs)

      for (const rule of RULES) {
        if (!rule.from(fromRel)) continue
        if (!rule.to(toRelPath)) continue

        const item = {
          ruleId: rule.id,
          description: rule.description,
          from: fromRel,
          to: toRelPath,
          importPath: spec,
        }

        if (!isWaived(waivers, item)) {
          violations.push(item)
        }
      }
    }
  }

  return violations
}

const violations = collectViolations()

if (violations.length === 0) {
  console.log('Gate-1 boundary check passed: no non-waived violations found.')
  process.exit(0)
}

console.error(`Gate-1 boundary check failed: ${violations.length} non-waived violation(s).`)
for (const v of violations) {
  console.error(`- [${v.ruleId}] ${v.from} -> ${v.to} (import: ${v.importPath})`)
}
process.exit(1)
