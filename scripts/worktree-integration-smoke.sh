#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${1:-$(pwd)}"
KEEP_TMP="${KEEP_TMP:-0}"
SUFFIX="$(date +%Y%m%d%H%M%S)"
TMP_ROOT="$(mktemp -d -t worktree-smoke-${SUFFIX}-XXXX)"
CLONE_DIR="$TMP_ROOT/repo-clone"
WORKTREE_ROOT="$TMP_ROOT/worktrees"
BRANCH_A="feat/qa-worktree-a-$SUFFIX"
BRANCH_B="feat/qa-worktree-b-$SUFFIX"
WT_A="$WORKTREE_ROOT/wt-a"
WT_B="$WORKTREE_ROOT/wt-b"

BASE_BRANCH=""

log() {
  printf '[SMOKE] %s\n' "$1"
}

fail() {
  printf '[SMOKE][FAIL] %s\n' "$1" >&2
  exit 1
}

cleanup() {
  if [[ -d "$CLONE_DIR/.git" ]]; then
    git -C "$CLONE_DIR" worktree remove --force "$WT_A" >/dev/null 2>&1 || true
    git -C "$CLONE_DIR" worktree remove --force "$WT_B" >/dev/null 2>&1 || true
  fi

  if [[ "$KEEP_TMP" == "1" ]]; then
    log "KEEP_TMP=1, retained temp directory: $TMP_ROOT"
  else
    rm -rf "$TMP_ROOT"
  fi
}
trap cleanup EXIT

resolve_base_branch() {
  local head_branch=""
  local first_branch=""

  head_branch="$(git -C "$CLONE_DIR" symbolic-ref --short HEAD 2>/dev/null || true)"
  if [[ -n "$head_branch" ]]; then
    echo "$head_branch"
    return
  fi

  if git -C "$CLONE_DIR" show-ref --verify --quiet refs/heads/main; then
    echo main
    return
  fi

  if git -C "$CLONE_DIR" show-ref --verify --quiet refs/heads/master; then
    echo master
    return
  fi

  first_branch="$(git -C "$CLONE_DIR" for-each-ref --format='%(refname:short)' refs/heads | head -n 1)"
  if [[ -n "$first_branch" ]]; then
    echo "$first_branch"
    return
  fi

  echo ""
}

assert_file_not_exists() {
  local target="$1"
  if [[ -f "$target" ]]; then
    fail "unexpected file exists: $target"
  fi
}

assert_file_exists() {
  local target="$1"
  if [[ ! -f "$target" ]]; then
    fail "expected file missing: $target"
  fi
}

log "Running preflight"
bash "$REPO_ROOT/scripts/worktree-preflight.sh" "$REPO_ROOT"

log "Cloning repository into temp workspace"
git clone --quiet --no-hardlinks "$REPO_ROOT" "$CLONE_DIR"
mkdir -p "$WORKTREE_ROOT"

BASE_BRANCH="$(resolve_base_branch)"
if [[ -z "$BASE_BRANCH" ]]; then
  fail "cannot resolve base branch in temp clone"
fi
log "Base branch: $BASE_BRANCH"

log "Creating two parallel worktrees"
git -C "$CLONE_DIR" worktree add -b "$BRANCH_A" "$WT_A" "$BASE_BRANCH" >/dev/null
git -C "$CLONE_DIR" worktree add -b "$BRANCH_B" "$WT_B" "$BASE_BRANCH" >/dev/null

CURRENT_A="$(git -C "$WT_A" rev-parse --abbrev-ref HEAD)"
CURRENT_B="$(git -C "$WT_B" rev-parse --abbrev-ref HEAD)"
[[ "$CURRENT_A" == "$BRANCH_A" ]] || fail "worktree A branch mismatch: $CURRENT_A"
[[ "$CURRENT_B" == "$BRANCH_B" ]] || fail "worktree B branch mismatch: $CURRENT_B"

log "Verifying uncommitted isolation"
printf 'probe-a-%s\n' "$SUFFIX" > "$WT_A/qa-probe-a.txt"
assert_file_not_exists "$WT_B/qa-probe-a.txt"

log "Committing changes on branch A"
git -C "$WT_A" config user.name "qa-worktree-bot"
git -C "$WT_A" config user.email "qa-worktree-bot@example.com"
git -C "$WT_A" add qa-probe-a.txt
git -C "$WT_A" commit -m "test(worktree): smoke commit A" >/dev/null

log "Committing changes on branch B"
printf 'probe-b-%s\n' "$SUFFIX" > "$WT_B/qa-probe-b.txt"
git -C "$WT_B" config user.name "qa-worktree-bot"
git -C "$WT_B" config user.email "qa-worktree-bot@example.com"
git -C "$WT_B" add qa-probe-b.txt
git -C "$WT_B" commit -m "test(worktree): smoke commit B" >/dev/null

log "Validating merge-back path on temp clone"
git -C "$CLONE_DIR" checkout "$BASE_BRANCH" >/dev/null
git -C "$CLONE_DIR" merge --no-ff "$BRANCH_A" -m "merge smoke branch A" >/dev/null
git -C "$CLONE_DIR" merge --no-ff "$BRANCH_B" -m "merge smoke branch B" >/dev/null
assert_file_exists "$CLONE_DIR/qa-probe-a.txt"
assert_file_exists "$CLONE_DIR/qa-probe-b.txt"

log "Smoke verification passed"
log "Outputs:"
log "  branch A: $BRANCH_A"
log "  branch B: $BRANCH_B"
log "  temp root: $TMP_ROOT"
