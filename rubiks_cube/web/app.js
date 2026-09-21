(() => {
  const SOLVED =
    "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
  const FACES = ["U", "R", "F", "D", "L", "B"];
  const FACE_OFFSET = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };
  const CENTRES = new Set([4, 13, 22, 31, 40, 49]);
  const MOVES = [
    "U", "U'", "U2", "R", "R'", "R2", "F", "F'", "F2",
    "D", "D'", "D2", "L", "L'", "L2", "B", "B'", "B2",
  ];

  // Independent client-side move tables (generated to match server HTM).
  // Loaded lazily from /solve verification path; for playback we apply via
  // a compact embedded permutation table built once from a known scramble
  // identity check against the server's conventions by shipping permutations.
  let MOVE_TABLES = null;

  const state = {
    facelets: SOLVED,
    revision: 1,
    requestId: 0,
    selectedIndex: null,
    paintColor: "U",
    solving: false,
    playback: null,
    playTimer: null,
  };

  const el = {
    net: document.getElementById("net"),
    facelets: document.getElementById("facelets"),
    status: document.getElementById("status"),
    result: document.getElementById("result"),
    btnReset: document.getElementById("btn-reset"),
    btnSolve: document.getElementById("btn-solve"),
    btnCopy: document.getElementById("btn-copy"),
    mode: document.getElementById("mode"),
    playback: document.getElementById("playback"),
    btnStep: document.getElementById("btn-step"),
    btnPlay: document.getElementById("btn-play"),
    playPos: document.getElementById("play-pos"),
    turnButtons: document.getElementById("turn-buttons"),
  };

  function setStatus(msg) {
    el.status.textContent = msg;
  }

  function cancelPlayback() {
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
    }
    state.playback = null;
    el.playback.hidden = true;
  }

  function bumpRevision(reason) {
    state.revision += 1;
    state.requestId += 1;
    cancelPlayback();
    state.solving = false;
    el.btnSolve.disabled = false;
    el.btnSolve.textContent = "Solve";
    if (reason) setStatus(reason);
  }

  function renderNet() {
    el.net.innerHTML = "";
    for (const face of ["U", "L", "F", "R", "B", "D"]) {
      const faceEl = document.createElement("div");
      faceEl.className = "face";
      faceEl.dataset.face = face;
      const label = document.createElement("div");
      label.className = "face-label";
      label.innerHTML = `<span class="arrow">↑</span>${face} top`;
      faceEl.appendChild(label);
      const offset = FACE_OFFSET[face];
      for (let i = 0; i < 9; i++) {
        const idx = offset + i;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sticker" + (CENTRES.has(idx) ? " centre" : "");
        btn.dataset.index = String(idx);
        btn.dataset.color = state.facelets[idx];
        btn.textContent = state.facelets[idx];
        if (state.selectedIndex === idx) btn.classList.add("selected");
        if (!CENTRES.has(idx)) {
          btn.addEventListener("click", () => {
            state.selectedIndex = idx;
            applyPaint(idx, state.paintColor);
          });
        }
        faceEl.appendChild(btn);
      }
      el.net.appendChild(faceEl);
    }
  }

  function syncField() {
    el.facelets.value = state.facelets;
  }

  function setFacelets(next, opts = {}) {
    if (next.length !== 54) return;
    // Centres must stay URFDLB
    const chars = next.split("");
    FACES.forEach((f, i) => {
      chars[[4, 13, 22, 31, 40, 49][i]] = f;
    });
    state.facelets = chars.join("");
    if (!opts.silent) {
      bumpRevision(opts.status || "State edited · solution invalidated");
    }
    renderNet();
    syncField();
  }

  function applyPaint(index, color) {
    if (CENTRES.has(index)) return;
    const chars = state.facelets.split("");
    chars[index] = color;
    setFacelets(chars.join(""));
  }

  async function ensureMoveTables() {
    if (MOVE_TABLES) return MOVE_TABLES;
    const res = await fetch("/static/moves.json");
    MOVE_TABLES = await res.json();
    return MOVE_TABLES;
  }

  function applyMoveLocal(facelets, move) {
    const src = MOVE_TABLES[move];
    let out = "";
    for (let i = 0; i < 54; i++) out += facelets[src[i]];
    return out;
  }

  function resetCube() {
    bumpRevision();
    state.facelets = SOLVED;
    state.selectedIndex = null;
    renderNet();
    syncField();
    el.result.className = "result";
    el.result.innerHTML = "<p class='muted'>Cube restored to the canonical solved state.</p>";
    setStatus("Cube reset · 54/54 stickers defined");
  }

  async function solve() {
    if (state.solving) return;
    const snapshot = state.facelets;
    const revision = state.revision;
    const requestId = ++state.requestId;
    state.solving = true;
    el.btnSolve.disabled = true;
    el.btnSolve.textContent = "Solving…";
    setStatus("Solving…");
    el.result.className = "result";
    el.result.textContent = "Working…";

    try {
      const res = await fetch("/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facelets: snapshot,
          metric: "HTM",
          mode: el.mode.value,
          timeout_ms: 5000,
        }),
      });
      const data = await res.json();
      if (requestId !== state.requestId || revision !== state.revision) {
        return; // stale
      }
      if (data.status === "SOLVED" && data.verified) {
        const moves = data.moves || [];
        const note =
          data.move_count === 0
            ? "Already solved · 0 moves"
            : data.optimality === "NOT_PROVEN" && el.mode.value === "optimal"
              ? `Solved · ${data.move_count} moves (shortest not proven)`
              : `Solved · ${data.move_count} moves`;
        el.result.className = "result ok";
        el.result.textContent =
          `${note}\n${moves.join(" ") || "(empty)"}\n` +
          `verified=${data.verified} optimality=${data.optimality}\n` +
          `elapsed_ms=${data.elapsed_ms?.toFixed?.(1) ?? data.elapsed_ms}`;
        setStatus(note);
        await ensureMoveTables();
        state.playback = {
          snapshot,
          moves,
          index: 0,
          revision,
        };
        el.playback.hidden = false;
        el.playPos.textContent = `0 / ${moves.length}`;
        // Animate from snapshot
        setFacelets(snapshot, { silent: true });
        if (moves.length === 0) {
          setStatus("Already solved · 0 moves");
        }
      } else {
        el.result.className = "result err";
        const errs = (data.errors || [])
          .map((e) => `${e.code}: ${e.message}`)
          .join("\n");
        el.result.textContent = `${data.status}\n${errs || "No solution"}`;
        setStatus(data.status);
        highlightErrors(data.errors || []);
      }
    } catch (err) {
      if (requestId !== state.requestId) return;
      el.result.className = "result err";
      el.result.textContent = String(err);
      setStatus("Request failed");
    } finally {
      if (requestId === state.requestId) {
        state.solving = false;
        el.btnSolve.disabled = false;
        el.btnSolve.textContent = "Solve";
      }
    }
  }

  function highlightErrors(errors) {
    const bad = new Set();
    for (const e of errors) {
      for (const loc of e.locations || []) bad.add(loc);
    }
    for (const node of el.net.querySelectorAll(".sticker")) {
      node.classList.toggle("error", bad.has(Number(node.dataset.index)));
    }
  }

  function stepPlayback() {
    const pb = state.playback;
    if (!pb || pb.revision !== state.revision) return;
    if (pb.index >= pb.moves.length) {
      setStatus("Solved");
      return;
    }
    const move = pb.moves[pb.index];
    const next = applyMoveLocal(state.facelets, move);
    state.facelets = next;
    pb.index += 1;
    renderNet();
    syncField();
    el.playPos.textContent = `${pb.index} / ${pb.moves.length}`;
    if (pb.index >= pb.moves.length) setStatus("Solved");
  }

  function playPlayback() {
    if (!state.playback) return;
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
      el.btnPlay.textContent = "Play";
      return;
    }
    el.btnPlay.textContent = "Pause";
    state.playTimer = setInterval(() => {
      if (!state.playback || state.playback.index >= state.playback.moves.length) {
        clearInterval(state.playTimer);
        state.playTimer = null;
        el.btnPlay.textContent = "Play";
        setStatus("Solved");
        return;
      }
      stepPlayback();
    }, 350);
  }

  // Palette
  document.querySelectorAll(".swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.paintColor = btn.dataset.color;
      document.querySelectorAll(".swatch").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
  document.querySelector('.swatch[data-color="U"]').classList.add("active");

  // Manual turns
  MOVES.forEach((m) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = m;
    b.addEventListener("click", async () => {
      await ensureMoveTables();
      const next = applyMoveLocal(state.facelets, m);
      setFacelets(next, { status: `Applied ${m} · solution invalidated` });
    });
    el.turnButtons.appendChild(b);
  });

  el.btnReset.addEventListener("click", resetCube);
  el.btnSolve.addEventListener("click", solve);
  el.btnCopy.addEventListener("click", async () => {
    await navigator.clipboard.writeText(state.facelets);
    setStatus("State copied");
  });
  el.btnStep.addEventListener("click", stepPlayback);
  el.btnPlay.addEventListener("click", playPlayback);

  el.facelets.addEventListener("change", () => {
    const raw = el.facelets.value.replace(/\s+/g, "").toUpperCase();
    if (raw.length === 54 && /^[URFDLB]+$/.test(raw)) {
      setFacelets(raw);
    } else {
      setStatus(`State field rejected · need 54 URFDLB (got ${raw.length})`);
      syncField();
    }
  });

  // Init
  resetCube();
  ensureMoveTables().catch(() => {});
})();
