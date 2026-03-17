import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const macOutputPath = join(process.cwd(), 'release', 'mac-arm64')

if (!existsSync(macOutputPath)) {
  console.log('[prepare-mac-output] no stale mac output directory')
  process.exit(0)
}

rmSync(macOutputPath, { recursive: true, force: true })
console.log('[prepare-mac-output] removed stale mac output directory:', macOutputPath)
