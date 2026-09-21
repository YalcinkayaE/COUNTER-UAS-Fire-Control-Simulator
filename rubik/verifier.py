"""Independent facelet-level move replay.

Uses the 3D-coordinate-derived MOVE_TABLES from model.py. Solver backends must
not share mutable move tables with this module; verification is a separate
replay of the candidate sequence from the submitted facelets.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Sequence

from .model import SOLVED_FACELETS, apply_moves, parse_move_string


@dataclass
class VerifyResult:
    ok: bool
    status: str  # VERIFIED | INTERNAL_ERROR
    final_facelets: str
    message: str = ""


def verify_solution(facelets: str, moves: Sequence[str] | str) -> VerifyResult:
    if isinstance(moves, str):
        try:
            move_list = parse_move_string(moves)
        except ValueError as exc:
            return VerifyResult(
                ok=False,
                status="INTERNAL_ERROR",
                final_facelets=facelets,
                message=str(exc),
            )
    else:
        move_list = list(moves)

    try:
        final = apply_moves(facelets, move_list)
    except ValueError as exc:
        return VerifyResult(
            ok=False,
            status="INTERNAL_ERROR",
            final_facelets=facelets,
            message=str(exc),
        )

    if final == SOLVED_FACELETS:
        return VerifyResult(ok=True, status="VERIFIED", final_facelets=final)
    return VerifyResult(
        ok=False,
        status="INTERNAL_ERROR",
        final_facelets=final,
        message="Replay did not reach the solved facelets",
    )


def moves_are_identity_sequence(moves: Sequence[str]) -> bool:
    """True if applying moves to the solved cube yields solved (for tests)."""
    return apply_moves(SOLVED_FACELETS, moves) == SOLVED_FACELETS
