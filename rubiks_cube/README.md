# Rubik’s Cube Prototype Solver (APL-001)

Deterministic 3×3×3 solver prototype per the blueprint: validate a complete facelet state, find an HTM move sequence, independently verify it, and present Reset Cube / Solve with a six-face net.

This package lives beside the existing SEM DEFENDER simulator and does not change that product’s identity.

## Quick start

```bash
cd rubiks_cube
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
python -m rubik.cli serve
```

Open http://127.0.0.1:8765 (if that port is busy, the CLI picks the next free port and prints the URL). Use `--strict-port` to fail instead, or `--port 8766` to choose one.

## Controls

- **Reset Cube** — restores `UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB`
- **Solve** — validates, runs fast (Kociemba two-phase) or bounded optimal IDA*, independently verifies, then plays back moves
- Editable six-face net + copyable 54-character URFDLB field (shared state)

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
