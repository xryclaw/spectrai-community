#!/usr/bin/env node

/**
 * 数据库迁移回滚执行器（联调期）
 * 默认仅输出计划；实际执行需显式传 --execute。
 */

import process from 'node:process'

function parseArg(name, fallback = '') {
  const idx = process.argv.indexOf(name)
  if (idx < 0) return fallback
  return process.argv[idx + 1] || fallback
}

const fromVersion = parseArg('--from', '')
const toVersion = parseArg('--to', '')
const execute = process.argv.includes('--execute')

if (!fromVersion || !toVersion) {
  console.log('Usage: node scripts/db-migration-rollback.mjs --from <version> --to <version> [--execute]')
  process.exit(0)
}

const plan = [
  `rollback from v${fromVersion} to v${toVersion}`,
  'step1: create sqlite backup',
  'step2: run manual down migration SQL in transaction',
  'step3: verify schema version',
]

if (!execute) {
  console.log('[rollback-plan]')
  for (const line of plan) console.log(`- ${line}`)
  console.log('Dry run only. Re-run with --execute to perform rollback.')
  process.exit(0)
}

console.error('Rollback execute mode is guarded in community build; please run via release ops checklist.')
process.exit(2)
