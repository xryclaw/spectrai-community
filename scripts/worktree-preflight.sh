#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(pwd)}"
FAILURES=0
WARNINGS=0

log_info() {
  printf '[INFO] %s\n' "$1"
}

log_ok() {
  printf '[OK] %s\n' "$1"
}

log_warn() {
  WARNINGS=$((WARNINGS + 1))
  printf '[WARN] %s\n' "$1"
}

log_fail() {
  FAILURES=$((FAILURES + 1))
  printf '[FAIL] %s\n' "$1"
}

require_cmd() {
  local cmd="$1"
  if command -v "$cmd" >/dev/null 2>&1; then
    log_ok "command '$cmd' is available"
  else
    log_fail "command '$cmd' is missing"
  fi
}

resolve_base_branch() {
  if git -C "$REPO_ROOT" show-ref --verify --quiet refs/heads/main; then
    echo main
    return
  fi
  if git -C "$REPO_ROOT" show-ref --verify --quiet refs/heads/master; then
    echo master
    return
  fi
  echo ""
}

log_info "Checking worktree integration prerequisites"
log_info "Repo root: $REPO_ROOT"

if [[ ! -d "$REPO_ROOT" ]]; then
  log_fail "repo path does not exist: $REPO_ROOT"
fi

require_cmd git
require_cmd node
require_cmd npm

if git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log_ok "path is inside a git repository"
else
  log_fail "path is not a git repository"
fi

if git -C "$REPO_ROOT" worktree list >/dev/null 2>&1; then
  log_ok "git worktree command is available"
else
  log_fail "git worktree command failed"
fi

BASE_BRANCH="$(resolve_base_branch)"
if [[ -n "$BASE_BRANCH" ]]; then
  log_ok "base branch detected: $BASE_BRANCH"
else
  log_fail "cannot find base branch (expected main or master)"
fi

if git -C "$REPO_ROOT" remote get-url origin >/dev/null 2>&1; then
  ORIGIN_URL="$(git -C "$REPO_ROOT" remote get-url origin)"
  log_ok "origin remote configured: $ORIGIN_URL"
else
  log_warn "origin remote is not configured"
fi

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  log_warn "working tree is dirty; smoke script will use a temp clone to avoid interference"
else
  log_ok "working tree is clean"
fi

if [[ -w "$REPO_ROOT" ]]; then
  log_ok "repo path is writable"
else
  log_fail "repo path is not writable"
fi

printf '\n'
printf 'Summary: failures=%s warnings=%s\n' "$FAILURES" "$WARNINGS"

if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi
