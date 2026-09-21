"""Replaceable two-phase solver adapter (pinned: kociemba)."""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import List, Optional

from .model import SOLVED_FACELETS, parse_move_string

SOLVER_VERSION = "kociemba-1.2.1-adapter-0.1"
TABLES_CHECKSUM = "kociemba-cprunetables"


@dataclass
class FastSolveResult:
    moves: Optional[List[str]]
    elapsed_ms: float
    error: Optional[str] = None


def _tables_checksum() -> str:
    try:
        import kociemba
        import os

        root = os.path.join(os.path.dirname(kociemba.__file__), "cprunetables")
        h = hashlib.sha256()
        if os.path.isdir(root):
            for name in sorted(os.listdir(root)):
                path = os.path.join(root, name)
                if os.path.isfile(path):
                    with open(path, "rb") as fh:
                        h.update(name.encode())
                        h.update(fh.read(4096))
        return h.hexdigest()[:16]
    except Exception:
        return TABLES_CHECKSUM


TABLES_CHECKSUM = _tables_checksum()


def fast_solve(facelets: str, timeout_ms: int = 5000) -> FastSolveResult:
    """Run Kociemba two-phase search. Does not verify; caller must."""
    if facelets == SOLVED_FACELETS:
        return FastSolveResult(moves=[], elapsed_ms=0.0)

    try:
        import kociemba
    except ImportError as exc:
        return FastSolveResult(moves=None, elapsed_ms=0.0, error=f"kociemba unavailable: {exc}")

    # kociemba max_depth approximates effort; convert timeout coarsely.
    max_depth = 24
    if timeout_ms < 500:
        max_depth = 20
    elif timeout_ms < 2000:
        max_depth = 22

    t0 = time.perf_counter()
    try:
        raw = kociemba.solve(facelets, max_depth=max_depth)
    except Exception as exc:  # noqa: BLE001 — surface backend errors
        elapsed = (time.perf_counter() - t0) * 1000
        return FastSolveResult(moves=None, elapsed_ms=elapsed, error=str(exc))
    elapsed = (time.perf_counter() - t0) * 1000

    if elapsed > timeout_ms and not raw:
        return FastSolveResult(moves=None, elapsed_ms=elapsed, error="TIME_LIMIT")

    try:
        moves = parse_move_string(raw) if raw else []
    except ValueError as exc:
        return FastSolveResult(moves=None, elapsed_ms=elapsed, error=str(exc))

    return FastSolveResult(moves=moves, elapsed_ms=elapsed)
