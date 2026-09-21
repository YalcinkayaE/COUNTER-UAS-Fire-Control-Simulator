"""Facelet and cubie representations with URFDLB conventions.

Facelets: 54 symbols identifying destination faces (centres fixed).
Cubies: piece-at-position arrays cp[8], co[8], ep[12], eo[12].

Corner order: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
Edge order:   UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR

Corner orientation: 0 if the U/D colour sits on U/D; +1 per clockwise twist
of the cubie relative to that reference.
Edge orientation: 0 if the cubie can be solved with only <U,D,R,L> and F2/B2
in the usual Kociemba sense (U/D colour on U/D for UD edges; F/B colour on
F/B for equatorial edges).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List, Sequence, Tuple

FACES = "URFDLB"
FACE_INDEX = {f: i for i, f in enumerate(FACES)}
SOLVED_FACELETS = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"
CENTRE_INDICES = (4, 13, 22, 31, 40, 49)

# Corner facelets: for each corner position, the three facelet indices in
# clockwise order starting with the U/D sticker reference facelet.
CORNER_FACELETS = [
    (8, 9, 20),    # URF: U9, R1, F3
    (6, 18, 38),   # UFL: U7, F1, L3
    (0, 36, 47),   # ULB: U1, L1, B3
    (2, 45, 11),   # UBR: U3, B1, R3
    (29, 26, 15),  # DFR: D3, F9, R7
    (27, 44, 24),  # DLF: D1, L9, F7
    (33, 53, 42),  # DBL: D7, B9, L7
    (35, 17, 51),  # DRB: D9, R9, B7
]

CORNER_COLORS = [
    ("U", "R", "F"),
    ("U", "F", "L"),
    ("U", "L", "B"),
    ("U", "B", "R"),
    ("D", "F", "R"),
    ("D", "L", "F"),
    ("D", "B", "L"),
    ("D", "R", "B"),
]

EDGE_FACELETS = [
    (5, 10),   # UR
    (7, 19),   # UF
    (3, 37),   # UL
    (1, 46),   # UB
    (32, 16),  # DR
    (28, 25),  # DF
    (30, 43),  # DL
    (34, 52),  # DB
    (23, 12),  # FR
    (21, 41),  # FL
    (50, 39),  # BL
    (48, 14),  # BR
]

EDGE_COLORS = [
    ("U", "R"),
    ("U", "F"),
    ("U", "L"),
    ("U", "B"),
    ("D", "R"),
    ("D", "F"),
    ("D", "L"),
    ("D", "B"),
    ("F", "R"),
    ("F", "L"),
    ("B", "L"),
    ("B", "R"),
]

MOVE_NAMES = [
    "U", "U'", "U2",
    "R", "R'", "R2",
    "F", "F'", "F2",
    "D", "D'", "D2",
    "L", "L'", "L2",
    "B", "B'", "B2",
]


def _face_stickers(face: str) -> List[Tuple[float, float, float]]:
    """Return 9 sticker centres for a face, row-major when viewed from outside.

    Grid values use integers in {-1, 0, +1} so every sticker lies on the
    discrete cubie lattice and face turns map stickers onto stickers.
    """
    coords: List[Tuple[float, float, float]] = []
    for r in range(3):
        for c in range(3):
            # row/col → lattice coords
            if face == "U":
                # U1 at ULB (-1,+1.5,-1); U9 at URF (+1,+1.5,+1)
                coords.append((float(c - 1), 1.5, float(r - 1)))
            elif face == "D":
                # D1 at DLF (-1,-1.5,+1); D9 at DRB (+1,-1.5,-1)
                coords.append((float(c - 1), -1.5, float(1 - r)))
            elif face == "F":
                # F1 at UFL (-1,+1,+1.5); F9 at DFR (+1,-1,+1.5)
                coords.append((float(c - 1), float(1 - r), 1.5))
            elif face == "B":
                # B1 at UBR (+1,+1,-1.5); B9 at DBL (-1,-1,-1.5)
                coords.append((float(1 - c), float(1 - r), -1.5))
            elif face == "R":
                # R1 at URF (+1.5,+1,+1); R9 at DRB (+1.5,-1,-1)
                coords.append((1.5, float(1 - r), float(1 - c)))
            elif face == "L":
                # L1 at ULB (-1.5,+1,-1); L9 at DLF (-1.5,-1,+1)
                coords.append((-1.5, float(1 - r), float(c - 1)))
            else:
                raise ValueError(face)
    return coords


def _all_sticker_coords() -> List[Tuple[float, float, float]]:
    out: List[Tuple[float, float, float]] = []
    for face in FACES:
        out.extend(_face_stickers(face))
    return out


def _rotate_point(
    p: Tuple[float, float, float], axis: str, quarter_turns: int
) -> Tuple[float, float, float]:
    """Rotate a sticker centre by quarter-turns of a face (Singmaster CW).

    Chirality verified against standard corner cycles:
    U: URF→UBR→ULB→UFL; R: URF→DFR→DRB→UBR; F: URF→UFL→DLF→DFR; etc.
    """
    x, y, z = p
    q = quarter_turns % 4
    for _ in range(q):
        if axis == "U":
            x, y, z = -z, y, x
        elif axis == "D":
            x, y, z = z, y, -x
        elif axis == "R":
            x, y, z = x, z, -y
        elif axis == "L":
            x, y, z = x, -z, y
        elif axis == "F":
            x, y, z = y, -x, z
        elif axis == "B":
            x, y, z = -y, x, z
        else:
            raise ValueError(axis)
    return (x, y, z)


def _nearest_index(
    target: Tuple[float, float, float], coords: Sequence[Tuple[float, float, float]]
) -> int:
    best_i = 0
    best_d = float("inf")
    tx, ty, tz = target
    for i, (x, y, z) in enumerate(coords):
        d = (x - tx) ** 2 + (y - ty) ** 2 + (z - tz) ** 2
        if d < best_d:
            best_d = d
            best_i = i
    return best_i


def _on_turning_layer(p: Tuple[float, float, float], face: str) -> bool:
    """True if sticker belongs to a cubie on the named face's layer."""
    x, y, z = p
    if face == "U":
        return y > 0.5
    if face == "D":
        return y < -0.5
    if face == "R":
        return x > 0.5
    if face == "L":
        return x < -0.5
    if face == "F":
        return z > 0.5
    if face == "B":
        return z < -0.5
    raise ValueError(face)


