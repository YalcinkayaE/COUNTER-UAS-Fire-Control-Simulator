# rubic_experiments

Rubik’s Cube prototype solver (APL-001): validate a complete URFDLB facelet state, find an HTM move sequence, independently verify it, and replay on a CSS 3D cube + editable net.

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
python -m rubik.cli serve --host 0.0.0.0 --port 8765
```

Open **http://127.0.0.1:8765/**

In Cursor Cloud, forward port **8765** in the Ports panel if the tab is blank.

## Controls

- **Reset Cube** — canonical solved 54-facelet state
- **Solve** — fast (Kociemba) or bounded optimal; independent verify + playback
- Six-face net + 54-char field (shared state)
- CSS 3D cube — drag to orbit; face turns animate on Step / Play

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
| `rubik/model.py` | Facelets, cubies, move tables |
| `rubik/validation.py` | Legality diagnostics |
| `rubik/verifier.py` | Independent replay |
| `rubik/solver_adapter.py` | Kociemba two-phase |
| `rubik/optimal.py` | Bounded IDA* |
| `rubik/api.py` / `cli.py` | HTTP + CLI |
| `web/` | UI |
| `BLUEPRINT.md` | Design spec |
| `docs/` | Implementation plans |

## CLI

```bash
python -m rubik.cli scramble --seed 1 --length 25
python -m rubik.cli solve <facelets> --mode fast
```
