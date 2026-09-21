"""Validation legality diagnostics."""

from rubik.model import SOLVED_FACELETS, apply_moves, cubie_to_facelets, facelets_to_cubie
from rubik.validation import validate_facelets


def test_solved_valid():
    r = validate_facelets(SOLVED_FACELETS)
    assert r.ok
    assert r.is_solved


def test_partial_needs_input():
    r = validate_facelets("UUUUUUUUU")
    assert r.status == "NEEDS_INPUT"


def test_wrong_counts():
    bad = "U" * 54
    r = validate_facelets(bad)
    assert not r.ok
    assert r.status == "INVALID_STATE"
    assert any(e.code == "INVALID_COUNTS" for e in r.errors)


def test_single_edge_flip():
    cube = facelets_to_cubie(SOLVED_FACELETS)
    eo = list(cube.eo)
    eo[0] = 1
    flipped = cubie_to_facelets(
        type(cube)(cp=cube.cp, co=cube.co, ep=cube.ep, eo=tuple(eo))
    )
    r = validate_facelets(flipped)
    assert not r.ok
    assert any(e.code == "EDGE_FLIP_PARITY" for e in r.errors)


def test_single_corner_twist():
    cube = facelets_to_cubie(SOLVED_FACELETS)
    co = list(cube.co)
    co[0] = 1
    twisted = cubie_to_facelets(
        type(cube)(cp=cube.cp, co=tuple(co), ep=cube.ep, eo=cube.eo)
    )
    r = validate_facelets(twisted)
    assert not r.ok
    assert any(e.code == "CORNER_TWIST_SUM" for e in r.errors)


def test_odd_swap_parity():
    cube = facelets_to_cubie(SOLVED_FACELETS)
    cp = list(cube.cp)
    cp[0], cp[1] = cp[1], cp[0]
    swapped = cubie_to_facelets(
        type(cube)(cp=tuple(cp), co=cube.co, ep=cube.ep, eo=cube.eo)
    )
    r = validate_facelets(swapped)
    assert not r.ok
    assert any(e.code == "PERMUTATION_PARITY" for e in r.errors)


def test_legal_scramble_accepted():
    state = apply_moves(SOLVED_FACELETS, ["R", "U", "R'", "U'", "F2", "L", "D'"])
    r = validate_facelets(state)
    assert r.ok
