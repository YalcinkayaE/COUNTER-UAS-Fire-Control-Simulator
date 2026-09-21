# 3D Rotating Cube View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3D cube viewport that mirrors the canonical 54-facelet state, supports drag-to-orbit, and animates HTM face turns during Solve playback so the left-side visual actually changes when moves run.

**Architecture:** Keep the editable six-face net as the input surface. Add a separate 3D stage driven by the same `state.facelets` string. Playback (`stepPlayback` / Play) calls a small animation API: animate the named face 90°/180°, then commit the facelet string via existing `applyMoveLocal`. Net and 3D never diverge: both read from one state; 3D never invents stickers.

**Tech Stack:** Vanilla JS + CSS 3D transforms (no new npm dependency in `rubiks_cube/`). Optional later swap to Three.js behind the same `Cube3D` interface.

## Global Constraints

- Encoding stays URFDLB, 54 facelets, centres fixed — same as blueprint §3
- HTM move tokens only: U/U'/U2 … B/B'/B2
- Net + 54-char field remain authoritative for edits; 3D is view + playback animation
- Independent verifier / solver backend unchanged
- Prefer zero new runtime deps for the prototype package
- Motion: intentional turn animation + idle orbit cue; avoid decorative glow / purple defaults
- Mobile: viewport usable; drag orbit with pointer events; respect `prefers-reduced-motion` (instant snap turns)

---

## Approaches considered

| Approach | Pros | Cons |
|---|---|---|
| **A. CSS 3D cubies (recommended)** | No deps; fits current static `web/`; enough for orbit + face-turn animation | Layer turn math is manual; no fancy lighting |
| **B. Three.js cubies** | Best depth/lighting; repo already uses Three elsewhere | New dependency in this package; heavier for a small prototype |
| **C. Canvas isometric redraw** | Simple draw loop | Weak “rotating cube” feel; face-turn animation awkward |

**Recommendation: Approach A** — CSS 3D with 26 visible cubielets (no internal core), grouped per face for turns. Same public API whether we later swap to Three.js.

---

## File map

| File | Responsibility |
|---|---|
| `rubiks_cube/web/cube3d.js` | Cubie DOM/CSS scene, orbit, `setFacelets`, `animateMove(move) → Promise` |
| `rubiks_cube/web/cube3d.css` | Perspective stage, cubie faces, colour tokens aligned with `styles.css` |
| `rubiks_cube/web/index.html` | Add `#cube-stage` beside or above the net |
| `rubiks_cube/web/app.js` | Wire Reset/edit/playback through Cube3D; await turn animations on Step/Play |
| `rubiks_cube/web/styles.css` | Workspace layout for net + 3D |
| `rubiks_cube/tests/test_moves.py` | Unchanged (server). Manual browser check for UI |
| `rubiks_cube/README.md` | Note 3D playback viewport |

---

### Task 1: Cube3D module — static paint from facelets

**Files:**
- Create: `rubiks_cube/web/cube3d.js`
- Create: `rubiks_cube/web/cube3d.css`
- Modify: `rubiks_cube/web/index.html` (stage container + script tag)
- Modify: `rubiks_cube/web/styles.css` (workspace grid)

**Interfaces:**
- Produces:
  - `createCube3D(rootEl) → { setFacelets(facelets: string), animateMove(move: string): Promise<void>, setOrbitEnabled(bool), destroy() }`
- Consumes: existing colour CSS variables (`--U` … `--B`); facelet string convention from `app.js`

- [ ] **Step 1: Add stage markup**

In `index.html`, inside `.workspace` before the net (or as a left column stack):

```html
<div class="cube-panel">
  <h2>3D cube</h2>
  <p class="hint">Drag to orbit. Turns animate during Step / Play.</p>
  <div id="cube-stage" class="cube-stage" aria-label="3D cube viewport"></div>
</div>
```

Link `/static/cube3d.css` and `/static/cube3d.js` (module or IIFE exporting `window.createCube3D`).

- [ ] **Step 2: Build 3×3×3 cubielets**

In `cube3d.js`, create 27 positions on a lattice `x,y,z ∈ {-1,0,1}` excluding the invisible centre `(0,0,0)` if desired (26 cubies). Each cubie is a CSS 3D box with up to 6 facelets; only outward faces get colour stickers.

Map outward stickers to facelet indices using the same lattice as `rubik/model.py` (`_face_stickers`), so URFDLB indexing matches the net.

- [ ] **Step 3: `setFacelets(facelets)` paints stickers**

```javascript
function setFacelets(facelets) {
  // for each sticker element: dataset.faceletIndex → background from facelets[i]
}
```

Verify manually: Reset paints solved colours; editing one net sticker updates 3D after `app.js` calls `cube.setFacelets`.

- [ ] **Step 4: Pointer orbit**

Track pointer drag on `#cube-stage`; apply `rotateX` / `rotateY` on a scene wrapper (whole cube), not on facelet colours. Clamp pitch so the cube does not flip awkwardly (±80°).

