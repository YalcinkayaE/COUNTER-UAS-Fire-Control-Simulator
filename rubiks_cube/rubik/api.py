"""FastAPI service: POST /solve and static UI."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .solver import solve_request

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

app = FastAPI(title="Rubik's Cube Prototype Solver", version="0.1.0")


class SolveBody(BaseModel):
    facelets: str = Field(..., description="54 URFDLB symbols")
    metric: str = "HTM"
    mode: str = "fast"
    timeout_ms: int = 5000


@app.post("/solve")
def post_solve(body: SolveBody) -> Dict[str, Any]:
    result = solve_request(
        facelets=body.facelets,
        metric=body.metric,
        mode=body.mode,
        timeout_ms=body.timeout_ms,
    )
    return result.to_dict()


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


if WEB_DIR.is_dir():
    app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")


def main() -> None:
    import uvicorn

    uvicorn.run("rubik.api:app", host="127.0.0.1", port=8765, reload=False)


if __name__ == "__main__":
    main()
