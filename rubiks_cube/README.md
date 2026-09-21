# Rubik’s Cube Prototype Solver (APL-001)

Deterministic 3×3×3 solver prototype per the blueprint: validate a complete facelet state, find an HTM move sequence, independently verify it, and present Reset Cube / Solve with a six-face net.

This package lives beside the existing SEM DEFENDER simulator and does not change that product’s identity.

## Quick start

```bash
# Terminal 1 — API
cd rubiks_cube
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m rubik.cli serve

# Terminal 2 — UI (recommended in Cursor Cloud)
cd ..   # repo root
npm install
npm run dev
```

**Open this URL (not :8765 alone):**

**http://127.0.0.1:5173/rubik/**

Cursor Cloud often shows `about:blank` for :8765. Port **5173** is the Vite app Cursor forwards; `/rubik/` is the cube UI, with `/solve` proxied to the Python API on 8765.

Direct API+UI on 8765 still works inside the VM (`python -m rubik.cli serve` binds `0.0.0.0:8765`). Use `--strict-port` / `--port` if needed.

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
| `web/` | Reset / Solve UI |

## CLI

```bash
python -m rubik.cli scramble --seed 1 --length 25
python -m rubik.cli solve <facelets> --mode fast
```
