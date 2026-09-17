---
repo_name: sem_defender
repo_root: /Users/erkanyalcinkaya/projects/sem_defender
repo_type: prototype
status_date: 2026-09-16
branch: main
default_branch: main
preferred_runtime: npm run dev
preferred_entrypoints:
  - src/main.tsx
  - src/components/sims/GameApp.tsx
  - src/sims/simulation.ts
authoritative_docs:
  - REPO_CONTRACT.md
  - AGENTS.md
  - SEM-Tech DEFENDER Demo Blueprint.md
  - README.md
authoritative_codepaths:
  - src/sims/
  - src/components/sims/
  - src/main.tsx
verification_commands:
  - name: unit
    command: npm test
    expected_result: 9 passed
  - name: build
    command: npm run build
    expected_result: exit 0
  - name: dev
    command: npm run dev
    expected_result: Vite serves http://127.0.0.1:5173 with title SEM-Tech DEFENDER
status_summary:
  overall_state: active
  current_focus: Desktop COUNTER-UAS FIRE CONTROL simulator (EDF fire-control)
  next_gate: Optional split-raid / threat-class follow-ons from the blueprint, only if asked
dependencies:
  internal: []
  external:
    - Node.js and npm
    - Vite + React 19 + Three.js / React Three Fiber
owners:
  primary: unresolved
  secondary: none
update_policy:
  assistants_may_update:
    - verification snapshot
    - git metadata
    - open items
    - read-first order
  assistants_must_not_change_without_explicit_instruction:
    - repo identity
    - authoritative sources
    - preferred runtime
    - vocabulary rules
---

# Repo Contract

## 1. Repo Identity

### Purpose
Desktop COUNTER-UAS FIRE CONTROL simulator (SEM-Tech DEFENDER). An operator console ranks simulated tracks by Earliest Deadline First, slews a turret onto a quadratic intercept, and lets the weapons-release authority take AUTO or MANUAL.

### Scope
In scope: the desktop operator console, the TypeScript simulation (`DroneTarget`, `SwarmManager`, `TurretController`), the Three.js battlespace, and the tactical HUD. Current runtime is a desktop browser window (`npm run dev`). Out of scope: real radar DSP, RF / Remote ID / EO classification, soft-kill effectors, a Unity build, and a packaged native desktop app unless explicitly requested.

### One-line summary
`Desktop COUNTER-UAS FIRE CONTROL simulator: EDF TTB, 75°/s slew, quadratic lead, AUTO/MANUAL.`

### Pipeline shorthand
`Track file (oracle) -> 10 Hz EDF sort -> quadratic intercept -> slew/fire -> hit/miss/breach`

## 2. What This Repo Contains

### Executable core
- `src/main.tsx`: SPA mount.
- `src/components/sims/GameApp.tsx`: canvas, HUD, overlays, input.
- `src/sims/simulation.ts`: fixed-step loop, magazine, lives, waves.

### Core subsystems
- `src/sims/math.ts`: TTB and quadratic intercept.
- `src/sims/droneTarget.ts` / `src/sims/swarmManager.ts`: 20 tracks, 10 Hz EDF list.
- `src/sims/turretController.ts`: AUTO/MANUAL slew and fire gate.
- `src/components/sims/Scene.tsx`: battlespace, turret, drones, tracers.
- `src/components/sims/TacticalHUD.tsx` / `Radar.tsx`: EDF table and PPI scope.

### Supporting assets
- `SEM-Tech DEFENDER Demo Blueprint.md`: 6-minute seated walkthrough.
- `src/styles.css`: Tailwind v4 tokens.
- `src/sims/math.test.ts` / `src/sims/swarmManager.test.ts`: kinematics characterisation.

## 3. Current Status Boundary

Treat the following as the current truth:

- This product is a desktop COUNTER-UAS FIRE CONTROL simulator, not a tower-defense game and not a fielded sensor.
- The checkout is a Vite SPA in a desktop browser window. TanStack Start / Grok host adapters (`AuthProvider`, `PreviewHostBridge`, `/__grok/*`) are not part of the runtime.
- `npm run dev` serves the simulator at `http://127.0.0.1:5173`.
- Observed on 2026-09-16: briefing card with title SEM-Tech DEFENDER; Engage starts wave 1 with 20 tracks; EDF queue and PPI scope render; AUTO fires; M toggles MANUAL; Esc pauses.
- Unit tests for TTB, intercept, spawn count, EDF sort, and breach collection passed on 2026-09-16 (`9 passed`).
- `npm run build` exited 0 on 2026-09-16.

