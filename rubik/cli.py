"""CLI for facelet / JSON solve requests."""

from __future__ import annotations

import argparse
import json
import socket
import sys

from .model import SOLVED_FACELETS, apply_moves, random_legal_moves
from .solver import solve_request


def _port_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def _pick_port(host: str, preferred: int, span: int = 20) -> int:
    for port in range(preferred, preferred + span):
        if _port_free(host, port):
            return port
    raise OSError(f"No free port in {preferred}–{preferred + span - 1} on {host}")


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
    p_serve.add_argument(
        "--host",
        default="0.0.0.0",
        help="Bind address (default 0.0.0.0 so Cursor port forwarding can reach it)",
    )
    p_serve.add_argument("--port", type=int, default=8765)
    p_serve.add_argument(
        "--strict-port",
        action="store_true",
        help="Fail if --port is busy instead of trying the next free port",
    )

    args = parser.parse_args(argv)

    if args.cmd == "scramble":
        moves = random_legal_moves(args.seed, args.length)
        state = apply_moves(SOLVED_FACELETS, moves)
        print(state)
        print(" ".join(moves), file=sys.stderr)
        return 0

    if args.cmd == "serve":
        import uvicorn

        port = args.port
        if not _port_free(args.host, port):
            if args.strict_port:
                print(
                    f"ERROR: {args.host}:{port} is already in use. "
                    f"Stop the other process or pass --port <free-port>.",
                    file=sys.stderr,
                )
                return 3
            try:
                port = _pick_port(args.host, args.port + 1)
            except OSError as exc:
                print(f"ERROR: {exc}", file=sys.stderr)
                return 3
            print(
                f"NOTE: {args.host}:{args.port} is in use; serving on {args.host}:{port}",
                file=sys.stderr,
            )

        print(f"Rubik prototype UI: http://127.0.0.1:{port}/", file=sys.stderr)
        if args.host in ("0.0.0.0", "::"):
            print(
                "Listening on all interfaces — if the tab is blank, open this port "
                "from the Cursor Ports panel (forward 8765) or refresh after serve starts.",
                file=sys.stderr,
            )
        uvicorn.run("rubik.api:app", host=args.host, port=port, reload=False)
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
