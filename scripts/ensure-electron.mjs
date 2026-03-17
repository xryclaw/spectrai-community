import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const electronDistPath = join(process.cwd(), 'node_modules', 'electron', 'dist')
const electronInstallScriptPath = join(process.cwd(), 'node_modules', 'electron', 'install.js')

if (existsSync(electronDistPath)) {
  console.log('[ensure-electron] electron binary already exists')
  process.exit(0)
}

if (!existsSync(electronInstallScriptPath)) {
  console.error('[ensure-electron] electron install script not found:', electronInstallScriptPath)
  process.exit(1)
}

console.log('[ensure-electron] electron binary missing, installing...')

const result = spawnSync(process.execPath, [electronInstallScriptPath], {
  stdio: 'inherit'
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

if (!existsSync(electronDistPath)) {
  console.error('[ensure-electron] installation finished but electron dist still missing')
  process.exit(1)
}

console.log('[ensure-electron] electron binary installed successfully')
