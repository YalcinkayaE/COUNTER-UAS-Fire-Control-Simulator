"""Move correctness and representation tests."""

from rubik.model import (
    SOLVED_FACELETS,
    apply_move,
    apply_moves,
    cubie_to_facelets,
    facelets_to_cubie,
    random_legal_moves,
)


def test_four_turns_identity():
    for face in "URFDLB":
        state = SOLVED_FACELETS
        for _ in range(4):
            state = apply_move(state, face)
        assert state == SOLVED_FACELETS


def test_move_inverse_identity():
    for face in "URFDLB":
        assert apply_moves(SOLVED_FACELETS, [face, face + "'"]) == SOLVED_FACELETS
        assert apply_moves(SOLVED_FACELETS, [face + "'", face]) == SOLVED_FACELETS


def test_half_turn_equals_two_quarters():
    for face in "URFDLB":
        a = apply_move(SOLVED_FACELETS, face + "2")
        b = apply_moves(SOLVED_FACELETS, [face, face])
        assert a == b


def test_facelet_cubie_roundtrip_solved():
    cube = facelets_to_cubie(SOLVED_FACELETS)
    assert cubie_to_facelets(cube) == SOLVED_FACELETS


def test_facelet_cubie_roundtrip_scrambles():
    for seed in range(20):
        moves = random_legal_moves(seed, 30)
        state = apply_moves(SOLVED_FACELETS, moves)
        assert cubie_to_facelets(facelets_to_cubie(state)) == state
