"""Bounded IDA* optimal search with admissible heuristics."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import List, Optional, Tuple

from .model import MOVE_NAMES, SOLVED_FACELETS, apply_move, facelets_to_cubie


@dataclass
class OptimalResult:
    moves: Optional[List[str]]
    optimality: str  # PROVEN | NOT_PROVEN | NOT_APPLICABLE
    lower_bound: int
    upper_bound: Optional[int]
    elapsed_ms: float
    termination_reason: Optional[str] = None


def heuristic(facelets: str) -> int:
    """Admissible lower bound from cubie mismatches.

    Each move can place at most 4 corners and 4 edges correctly in the worst
    case for counting arguments we use a conservative floor of mismatches/8
    (a single HTM move affects ≤8 cubies). Missing PDB entries would use 0;
    this closed form never overestimates.
    """
    if facelets == SOLVED_FACELETS:
        return 0
    cube = facelets_to_cubie(facelets)
    bad_corners = sum(
        1 for i in range(8) if cube.cp[i] != i or cube.co[i] != 0
    )
    bad_edges = sum(
        1 for i in range(12) if cube.ep[i] != i or cube.eo[i] != 0
    )
    # ≤8 cubies touched per face turn
    return max(1, (bad_corners + bad_edges + 7) // 8) if (bad_corners + bad_edges) else 0


def optimal_solve(
    facelets: str,
    timeout_ms: int = 5000,
    incumbent: Optional[List[str]] = None,
    max_bound: int = 8,
) -> OptimalResult:
    """IDA* over 18 HTM moves. Safe pruning: consecutive same-face moves."""
    t0 = time.perf_counter()
    deadline = t0 + timeout_ms / 1000.0

    if facelets == SOLVED_FACELETS:
        return OptimalResult(
            moves=[],
            optimality="PROVEN",
            lower_bound=0,
            upper_bound=0,
            elapsed_ms=0.0,
        )

    best = list(incumbent) if incumbent else None
    best_len = len(best) if best is not None else 10**9
    completed_threshold = -1
    timed_out = False
    found_at_bound = False

    h0 = heuristic(facelets)
    threshold = h0
    limit = min(max_bound, best_len)

    def search(
        state: str, g: int, bound: int, last_face: Optional[str], path: List[str]
    ) -> Optional[int]:
        nonlocal best, best_len, timed_out, found_at_bound
        if time.perf_counter() >= deadline:
            timed_out = True
            return None
        f = g + heuristic(state)
        if f > bound:
            return f
        if state == SOLVED_FACELETS:
            if g < best_len:
                best = list(path)
                best_len = g
            found_at_bound = True
            return None
        min_exceed = 10**9
        for mv in MOVE_NAMES:
            face = mv[0]
            if last_face is not None and face == last_face:
                continue
            nxt = apply_move(state, mv)
            path.append(mv)
            t = search(nxt, g + 1, bound, face, path)
            path.pop()
            if timed_out:
                return None
            if t is not None:
                min_exceed = min(min_exceed, t)
        return min_exceed if min_exceed < 10**9 else None

    while threshold <= limit and not timed_out:
        found_at_bound = False
        path: List[str] = []
        t = search(facelets, 0, threshold, None, path)
        if timed_out:
            break
        completed_threshold = threshold
        if found_at_bound and best_len <= threshold:
            # Fully explored all smaller thresholds already; this bound found a solution
            break
        if t is None and not found_at_bound:
            threshold += 1
            continue
        if found_at_bound:
            break
        threshold = max(threshold + 1, t if t is not None else threshold + 1)
        limit = min(limit, best_len)

    elapsed = (time.perf_counter() - t0) * 1000
    lower = max(h0, completed_threshold if completed_threshold >= 0 else h0)

    if best is not None and not timed_out and completed_threshold >= best_len:
        return OptimalResult(
            moves=best,
            optimality="PROVEN",
            lower_bound=best_len,
            upper_bound=best_len,
            elapsed_ms=elapsed,
        )

    if best is not None:
        return OptimalResult(
            moves=best,
            optimality="NOT_PROVEN",
            lower_bound=lower,
            upper_bound=len(best),
            elapsed_ms=elapsed,
            termination_reason="TIME_LIMIT" if timed_out else None,
        )

    return OptimalResult(
        moves=None,
        optimality="NOT_PROVEN",
        lower_bound=lower,
        upper_bound=None,
        elapsed_ms=elapsed,
        termination_reason="TIME_LIMIT" if timed_out else "NO_SOLUTION_IN_BOUND",
    )


def bfs_shortest(facelets: str, max_depth: int = 4) -> Optional[List[str]]:
    """Breadth-first shortest path for shallow ground-truth checks."""
    from collections import deque

    if facelets == SOLVED_FACELETS:
        return []
    q: deque[Tuple[str, List[str]]] = deque([(facelets, [])])
    seen = {facelets}
    while q:
        state, path = q.popleft()
        if len(path) >= max_depth:
            continue
        last = path[-1][0] if path else None
        for mv in MOVE_NAMES:
            if last and mv[0] == last:
                continue
            nxt = apply_move(state, mv)
            if nxt in seen:
                continue
            npath = path + [mv]
            if nxt == SOLVED_FACELETS:
                return npath
            seen.add(nxt)
            q.append((nxt, npath))
    return None
