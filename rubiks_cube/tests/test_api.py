"""HTTP API smoke tests."""

from fastapi.testclient import TestClient

from rubik.api import app
from rubik.model import SOLVED_FACELETS, apply_moves, random_legal_moves


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_solve_endpoint():
    state = apply_moves(SOLVED_FACELETS, random_legal_moves(7, 15))
    r = client.post(
        "/solve",
        json={"facelets": state, "metric": "HTM", "mode": "fast", "timeout_ms": 5000},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "SOLVED"
    assert data["verified"] is True
    assert isinstance(data["moves"], list)


def test_index_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "Reset Cube" in r.text
    assert "Solve" in r.text
