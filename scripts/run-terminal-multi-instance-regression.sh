#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[terminal-regression] running scaffold suite"
node --test --experimental-strip-types tests/terminalMultiInstanceRegressionScaffold.test.ts

echo "[terminal-regression] scaffold suite finished"
