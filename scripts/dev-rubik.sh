#!/usr/bin/env bash
# Start Rubik API + Vite UI on fixed ports for Cursor Cloud.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

API_PORT="${RUBIK_API_PORT:-8765}"
UI_PORT="${RUBIK_UI_PORT:-5173}"

free_port() {
  local port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
  fi
  # Fallback: kill listeners via lsof/ss
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -t -iTCP:"${port}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      kill ${pids} 2>/dev/null || true
    fi
  fi
}

echo "Freeing ports ${UI_PORT} and ${API_PORT}…"
free_port "$UI_PORT"
free_port "$API_PORT"
sleep 0.4

if [[ ! -d rubiks_cube/.venv ]]; then
  echo "Creating rubiks_cube/.venv…"
  python3 -m venv rubiks_cube/.venv
  # shellcheck disable=SC1091
  source rubiks_cube/.venv/bin/activate
  pip install -r rubiks_cube/requirements.txt
else
  # shellcheck disable=SC1091
  source rubiks_cube/.venv/bin/activate
fi

if [[ ! -d node_modules ]]; then
  npm install
fi

echo "Starting API on 0.0.0.0:${API_PORT}…"
(
  cd rubiks_cube
  PYTHONPATH=. python -m rubik.cli serve --host 0.0.0.0 --port "$API_PORT" --strict-port
) &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for API health
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.15
done

echo
echo "============================================"
echo "  Open the cube UI at:"
echo "  http://127.0.0.1:${UI_PORT}/rubik/"
echo "============================================"
echo
echo "(Do not use :${API_PORT} in the browser — Cursor shows about:blank for that port.)"
echo

RUBIK_API_PORT="$API_PORT" npm run dev -- --host 0.0.0.0 --port "$UI_PORT" --strictPort