def _build_move_permutation(face: str, quarter_turns: int) -> Tuple[int, ...]:
    coords = _all_sticker_coords()
    # Colour at i goes to dest_of[i]
    dest_of = list(range(54))
    for i, p in enumerate(coords):
        if not _on_turning_layer(p, face):
            continue
        dest = _rotate_point(p, face, quarter_turns)
        j = _nearest_index(dest, coords)
        dist = sum((dest[k] - coords[j][k]) ** 2 for k in range(3))
        if dist > 0.01:
            raise RuntimeError(
                f"Sticker {i} on {face} did not map onto lattice: {p} -> {dest}"
            )
        dest_of[i] = j

    # Convert to source-for-destination: new[d] = old[source[d]]
    source = [0] * 54
    for src, dst in enumerate(dest_of):
        source[dst] = src
    return tuple(source)


def build_all_move_tables() -> dict[str, Tuple[int, ...]]:
    tables: dict[str, Tuple[int, ...]] = {}
    faces = "URFDLB"
    for face in faces:
        tables[face] = _build_move_permutation(face, 1)
        tables[face + "'"] = _build_move_permutation(face, 3)
        tables[face + "2"] = _build_move_permutation(face, 2)
    return tables


# Generated once from 3D coordinates (verifier and manual turns share this table).
MOVE_TABLES = build_all_move_tables()


def apply_move(facelets: str, move: str) -> str:
    if move not in MOVE_TABLES:
        raise ValueError(f"Unknown move: {move}")
    src = MOVE_TABLES[move]
    return "".join(facelets[src[i]] for i in range(54))