### Current phase or milestone
- current phase: local runnable simulator
- current milestone: Decide/Engage slice matching the blueprint
- completed through: desktop play of wave 1 fire-control
- still open: follow-on beats listed in blueprint section 10

### What is complete
- EDF TTB ranking at 10 Hz
- Quadratic intercept and 75°/s slew
- AUTO / MANUAL on the same solution
- Briefing, pause, defeat overlays

### What is not complete
- Split-raid waves, threat classes, soft-kill, track quality (blueprint “next demo”, only if asked)
- Fielded sensor or Unity runtime

## 4. Authoritative Sources

Use these in order of precedence when determining live status:

1. `REPO_CONTRACT.md`
2. Runtime under `src/sims/` and `src/components/sims/`
3. `SEM-Tech DEFENDER Demo Blueprint.md` for walkthrough claims and numbers
4. `README.md`

### Authority rules
- Do not infer live status from archival or superseded documents when the sources above disagree.
- Prefer declared control documents over narrative documents.
- Prefer runtime code and verification artifacts over planning text for implementation truth.
- Prefer explicit dated milestone evidence over undated summaries.

## 5. Preferred Runtime and Entry Points

### Preferred runtime path
- `npm run dev`: Vite on `127.0.0.1:5173`. This is the desktop operator console.

### Compatibility or legacy paths
- `npm run preview`: production `dist/` after `npm run build`.
- TanStack Start `src/routes/__root.tsx` is a leftover pointer only; the SPA does not use SSR.

### Main commands
- `npm install`
- `npm run dev`
- `npm test`
- `npm run build`

## 6. Verification and Test Surface

Verified locally on 2026-09-16:

- unit
  - command: `npm test`
  - result: 9 passed (2 files)
- build
  - command: `npm run build`
  - result: exit 0
- browser
  - command: Vite at `http://127.0.0.1:5173`
  - result: title `SEM-Tech DEFENDER`; Engage -> WAVE 01 · 20 TRACKS; EDF QUEUE; PPI SCOPE; AUTO LOCKED/SLEW; M -> MANUAL; Esc -> Paused. 0 console errors.

### Acceptance signals
- Title is SEM-Tech DEFENDER
- Outer 1 km ring and inner 500 m ring visible
- After Engage, 20 tracks appear and EDF table sorts by TTB
- AUTO slews and can fire; MANUAL is available on M

### Failure signals
- Missing `#app` or failed module import at startup
- Blank canvas with console WebGL/React errors
- Engage does not change phase out of briefing

## 7. Open Items

The main open items are:

- Blueprint section 10 follow-ons are not implemented
- Headless `window.__cuas` probe was not observed in the browser-automation harness even while play worked; treat HUD/canvas as the live check, not that probe

### Next recommended actions
- Run `npm run dev` and walk the blueprint beat sheet
- Add follow-on waves only if requested

## 8. Read-First Order

For the fastest orientation path, read these in order:

1. `REPO_CONTRACT.md`
2. `SEM-Tech DEFENDER Demo Blueprint.md`
3. `src/sims/constants.ts`
4. `src/sims/math.ts`
5. `src/sims/simulation.ts`
6. `src/components/sims/GameApp.tsx`

## 9. Workstream Map

Then choose your path:

- Runtime work: `src/sims/`, `src/components/sims/Scene.tsx`
- Verification work: `src/sims/*.test.ts`, `npm test`, `npm run build`
- Demo or stakeholder walkthrough work: `SEM-Tech DEFENDER Demo Blueprint.md`, `npm run dev`
- Documentation maintenance work: `REPO_CONTRACT.md`, `README.md`

## 10. Source Classes

Treat repo materials using these classes:

### A. Live authoritative
- `REPO_CONTRACT.md`
- `AGENTS.md`

