#!/usr/bin/env bash
set -euo pipefail

ROOT="${CURSOR_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$ROOT"

BACKUP_DIR="$ROOT/supabase/backups"
STAMP="$BACKUP_DIR/.last-dump"
LOCK="$BACKUP_DIR/.dump.lock"
LOG="$BACKUP_DIR/dump.log"
MAX_AGE_SEC=86400
PROJECT_REF="qegoivwsbvjhkemmcyqv"

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if [[ -z "${NVM_DIR:-}" && -d "$HOME/.nvm" ]]; then
  export NVM_DIR="$HOME/.nvm"
fi
if [[ -s "${NVM_DIR:-}/nvm.sh" ]]; then
  set +u
  . "$NVM_DIR/nvm.sh"
  set -u
fi
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

docker_bin() {
  if [[ -x /usr/local/bin/docker ]]; then
    echo /usr/local/bin/docker
    return
  fi
  if [[ -x /opt/homebrew/bin/docker ]]; then
    echo /opt/homebrew/bin/docker
    return
  fi
  command -v docker
}

stamp_mtime() {
  if [[ ! -f "$STAMP" ]]; then
    echo 0
    return
  fi
  if stat -f %m "$STAMP" >/dev/null 2>&1; then
    stat -f %m "$STAMP"
  else
    stat -c %Y "$STAMP"
  fi
}

is_fresh() {
  local now last
  now=$(date +%s)
  last=$(stamp_mtime)
  if (( now - last < MAX_AGE_SEC )); then
    return 0
  fi
  return 1
}

load_dump_env() {
  local file line key val
  for file in "$ROOT/.env.local" "$ROOT/supabase/.env"; do
    [[ -f "$file" ]] || continue
    while IFS= read -r line || [[ -n "$line" ]]; do
      case "$line" in
        '' | \#*) continue ;;
      esac
      key=${line%%=*}
      val=${line#*=}
      if [[ "$key" == "SUPABASE_ACCESS_TOKEN" || "$key" == "SUPABASE_DB_PASSWORD" ]]; then
        export "$key=$val"
      fi
    done <"$file"
  done
}

supabase_bin() {
  if command -v supabase >/dev/null 2>&1; then
    command -v supabase
    return
  fi
  echo "npx --yes supabase"
}

run_dump() {
  mkdir -p "$BACKUP_DIR"
  if ! mkdir "$LOCK" 2>/dev/null; then
    return 0
  fi
  trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

  if is_fresh; then
    return 0
  fi

  load_dump_env

  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    echo "skip dump: set SUPABASE_ACCESS_TOKEN in .env.local" >&2
    return 0
  fi

  local docker
  docker=$(docker_bin || true)
  if [[ -n "$docker" ]] && "$docker" info >/dev/null 2>&1; then
    echo "dump started $(date -u +%Y-%m-%dT%H:%M:%SZ) via pg_dump" >&2
    local cli
    cli=$(supabase_bin)
    if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
      $cli db dump --yes --agent no --workdir "$ROOT" --project-ref "$PROJECT_REF" \
        -p "$SUPABASE_DB_PASSWORD" --data-only --use-copy -f "$BACKUP_DIR/public-data.sql"
      $cli db dump --yes --agent no --workdir "$ROOT" --project-ref "$PROJECT_REF" \
        -p "$SUPABASE_DB_PASSWORD" --data-only --use-copy --schema auth -f "$BACKUP_DIR/auth-data.sql"
    else
      $cli db dump --yes --agent no --workdir "$ROOT" --project-ref "$PROJECT_REF" \
        --data-only --use-copy -f "$BACKUP_DIR/public-data.sql"
      $cli db dump --yes --agent no --workdir "$ROOT" --project-ref "$PROJECT_REF" \
        --data-only --use-copy --schema auth -f "$BACKUP_DIR/auth-data.sql"
    fi
    date -u +%Y-%m-%dT%H:%M:%SZ >"$STAMP"
    echo "dump finished $(cat "$STAMP")" >&2
    return 0
  fi

  echo "dump started $(date -u +%Y-%m-%dT%H:%M:%SZ) via management api" >&2
  DUMP_PROJECT_REF="$PROJECT_REF" DUMP_OUT_DIR="$BACKUP_DIR" node "$ROOT/.cursor/hooks/dump-db.mjs"
  echo "dump finished $(cat "$STAMP")" >&2
}

hook_status() {
  local last="never"
  if [[ -f "$STAMP" ]]; then
    last=$(cat "$STAMP")
  fi
  if is_fresh; then
    printf '{"continue":true,"additional_context":"DB dump is fresh (%s)."}' "$last"
  else
    printf '{"continue":true,"additional_context":"DB dump is stale (last: %s); refreshing in background."}' "$last"
  fi
  printf '\n'
}

if [[ "${1:-}" == "--run" ]]; then
  mkdir -p "$BACKUP_DIR"
  run_dump >>"$LOG" 2>&1
  exit 0
fi

cat >/dev/null || true
mkdir -p "$BACKUP_DIR"

if ! is_fresh; then
  nohup "$ROOT/.cursor/hooks/refresh-db-dump.sh" --run >/dev/null 2>&1 &
fi

hook_status
exit 0
