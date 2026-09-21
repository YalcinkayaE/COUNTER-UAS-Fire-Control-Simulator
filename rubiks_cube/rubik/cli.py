"""CLI for facelet / JSON solve requests."""

from __future__ import annotations

import argparse
import json
import sys

from .model import SOLVED_FACELETS, apply_moves, random_legal_moves
from .solver import solve_request


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Rubik's Cube prototype solver CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_solve = sub.add_parser("solve", help="Solve a 54-facelet string")
    p_solve.add_argument("facelets", nargs="?", default=SOLVED_FACELETS)
    p_solve.add_argument("--mode", choices=("fast", "optimal"), default="fast")
    p_solve.add_argument("--timeout-ms", type=int, default=5000)
    p_solve.add_argument("--json", action="store_true")

    p_scramble = sub.add_parser("scramble", help="Print a scrambled facelet string")
    p_scramble.add_argument("--seed", type=int, default=1)
    p_scramble.add_argument("--length", type=int, default=25)

    p_serve = sub.add_parser("serve", help="Run the HTTP API + UI")
    p_serve.add_argument("--host", default="127.0.0.1")
    p_serve.add_argument("--port", type=int, default=8765)

    args = parser.parse_args(argv)

    if args.cmd == "scramble":
        moves = random_legal_moves(args.seed, args.length)
        state = apply_moves(SOLVED_FACELETS, moves)
        print(state)
        print(" ".join(moves), file=sys.stderr)
        return 0

    if args.cmd == "serve":
        import uvicorn

        uvicorn.run("rubik.api:app", host=args.host, port=args.port, reload=False)
        return 0

    result = solve_request(args.facelets, mode=args.mode, timeout_ms=args.timeout_ms)
    if args.json:
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print(result.status, result.move_count, result.optimality, result.verified)
        if result.moves is not None:
            print(" ".join(result.moves))
        for err in result.errors:
            print(err, file=sys.stderr)
    return 0 if result.status in ("SOLVED",) else 1


if __name__ == "__main__":
    raise SystemExit(main())