- [ ] **Step 5: Commit**

```bash
git add rubiks_cube/web/cube3d.js rubiks_cube/web/cube3d.css rubiks_cube/web/index.html rubiks_cube/web/styles.css
git commit -m "Add CSS 3D cube stage painted from facelets"
```

---

### Task 2: Animated HTM face turns

**Files:**
- Modify: `rubiks_cube/web/cube3d.js`
- Modify: `rubiks_cube/web/cube3d.css` (transition / turning class)

**Interfaces:**
- Consumes: move token string; cubie lattice membership (`x===1` for R, etc.)
- Produces: `animateMove(move): Promise<void>` that resolves after CSS transition ends, then caller commits facelets

- [ ] **Step 1: Layer grouping**

For move face `F`/`B`/`R`/`L`/`U`/`D`, select cubies on that layer into a temporary `.turn-layer` wrapper with `transform-style: preserve-3d`.

- [ ] **Step 2: Animate quarter / half turns**

| Suffix | Angle |
|---|---|
| (none) | +90° about face axis |
| `'` | −90° |
| `2` | +180° |

Use the same axis chirality as `rubik/model.py` / Kociemba (already verified). Duration ~280–400ms; `prefers-reduced-motion: reduce` → 0ms.

- [ ] **Step 3: Resolve promise on `transitionend`**

```javascript
async function animateMove(move) {
  // group layer → set transform → await transitionend → unwrap grouping
  // do NOT mutate facelet string here; app.js commits after await
}
```

- [ ] **Step 4: Manual browser check**

Reset → click manual `R` in UI (after Task 3 wiring) or call `animateMove('R')` from console then `setFacelets(applyMoveLocal(...))`. Confirm layer turns the correct way vs the net.

- [ ] **Step 5: Commit**

```bash
git commit -m "Animate HTM face turns on the 3D cube"
```

---

### Task 3: Wire app.js playback and edits

**Files:**
- Modify: `rubiks_cube/web/app.js`
- Modify: `rubiks_cube/README.md`

**Interfaces:**
- Consumes: `createCube3D`, existing `applyMoveLocal`, `state.facelets`, playback object
- Produces: net + 3D + field stay synchronized; Step/Play animate then commit

- [ ] **Step 1: Init cube on load**

```javascript
const cube = createCube3D(document.getElementById("cube-stage"));
```

Call `cube.setFacelets(state.facelets)` wherever `renderNet()` runs (or inside `setFacelets`).

- [ ] **Step 2: Change `stepPlayback` to animate**

```javascript
async function stepPlayback() {
  const pb = state.playback;
  if (!pb || pb.revision !== state.revision) return;
  if (pb.index >= pb.moves.length) { setStatus("Solved"); return; }
  const move = pb.moves[pb.index];
  el.btnStep.disabled = true;
  await cube.animateMove(move);
  const next = applyMoveLocal(state.facelets, move);
  state.facelets = next;
  pb.index += 1;
  renderNet();
  cube.setFacelets(next); // snap stickers to committed state after animation
  syncField();
  el.playPos.textContent = `${pb.index} / ${pb.moves.length}`;
  el.btnStep.disabled = false;
  if (pb.index >= pb.moves.length) setStatus("Solved");
}
```

- [ ] **Step 3: Play interval respects in-flight animation**

Replace fixed `setInterval` with an async loop:

```javascript
async function playLoop() {
  while (state.playback && state.playTimer /* flag */) {
    if (state.playback.index >= state.playback.moves.length) break;
    await stepPlayback();
    await delay(80);
  }
}
```

Cancel on Reset / edit via `revision` check inside `stepPlayback`.

- [ ] **Step 4: Manual turns**

On turn-button click: `await cube.animateMove(m)` then `setFacelets(applyMoveLocal(...))`.

- [ ] **Step 5: Acceptance checks (browser)**

1. Reset → 3D shows solved; orbit works  
2. Manual `R U R' U'` → 3D turns match net  
3. Solve → Play → each move animates; ends solved on both net and 3D  
4. Reset mid-play → animation stops; cube returns to solved  
5. Edit sticker on net → 3D sticker updates; no leftover turn wrapper  

- [ ] **Step 6: Commit + push + update PR**

```bash
git add rubiks_cube/web rubiks_cube/README.md
git commit -m "Sync 3D cube orbit and turn animation with Solve playback"
git push -u origin cursor/rubiks-cube-prototype-e8ec
```

---

## Out of scope (this plan)

- Photo capture / colour from camera
- Changing solver, verifier, or API
- Replacing the net (it stays for editing)
- Guaranteeing cinematic quality of mid-algorithm camera paths

## Success criteria

- After Solve, Step/Play visibly turns the 3D cube; final state is solved on net + 3D + field  
- Drag orbit does not alter facelets  
- No new Python deps; existing `pytest` suite still passes unchanged  
