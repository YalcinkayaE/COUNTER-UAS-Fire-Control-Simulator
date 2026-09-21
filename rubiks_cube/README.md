# Rubik’s Cube Prototype Solver (APL-001)

Deterministic 3×3×3 solver prototype per the blueprint: validate a complete facelet state, find an HTM move sequence, independently verify it, and present Reset Cube / Solve with a six-face net + CSS 3D cube.

This package lives beside the existing SEM DEFENDER simulator and does not change that product’s identity.

## Quick start (Cursor Cloud)

From the **repo root** (not only `rubiks_cube/`), one command:

```bash
npm run dev:rubik
```

Then open:

**http://127.0.0.1:5173/rubik/**

That script frees ports 5173/8765, starts the Python API on 8765, and Vite on 5173 with `/solve` proxied correctly.

### Why not :8765 / :8766 in the browser?

Cursor Cloud often opens **`about:blank`** for the API port. Always use **Vite :5173** + `/rubik/`.

### If you start the two processes yourself

```bash
# kill leftovers first if you see “port in use”
fuser -k 5173/tcp 8765/tcp 2>/dev/null

# Terminal 1
cd rubiks_cube && source .venv/bin/activate
python -m rubik.cli serve --port 8765 --strict-port

# Terminal 2 (repo root)
npm run dev -- --port 5173 --strictPort
```

If Vite says “Port 5173 is in use, trying another one…” you are on the **wrong URL** (e.g. 5174). Stop the other Vite, or open `http://127.0.0.1:<that-port>/rubik/` and set `RUBIK_API_PORT` to match the API port.

## Controls

- **Reset Cube** — restores `UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB`
- **Solve** — validates, runs fast (Kociemba two-phase) or bounded optimal IDA*, independently verifies, then plays back moves
- Editable six-face net + copyable 54-character URFDLB field (shared state)
- **CSS 3D cube** — drag to orbit; face turns animate on Step / Play and manual moves

## API

`POST /solve`

```json
{
  "facelets": "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB",
  "metric": "HTM",
  "mode": "fast",
  "timeout_ms": 5000
}
```

## Layout

| Path | Role |
|------|------|
| `rubik/model.py` | Facelets, cubies, 3D-derived move tables |
| `rubik/validation.py` | Legality diagnostics |
| `rubik/verifier.py` | Independent replay |
| `rubik/solver_adapter.py` | Kociemba two-phase adapter |
| `rubik/optimal.py` | Bounded IDA* |
| `rubik/solver.py` | Orchestration |
| `rubik/api.py` | FastAPI |
| `web/` | Reset / Solve UI (also copied to `/public/rubik` for Vite) |

## CLI

```bash
python -m rubik.cli scramble --seed 1 --length 25
python -m rubik.cli solve <facelets> --mode fast
```