def apply_moves(facelets: str, moves: Iterable[str]) -> str:
    state = facelets
    for m in moves:
        state = apply_move(state, m)
    return state


def parse_move_string(s: str) -> List[str]:
    """Parse space-separated HTM tokens into a list."""
    s = s.strip()
    if not s:
        return []
    parts = s.split()
    for p in parts:
        if p not in MOVE_TABLES:
            raise ValueError(f"Invalid move token: {p}")
    return parts


@dataclass(frozen=True)
class CubieCube:
    """Piece-at-position cubie coordinates."""

    cp: Tuple[int, ...]  # length 8
    co: Tuple[int, ...]  # length 8
    ep: Tuple[int, ...]  # length 12
    eo: Tuple[int, ...]  # length 12

    @staticmethod
    def identity() -> "CubieCube":
        return CubieCube(
            cp=tuple(range(8)),
            co=(0,) * 8,
            ep=tuple(range(12)),
            eo=(0,) * 12,
        )

    def is_solved(self) -> bool:
        return self == CubieCube.identity()


def facelets_to_cubie(facelets: str) -> CubieCube:
    if len(facelets) != 54:
        raise ValueError("facelets must be length 54")
    cp = [-1] * 8
    co = [0] * 8
    for pos in range(8):
        ori = 0
        for ori in range(3):
            col = facelets[CORNER_FACELETS[pos][ori]]
            if col in ("U", "D"):
                break
        else:
            raise ValueError(f"Corner {pos} missing U/D colour")
        c1 = facelets[CORNER_FACELETS[pos][(ori + 1) % 3]]
        c2 = facelets[CORNER_FACELETS[pos][(ori + 2) % 3]]
        piece = None
        for j, cols in enumerate(CORNER_COLORS):
            if cols[1] == c1 and cols[2] == c2:
                piece = j
                break
        if piece is None:
            raise ValueError(f"Unrecognised corner colours at position {pos}")
        cp[pos] = piece
        co[pos] = ori % 3

    ep = [-1] * 12
    eo = [0] * 12
    for pos in range(12):
        f0 = facelets[EDGE_FACELETS[pos][0]]
        f1 = facelets[EDGE_FACELETS[pos][1]]
        piece = None
        orient = 0
        for j, cols in enumerate(EDGE_COLORS):
            if f0 == cols[0] and f1 == cols[1]:
                piece = j
                orient = 0
                break
            if f0 == cols[1] and f1 == cols[0]:
                piece = j
                orient = 1
                break
        if piece is None:
            raise ValueError(f"Unrecognised edge colours at position {pos}")
        ep[pos] = piece
        eo[pos] = orient

    return CubieCube(cp=tuple(cp), co=tuple(co), ep=tuple(ep), eo=tuple(eo))


def cubie_to_facelets(cube: CubieCube) -> str:
    f = [" "] * 54
    for face_i, face in enumerate(FACES):
        f[CENTRE_INDICES[face_i]] = face
    for pos in range(8):
        piece = cube.cp[pos]
        ori = cube.co[pos]
        for n in range(3):
            facelet = CORNER_FACELETS[pos][(n + ori) % 3]
            f[facelet] = CORNER_COLORS[piece][n]
    for pos in range(12):
        piece = cube.ep[pos]
        ori = cube.eo[pos]
        for n in range(2):
            facelet = EDGE_FACELETS[pos][(n + ori) % 2]
            f[facelet] = EDGE_COLORS[piece][n]
    return "".join(f)


def scramble(facelets: str, moves: Sequence[str]) -> str:
    return apply_moves(facelets, moves)


def random_legal_moves(seed: int, length: int) -> List[str]:
    """Generate a length-N random move sequence with no consecutive same-face moves."""
    import random

    rng = random.Random(seed)
    faces = list("URFDLB")
    suffixes = ["", "'", "2"]
    out: List[str] = []
    last_face = None
    for _ in range(length):
        choices = [f for f in faces if f != last_face]
        face = rng.choice(choices)
        out.append(face + rng.choice(suffixes))
        last_face = face
    return out