### B. Implementation truth
- `src/sims/`
- `src/components/sims/`
- `src/main.tsx`

### C. Verification evidence
- `src/sims/math.test.ts`
- `src/sims/swarmManager.test.ts`

### D. Archival or narrative
- `SEM-Tech DEFENDER Demo Blueprint.md` (authoritative for demo numbers and talk track, not for “what is live”)

## 11. Cautions

- Call it a desktop COUNTER-UAS FIRE CONTROL simulator. Do not call it a tower-defense game. The operator is the weapons-release authority.
- Do not claim real radar DSP, CFAR, micro-Doppler, or a fielded C-UAS.
- Simulated tracks only.
- Desktop means seated operator console (keyboard, pointer, large screen). It does not mean a packaged Electron/Tauri app unless that is explicitly requested.

### Common assistant mistakes to avoid
- Do not collapse Detect/Track/Identify (oracles) with Decide/Engage (implemented).
- Do not promote drafts or narrative collateral to status authority.
- Do not infer completion from code presence alone.
- Do not rewrite repo vocabulary into new terminology.

## 12. Vocabulary Rules

Use these terms exactly as defined in this repo:

- `Time-to-Breach` / `TTB`: `(Distance − 500 m) / Radial Velocity`
- `Earliest Deadline First` / `EDF`: sort live tracks by lowest TTB
- `AUTO` / `MANUAL`: fire-control modes on the same intercept solution
- `kill zone`: 500 m inner ring; a breach is a defended-volume violation, not an HP bar
- `weapons-release authority`: the operator role
- `COUNTER-UAS FIRE CONTROL`: product class; this repo is a desktop simulator of that class
- `simulator`: simulated tracks and fire-control loop; not a fielded weapon system
- `desktop`: seated operator console (keyboard, pointer, large display)

Avoid these collisions or substitutions:

- Do not rename TTB to “ETA” or “time-to-impact”
- Do not call this a tower-defense game, a web toy, or a fielded C-UAS
- Nearest-track is not EDF
- `C-UAS` is the abbreviation of COUNTER-UAS; do not substitute “drone game”

## 13. Dependency and Environment Notes

### Internal dependencies
- none

### External dependencies
- Node/npm for install and Vite
- React 19.2 (pinned; `@react-three/fiber` rejects 19.3)
- Three.js, `@react-three/fiber`, `@react-three/drei`

### Environment assumptions
- Browser with WebGL
- `npm run dev` binds `127.0.0.1:5173`

## 14. Integrator or Consumer Surface

If this repo exposes an external contract, treat the following as the main handoff surface:

- `npm run dev` at `http://127.0.0.1:5173`
- `SEM-Tech DEFENDER Demo Blueprint.md` beat sheet
- Optional `window.__cuas` / `window.__controlsTest` probes in `src/sims/simulation.ts` (not relied on for live status)

### Stability notes
- Simulator numbers in `src/sims/constants.ts` match the blueprint
- Not a fielded C-UAS API

## 15. Demo and Communication Surface

Use these for walkthroughs or stakeholder review:

- `npm run dev`: desktop COUNTER-UAS FIRE CONTROL simulator
- `SEM-Tech DEFENDER Demo Blueprint.md`: talk track and numbers

Do not confuse this simulator with a fielded sensor runtime.

## 16. Update Discipline

Assistants may update:

- verification snapshot
- git metadata
- open items
- read-first order
- command results
- dated evidence references

Assistants must not silently change:

- repo identity
- scope
- authoritative source ordering
- preferred runtime path
- milestone truth claims
- vocabulary rules
- handoff contract surfaces

## Change log

- 2026-09-17: Renamed `src/components/game/` to `src/components/sims/` (explicit operator instruction). Path references updated. Identity, vocabulary, and preferred runtime unchanged.
- 2026-09-17: Renamed `src/game/` to `src/sims/` (explicit operator instruction). Path references updated. Identity, vocabulary, and preferred runtime unchanged.
- 2026-09-16: Identity locked to desktop COUNTER-UAS FIRE CONTROL simulator (explicit operator instruction). Runtime remains a desktop browser window; packaged native app is out of scope unless requested.
