# Rubik’s Cube Prototype Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Deliver a deterministic 3×3×3 cube solver prototype per `Rubiks_Cube_Prototype_Blueprint-2.md`: validate a complete facelet state, find a move sequence, independently verify it, and present Reset Cube / Solve with net + 54-char field + playback.

**Architecture:** Self-contained `rubiks_cube/` package beside the existing SEM DEFENDER SPA. Python core (model, validation, verifier, solver adapter, optional optimal IDA*), FastAPI `POST /solve`, static browser UI. Validation / solving / verification stay separate modules. Does not change SEM DEFENDER repo identity.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, pytest; pinned two-phase backend (`kociemba` if buildable, else pure-Python two-phase); vanilla HTML/CSS/JS UI.

## Global Constraints

- Encoding: URFDLB, 54 facelets, centres at indices 4,13,22,31,40,49
- Solved string: `UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB`
- Metric: HTM (18 moves, each cost 1)
- API: POST /solve with facelets, metric HTM, mode fast|optimal, timeout_ms
- UI must include Reset Cube, Solve, editable six-face net, copyable 54-char field sharing one state
- No photo recognition in MVP
- Independent verifier uses separate facelet permutations from solver tables

---

## Task 1: Model, moves, validation, verifier

- [ ] Facelet/cubie representations and conversions (`model.py`)
- [ ] Facelet move permutations from 3D sticker coordinates (`moves.py` / verifier source)
- [ ] Legality checks with diagnostics (`validation.py`)
- [ ] Independent replay (`verifier.py`)
- [ ] Tests: four-turns identity, move+inverse, U2==U+U, validation rejects, round-trip

## Task 2: Fast solver + API

- [ ] Adapter wrapping two-phase backend (`solver_adapter.py`)
- [ ] Orchestration matching §9 (`solve` pipeline)
- [ ] FastAPI routes (`api.py`) + CLI (`cli.py`)
- [ ] Integration: scramble → solve → verify → solved facelets

## Task 3: Optional optimal mode

- [ ] Bounded IDA* with admissible heuristics (`optimal.py`)
- [ ] Depth-≤4 comparison vs BFS ground truth
- [ ] Timeout preserves verified incumbent, optimality NOT_PROVEN

## Task 4: Browser UI

- [ ] Six-face labelled net + 54-char field
- [ ] Reset Cube / Solve controls per §3.1
- [ ] Move playback with revision/stale-result protection
- [ ] Serve via FastAPI static files

## Task 5: Gates, docs, ship

- [ ] ≥1000 seeded scramble fixtures (zero wrong verified results)
- [ ] README + blueprint copy under `rubiks_cube/`
- [ ] Commit, push, open PR
