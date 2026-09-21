"""Solve orchestration matching blueprint §8–§9."""

from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

from .model import SOLVED_FACELETS
from .optimal import optimal_solve
from .solver_adapter import SOLVER_VERSION, TABLES_CHECKSUM, fast_solve
from .validation import validate_facelets
from .verifier import verify_solution


@dataclass
class SolveResponse:
    status: str
    moves: Optional[List[str]]
    move_count: Optional[int]
    verified: bool
    optimality: str
    lower_bound: Optional[int] = None
    upper_bound: Optional[int] = None
    elapsed_ms: float = 0.0
    solver_version: str = SOLVER_VERSION
    tables_checksum: str = TABLES_CHECKSUM
    errors: List[Dict[str, Any]] = field(default_factory=list)
    termination_reason: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def solve_request(
    facelets: str,
    metric: str = "HTM",
    mode: str = "fast",
    timeout_ms: int = 5000,
) -> SolveResponse:
    t0 = time.perf_counter()

    if metric != "HTM":
        return SolveResponse(
            status="INVALID_STATE",
            moves=None,
            move_count=None,
            verified=False,
            optimality="NOT_APPLICABLE",
            elapsed_ms=(time.perf_counter() - t0) * 1000,
            errors=[{"code": "INVALID_METRIC", "message": f"Unsupported metric: {metric}"}],
        )

    if mode not in ("fast", "optimal"):
        return SolveResponse(
            status="INVALID_STATE",
            moves=None,
            move_count=None,
            verified=False,
            optimality="NOT_APPLICABLE",
            elapsed_ms=(time.perf_counter() - t0) * 1000,
            errors=[{"code": "INVALID_MODE", "message": f"Unsupported mode: {mode}"}],
        )

    timeout_ms = max(1, min(int(timeout_ms), 60_000))

    validation = validate_facelets(facelets)
    if validation.status == "NEEDS_INPUT":
        return SolveResponse(
            status="NEEDS_INPUT",
            moves=None,
            move_count=None,
            verified=False,
            optimality="NOT_APPLICABLE",
            elapsed_ms=(time.perf_counter() - t0) * 1000,
            errors=[
                {"code": e.code, "message": e.message, "locations": e.locations}
                for e in validation.errors
            ],
        )
    if not validation.ok:
        return SolveResponse(
            status="INVALID_STATE",
            moves=None,
            move_count=None,
            verified=False,
            optimality="NOT_APPLICABLE",
            elapsed_ms=(time.perf_counter() - t0) * 1000,
            errors=[
                {"code": e.code, "message": e.message, "locations": e.locations}
                for e in validation.errors
            ],
        )

    state = validation.facelets
    assert state is not None

    if state == SOLVED_FACELETS:
        return SolveResponse(
            status="SOLVED",
            moves=[],
            move_count=0,
            verified=True,
            optimality="PROVEN",
            lower_bound=0,
            upper_bound=0,
            elapsed_ms=(time.perf_counter() - t0) * 1000,
        )

    incumbent: Optional[List[str]] = None
    fast = fast_solve(state, timeout_ms=timeout_ms)
    if fast.moves is not None:
        vr = verify_solution(state, fast.moves)
        if not vr.ok:
            return SolveResponse(
                status="INTERNAL_ERROR",
                moves=None,
                move_count=None,
                verified=False,
                optimality="NOT_APPLICABLE",
                elapsed_ms=(time.perf_counter() - t0) * 1000,
                errors=[{"code": "INTERNAL_ERROR", "message": vr.message}],
            )
        incumbent = fast.moves

    if mode == "fast":
        if incumbent is None:
            return SolveResponse(
                status="TIMEOUT" if fast.error else "INTERNAL_ERROR",
                moves=None,
                move_count=None,
                verified=False,
                optimality="NOT_APPLICABLE",
                elapsed_ms=(time.perf_counter() - t0) * 1000,
                errors=[{"code": "SOLVER_ERROR", "message": fast.error or "No solution"}],
                termination_reason="TIME_LIMIT" if fast.error == "TIME_LIMIT" else None,
            )
        return SolveResponse(
            status="SOLVED",
            moves=incumbent,
            move_count=len(incumbent),
            verified=True,
            optimality="NOT_PROVEN",
            upper_bound=len(incumbent),
            elapsed_ms=(time.perf_counter() - t0) * 1000,
        )

    # optimal mode
    used = (time.perf_counter() - t0) * 1000
    remain = max(1, timeout_ms - used)
    opt = optimal_solve(state, timeout_ms=int(remain), incumbent=incumbent)

    if opt.moves is not None:
        vr = verify_solution(state, opt.moves)
        if not vr.ok:
            return SolveResponse(
                status="INTERNAL_ERROR",
                moves=None,
                move_count=None,
                verified=False,
                optimality="NOT_APPLICABLE",
                elapsed_ms=(time.perf_counter() - t0) * 1000,
                errors=[{"code": "INTERNAL_ERROR", "message": vr.message}],
            )
        return SolveResponse(
            status="SOLVED",
            moves=opt.moves,
            move_count=len(opt.moves),
            verified=True,
            optimality=opt.optimality,
            lower_bound=opt.lower_bound,
            upper_bound=opt.upper_bound,
            elapsed_ms=(time.perf_counter() - t0) * 1000,
            termination_reason=opt.termination_reason,
        )

    if incumbent is not None:
        return SolveResponse(
            status="SOLVED",
            moves=incumbent,
            move_count=len(incumbent),
            verified=True,
            optimality="NOT_PROVEN",
            lower_bound=opt.lower_bound,
            upper_bound=len(incumbent),
            elapsed_ms=(time.perf_counter() - t0) * 1000,
            termination_reason=opt.termination_reason or "TIME_LIMIT",
        )

    return SolveResponse(
        status="TIMEOUT",
        moves=None,
        move_count=None,
        verified=False,
        optimality="NOT_PROVEN",
        lower_bound=opt.lower_bound,
        elapsed_ms=(time.perf_counter() - t0) * 1000,
        termination_reason="TIME_LIMIT",
    )
