"""Integration: solve + independent verify."""

from rubik.model import SOLVED_FACELETS, apply_moves, random_legal_moves
from rubik.optimal import bfs_shortest, optimal_solve
from rubik.solver import solve_request
from rubik.verifier import verify_solution


def test_already_solved():
    r = solve_request(SOLVED_FACELETS, mode="fast")
    assert r.status == "SOLVED"
    assert r.moves == []
    assert r.move_count == 0
    assert r.verified
    assert r.optimality == "PROVEN"


def test_fast_solve_and_verify():
    scramble = random_legal_moves(42, 25)
    state = apply_moves(SOLVED_FACELETS, scramble)
    r = solve_request(state, mode="fast", timeout_ms=5000)
    assert r.status == "SOLVED"
    assert r.verified
    assert r.moves is not None
    assert verify_solution(state, r.moves).ok
    assert apply_moves(state, r.moves) == SOLVED_FACELETS


def test_invalid_rejected():
    r = solve_request("U" * 54)
    assert r.status == "INVALID_STATE"
    assert r.moves is None


def test_thousand_seeded_scrambles():
    failures = []
    for seed in range(1000):
        moves = random_legal_moves(seed, 20 + (seed % 15))
        state = apply_moves(SOLVED_FACELETS, moves)
        r = solve_request(state, mode="fast", timeout_ms=5000)
        if r.status != "SOLVED" or not r.verified:
            failures.append((seed, r.status, r.errors))
            continue
        if not verify_solution(state, r.moves).ok:
            failures.append((seed, "VERIFY_FAIL", r.moves))
    assert failures == []


def test_optimal_matches_bfs_depth4():
    # All unique states reachable in ≤4 moves from solved (via scramble then solve)
    seen = {SOLVED_FACELETS}
    from collections import deque
    from rubik.model import MOVE_NAMES, apply_move

    q = deque([(SOLVED_FACELETS, [])])
    samples = []
    while q:
        state, path = q.popleft()
        if path:
            samples.append(state)
        if len(path) >= 4:
            continue
        last = path[-1][0] if path else None
        for mv in MOVE_NAMES:
            if last and mv[0] == last:
                continue
            nxt = apply_move(state, mv)
            if nxt in seen:
                continue
            seen.add(nxt)
            q.append((nxt, path + [mv]))

    # Spot-check a subset for speed
    checked = 0
    for state in list(samples)[::17]:
        truth = bfs_shortest(state, max_depth=4)
        assert truth is not None
        opt = optimal_solve(state, timeout_ms=2000, max_bound=4)
        assert opt.moves is not None
        assert len(opt.moves) == len(truth)
        assert verify_solution(state, opt.moves).ok
        checked += 1
        if checked >= 30:
            break
    assert checked >= 10
