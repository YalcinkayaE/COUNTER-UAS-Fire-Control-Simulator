"""Legality checks and location-aware diagnostics."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .model import (
    CENTRE_INDICES,
    CORNER_COLORS,
    CORNER_FACELETS,
    EDGE_COLORS,
    EDGE_FACELETS,
    FACES,
    SOLVED_FACELETS,
    CubieCube,
    cubie_to_facelets,
    facelets_to_cubie,
)


@dataclass
class Diagnostic:
    code: str
    message: str
    locations: List[int] = field(default_factory=list)


@dataclass
class ValidationResult:
    ok: bool
    status: str  # VALID | NEEDS_INPUT | INVALID_STATE
    facelets: Optional[str] = None
    cubie: Optional[CubieCube] = None
    errors: List[Diagnostic] = field(default_factory=list)

    @property
    def is_solved(self) -> bool:
        return self.ok and self.facelets == SOLVED_FACELETS


def validate_facelets(raw: str) -> ValidationResult:
    errors: List[Diagnostic] = []

    if raw is None:
        return ValidationResult(
            ok=False,
            status="NEEDS_INPUT",
            errors=[Diagnostic("NEEDS_INPUT", "No facelet string provided")],
        )

    s = "".join(ch for ch in raw.strip().upper() if not ch.isspace())

    if len(s) < 54:
        missing = list(range(len(s), 54))
        return ValidationResult(
            ok=False,
            status="NEEDS_INPUT",
            errors=[
                Diagnostic(
                    "NEEDS_INPUT",
                    f"Incomplete state: {len(s)}/54 stickers defined",
                    missing,
                )
            ],
        )

    if len(s) > 54:
        return ValidationResult(
            ok=False,
            status="INVALID_STATE",
            errors=[
                Diagnostic(
                    "INVALID_COUNTS",
                    f"Expected 54 stickers, got {len(s)}",
                    list(range(54, len(s))),
                )
            ],
        )

    bad_symbols = [i for i, ch in enumerate(s) if ch not in FACES]
    if bad_symbols:
        return ValidationResult(
            ok=False,
            status="INVALID_STATE",
            errors=[
                Diagnostic(
                    "INVALID_COUNTS",
                    "Unrecognised sticker symbols (expected URFDLB)",
                    bad_symbols,
                )
            ],
        )

    centres = [s[i] for i in CENTRE_INDICES]
    if len(set(centres)) != 6:
        return ValidationResult(
            ok=False,
            status="INVALID_STATE",
            errors=[
                Diagnostic(
                    "INVALID_COUNTS",
                    f"Centres must be six distinct faces, got {''.join(centres)}",
                    list(CENTRE_INDICES),
                )
            ],
        )

    # Map observed centre colours to canonical URFDLB by centre faces already being symbols.
    # Symbols identify destination faces; centres must already read URFDLB in order.
    expected_centres = list(FACES)
    if centres != expected_centres:
        # Allow physically rotated whole-cube only via explicit normalisation later.
        # For MVP require centres already URFDLB.
        return ValidationResult(
            ok=False,
            status="INVALID_STATE",
            errors=[
                Diagnostic(
                    "INVALID_COUNTS",
                    "Centres must be U,R,F,D,L,B at indices 4,13,22,31,40,49 "
                    f"(got {''.join(centres)}). Reorient the cube or remap colours.",
                    list(CENTRE_INDICES),
                )
            ],
        )

    from collections import Counter

    counts = Counter(s)
    for face in FACES:
        if counts[face] != 9:
            locs = [i for i, ch in enumerate(s) if ch == face]
            errors.append(
                Diagnostic(
                    "INVALID_COUNTS",
                    f"Colour {face} appears {counts[face]} times (expected 9)",
                    locs,
                )
            )
    if errors:
        return ValidationResult(ok=False, status="INVALID_STATE", errors=errors)

    # Corner pieces
    seen_corners = {}
    for pos in range(8):
        cols = tuple(s[CORNER_FACELETS[pos][k]] for k in range(3))
        # Identify piece by colour set
        key = frozenset(cols)
        expected_sets = {frozenset(c): i for i, c in enumerate(CORNER_COLORS)}
        if key not in expected_sets:
            errors.append(
                Diagnostic(
                    "DUPLICATE_PIECE",
                    f"Invalid corner colour triple {cols} at corner position {pos}",
                    list(CORNER_FACELETS[pos]),
                )
            )
            continue
        piece = expected_sets[key]
        if piece in seen_corners:
            errors.append(
                Diagnostic(
                    "DUPLICATE_PIECE",
                    f"Corner piece {CORNER_COLORS[piece]} appears more than once",
                    list(CORNER_FACELETS[pos]) + seen_corners[piece],
                )
            )
        else:
            seen_corners[piece] = list(CORNER_FACELETS[pos])

    # Edge pieces
    seen_edges = {}
    for pos in range(12):
        cols = tuple(s[EDGE_FACELETS[pos][k]] for k in range(2))
        key = frozenset(cols)
        expected_sets = {frozenset(c): i for i, c in enumerate(EDGE_COLORS)}
        if key not in expected_sets or len(cols) != 2 or cols[0] == cols[1]:
            errors.append(
                Diagnostic(
                    "DUPLICATE_PIECE",
                    f"Invalid edge colour pair {cols} at edge position {pos}",
                    list(EDGE_FACELETS[pos]),
                )
            )
            continue
        piece = expected_sets[key]
        if piece in seen_edges:
            errors.append(
                Diagnostic(
                    "DUPLICATE_PIECE",
                    f"Edge piece {EDGE_COLORS[piece]} appears more than once",
                    list(EDGE_FACELETS[pos]) + seen_edges[piece],
                )
            )
        else:
            seen_edges[piece] = list(EDGE_FACELETS[pos])

    if errors:
        return ValidationResult(ok=False, status="INVALID_STATE", errors=errors)

    try:
        cubie = facelets_to_cubie(s)
    except ValueError as exc:
        return ValidationResult(
            ok=False,
            status="INVALID_STATE",
            errors=[Diagnostic("DUPLICATE_PIECE", str(exc))],
        )

    twist = sum(cubie.co) % 3
    if twist != 0:
        errors.append(
            Diagnostic(
                "CORNER_TWIST_SUM",
                f"Corner orientations sum to {sum(cubie.co)} ≢ 0 (mod 3)",
            )
        )

    flip = sum(cubie.eo) % 2
    if flip != 0:
        errors.append(
            Diagnostic(
                "EDGE_FLIP_PARITY",
                f"Edge orientations sum to {sum(cubie.eo)} ≢ 0 (mod 2)",
            )
        )

    def perm_parity(arr: tuple[int, ...]) -> int:
        # 0 even, 1 odd
        visited = [False] * len(arr)
        parity = 0
        for i in range(len(arr)):
            if visited[i]:
                continue
            cycle = 0
            j = i
            while not visited[j]:
                visited[j] = True
                j = arr[j]
                cycle += 1
            if cycle > 0:
                parity ^= (cycle - 1) % 2
        return parity

    if perm_parity(cubie.cp) != perm_parity(cubie.ep):
        errors.append(
            Diagnostic(
                "PERMUTATION_PARITY",
                "Corner and edge permutation parities do not match",
            )
        )

    if errors:
        return ValidationResult(ok=False, status="INVALID_STATE", errors=errors)

    # Round-trip facelet → cubie → facelet
    rt = cubie_to_facelets(cubie)
    if rt != s:
        return ValidationResult(
            ok=False,
            status="INVALID_STATE",
            errors=[
                Diagnostic(
                    "INTERNAL_ERROR",
                    "Facelet/cubie round-trip mismatch",
                    [i for i in range(54) if rt[i] != s[i]],
                )
            ],
        )

    return ValidationResult(ok=True, status="VALID", facelets=s, cubie=cubie)
