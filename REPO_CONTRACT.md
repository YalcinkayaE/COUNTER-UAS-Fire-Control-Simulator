---
repo_name: sem_defender
repo_root: /Users/erkanyalcinkaya/projects/sem_defender
repo_type: prototype
status_date: 2026-09-18
branch: main
default_branch: main
preferred_runtime: npm run dev
preferred_entrypoints:
  - src/main.tsx
  - src/components/sims/SimsApp.tsx
  - src/sims/simulation.ts
authoritative_docs:
  - REPO_CONTRACT.md
  - AGENTS.md
  - docs/30_design/320_demo_blueprint.md
  - README.md
authoritative_codepaths:
  - src/sims/
  - src/components/sims/
  - src/main.tsx
verification_commands:
  - name: unit
    command: npm test
    expected_result: 103 passed
  - name: build
    command: npm run build
    expected_result: exit 0
  - name: dev
    command: npm run dev
    expected_result: Vite serves http://127.0.0.1:5173 with title SEM DEFENDER
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
`Track file (oracle) -> 10 Hz EDF on time-to-asset -> quadratic intercept -> slew/fire in envelope -> hit/miss/breach/impact`

## 2. What This Repo Contains

### Executable core
- `src/main.tsx`: SPA mount.
- `src/components/sims/SimsApp.tsx`: canvas, HUD, overlays, input.
- `src/sims/simulation.ts`: fixed-step loop, magazine, lives, waves.

### Core subsystems
- `src/sims/math.ts`: TTB (time to 36 m asset cylinder) and quadratic intercept.
- `src/sims/droneTarget.ts` / `src/sims/swarmManager.ts`: 20 quads + 2 fixed-wing, 10 Hz EDF list (radar file holds 20).
- `src/sims/turretController.ts`: AUTO/MANUAL slew and fire gate.
- `src/components/sims/Scene.tsx`: battlespace, turret, drones, tracers.
- `src/components/sims/TacticalHUD.tsx` / `Radar.tsx`: EDF table and PPI scope.

### Supporting assets
- `docs/30_design/320_demo_blueprint.md`: 6-minute seated walkthrough.
- `src/styles.css`: Tailwind v4 tokens.
- `src/sims/*.test.ts`: kinematics, radar, turret, camera, ledger characterisation.

## 3. Current Status Boundary

Treat the following as the current truth:

- This product is a desktop COUNTER-UAS FIRE CONTROL simulator, not a tower-defense game and not a fielded sensor.
- The checkout is a Vite SPA in a desktop browser window. TanStack Start / Grok host adapters (`AuthProvider`, `PreviewHostBridge`, `/__grok/*`) are not part of the runtime.
- `npm run dev` serves the simulator at `http://127.0.0.1:5173`.
- Observed on 2026-09-17, labels updated 2026-11-12: document title SEM DEFENDER; briefing and HUD wordmark SEM DEFENDER; welcome card has no ground-vehicle image; Engage starts wave 1 (8–16 quads + 2–3 fixed-wing drawn per wave, raid axis shifts each wave; EDF holds ≤ 20); EDF queue sorts by TTB and PPI is north-up; effector selector live (Effector 1 / Effector 2 / Effector 3; Effector 1 is CAKIR 400 m 1350 rds/min, Effector 2 is PENCE-A 400 m 120 rds/min, Effector 3 is HN-12 200 m 1000 rds/min and remains the default; AUTO holds fire OUT OF RANGE); the kill zone follows the selected effector — Effector 3 breaches ledger at 200 m, Effector 1 and Effector 2 at 400 m, and the PPI envelope label tracks the selection (200m / 400m); AUTO fires (FIRE AUTO / RELEASED); M toggles MANUAL; Esc pauses; Ledger records ENGAGE / FIRE AUTO / INTERCEPT / BREACH / IMPACT / DEFEAT rows with AZ, EL, RNG, V plus CSV/JSON export; an effector change records the console label; 2D view fits the 2 km detect ring.
- Unit tests passed on 2026-09-18 (`93 passed`, 10 files).
- Radar model observed 2026-09-17: single Echodyne Guard-class AESA staring a 120° az × 80° el sector on a north boresight (az gate ±60°, el gate 0–80°), with ±1° az / ±1.5° el angular noise on reports. The full raid spawns inside the sector: quads 10–40° west of north, fixed-wing at ~20°/~40° az northeast. EDF queue, fire control, and kills stay live under noise; status window fixed at 40 rem with effector name, range/lock state, event message, and RDS counter.
- `npm run build` exited 0 on 2026-09-17.
- Environment note 2026-09-17: `npm run dev` bound `127.0.0.1:5175` because two stale node processes already held 5173/5174; 5173 remains the expected bind when free.

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
- North-locked battlespace matching the PPI; 2D view fits the 2 km detect ring
- Simulation ledger (when / what / action / outcome + AZ, EL, RNG, V) with CSV/JSON export
- Variable kill zone tied to effector selection: envelope, BREACH alarm, and the battlespace ring follow the selected effector's range (2026-09-17)
- Per-effector gun elevation windows: HN-12 −5°…+85°; CAKIR −15°…+70°; PENCE-A placeholder −8°…+70°. Look-point clamp and MANUAL pitch (sign-corrected) follow the selection; amber engagement blind cone + red radar-gate cone in the battlespace (2026-09-18)
- One IMPACT on the 36 m asset ends the run: UGV HIT overlay, simulation halted; five-life scoring removed (2026-09-18)
- Impact visibility: 2.5 s battlespace freeze before the defeat alert; CLIMB / DIVE / UGV HIT highlighted in the status window; kamikaze stalk line and larger contact (2026-09-18)
- UGV MOVE at 30 km/h: bang-bang heading away from a climbing/diving kamikaze to open the elevation angle; fire-call perpendicular otherwise (2026-09-18)

### What is not complete
- Split-raid waves, threat classes, soft-kill, track quality (blueprint “next demo”, only if asked)
- Fielded sensor or Unity runtime

## 4. Authoritative Sources

Use these in order of precedence when determining live status:

1. `REPO_CONTRACT.md`
2. Runtime under `src/sims/` and `src/components/sims/`
3. `docs/30_design/320_demo_blueprint.md` for walkthrough claims and numbers
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

Verified locally on 2026-09-18:

- unit
  - command: `npm test`
  - result: 103 passed (11 files)
- build
  - command: `npm run build`
  - result: exit 0

### Acceptance signals
- Title is SEM DEFENDER
- 2 km detect ring, 1 km fence, and the effector-range kill zone ring visible (200 m Effector 3; 400 m Effector 1 / Effector 2)
- After Engage, tracks appear and EDF table sorts by TTB
- AUTO slews and can fire; MANUAL is available on M
- Ledger records engage, fire, and intercept

### Failure signals
- Missing `#app` or failed module import at startup
- Blank canvas with console WebGL/React errors
- Engage does not change phase out of briefing

## 7. Open Items

The main open items are:

- Blueprint section 10 follow-ons are not implemented
- Blueprint Beat 5 drift noted 2026-09-18: the talk-track still says "A lost life is HIT ASSET" — stale after the terminal-UGV-HIT change (five-life scoring removed; status and ledger now record UGV HIT). Flagged, not edited.
- PENCE-A traverse/elevation specs pending operator (placeholder −8°/+70° in code).
- W/S pitch direction inverted vs FPS convention — operator decision pending.
- Headless `window.__cuas` probe was not observed in the browser-automation harness even while play worked; treat HUD/canvas as the live check, not that probe. Update 2026-09-17: the probe was live in the Playwright MCP harness (14 keys; counters reconciled exactly with ledger rows), so the earlier non-observation looks harness-specific, not a sim defect.
- Contract body drift noted 2026-09-17: `src/sims/edgeComputer.ts`, `src/sims/radarSensor.ts`, `src/sims/audio.ts`, and `src/components/sims/Overlays.tsx` / `SourcePanel.tsx` are live in code and verified in the browser, but Section 2 does not list them yet. (Effector selection is now covered by status and vocabulary after the variable-kill-zone change.)

### Next recommended actions
- Run `npm run dev` and walk the blueprint beat sheet
- Add follow-on waves only if requested

## 8. Read-First Order

For the fastest orientation path, read these in order:

1. `REPO_CONTRACT.md`
2. `docs/30_design/320_demo_blueprint.md`
3. `src/sims/constants.ts`
4. `src/sims/math.ts`
5. `src/sims/simulation.ts`
6. `src/components/sims/SimsApp.tsx`
7. `src/sims/ledger.ts`
8. `src/sims/camera.ts`

## 9. Workstream Map

Then choose your path:

- Runtime work: `src/sims/`, `src/components/sims/Scene.tsx`, `src/components/sims/SimsApp.tsx`
- Verification work: `src/sims/*.test.ts`, `npm test`, `npm run build`
- Demo or stakeholder walkthrough work: `docs/30_design/320_demo_blueprint.md`, `npm run dev`
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
- `src/sims/*.test.ts`

### D. Archival or narrative
- `docs/30_design/320_demo_blueprint.md` (authoritative for demo numbers and talk track, not for “what is live”)

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

- `Time-to-Breach` / `TTB`: `(horizontal range − 36 m asset) / horizontal closing speed`
- `Earliest Deadline First` / `EDF`: sort live tracks by lowest TTB
- `AUTO` / `MANUAL`: fire-control modes on the same intercept solution
- `kill zone`: the selected effector's range (Effector 3 / HN-12 200 m; Effector 1 / CAKIR and Effector 2 / PENCE-A 400 m); the AUTO fire envelope and the red ring; a BREACH is envelope entry (GUNS TIGHT), not a lost life
- `Effector 1` / `Effector 2` / `Effector 3`: console labels. Effector 1 is internal id CAKIR (1350 rds/min, 400 m). Effector 2 is internal id PENCE-A (120 rds/min, 400 m). Effector 3 is internal id HN-12 (1000 rds/min, 200 m) and is the default. Internal ids stay in code and tests.
- `blind cone`: zenith region above the selected effector's elevation max (Effector 3 / HN-12 85°; Effector 1 / CAKIR 70°; Effector 2 / PENCE-A 70°); amber engagement cone + red radar-gate cone in the battlespace; contact tint when a track is inside; UGV MOVE can open ground range to bring a track back into the window
- `asset`: 36 m horizontal cylinder; IMPACT here costs a life
- `weapons-release authority`: the operator role
- `COUNTER-UAS FIRE CONTROL`: product class; this repo is a desktop simulator of that class
- `simulator`: simulated tracks and fire-control loop; not a fielded weapon system
- `desktop`: seated operator console (keyboard, pointer, large display)

Avoid these collisions or substitutions:

- Do not rename TTB to “ETA” or “time-to-impact”; TTB is the HUD name for time to the asset cylinder
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
- `docs/30_design/320_demo_blueprint.md` beat sheet
- Optional `window.__cuas` / `window.__controlsTest` probes in `src/sims/simulation.ts` (not relied on for live status)

### Stability notes
- Simulator numbers in `src/sims/constants.ts` match the blueprint
- Not a fielded C-UAS API

## 15. Demo and Communication Surface

Use these for walkthroughs or stakeholder review:

- `npm run dev`: desktop COUNTER-UAS FIRE CONTROL simulator
- `docs/30_design/320_demo_blueprint.md`: talk track and numbers

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

- 2026-11-12: Operator-facing effector labels are Effector 1 (CAKIR), Effector 2 (PENCE-A), and Effector 3 (HN-12, still the default). Welcome card no longer shows the ground-vehicle image. README opening describes mixed-speed swarms, maneuver, move-and-fire, the three effectors, and the round-by-round ledger. Internal ids unchanged.
- 2026-09-21: DOC-310 restructured for stakeholder reading: Part A plain-language (decision loop, asset vs kill zone, nearest≠EDF, demo cues); Part B keeps the KaTeX / `math.ts` reference. No runtime change. Elevation windows aligned to live constants (HN-12 −5°/+85°; CAKIR −15°/+70°; PENCE-A −8°/+70°).
- 2026-09-18: Reconcile Mac blind-cone handoff onto main. Keep Mac `blindCone.ts` (engagement + radar-gate cones, contact tint), CAKIR −15°/+70°, HN-12 −5°/+85°, PENCE-A placeholder −8°/+70°, and pitch-sign fix (`elMin`/`elMax` with MANUAL clamp as negated elevation). Keep main: per-round muzzle audio, stripped welcome briefing, EDF queue under the title on the left, UGV MOVE `elevationSwitch`. Verified: 103 passed (11 files), build exit 0.
- 2026-09-18: Per-effector turret specs and blind-cone battlespace highlight (Mac working tree, then `25cf582`). Elevation window per effector; `applyEffector` pushes the window and re-clamps pitch. Battlespace amber engagement cone + red dashed radar-gate cone (`src/sims/blindCone.ts`).
- 2026-09-18: Overhead kamikaze, terminal impact, and the UGV MOVE blind-spot run (commits c66683f, 10b4ac9, 9ca27e0, c942fb7).
- 2026-09-18: DOC-310 rewritten to match `math.ts` (commit 2c1d1f2).
- 2026-09-17: Fire-control deadline split on operator instruction (suggested order from the scoring review). TTB is time to the 36 m asset cylinder; the selected effector's range remains the kill-zone envelope (fire gate, red ring, BREACH). AUTO commits across bursts (1.5 s hysteresis) and skips a track when slew + time of flight exceeds TTB. Wave-clear aborts leftover burst and in-flight rounds as SUPPRESSED. Fuse stays 48 m. DOC-310 rewritten to the live constants; DOC-320 talk-track and briefing corrected. Vocabulary for TTB / kill zone / asset updated per that instruction. Verified: 56 passed (9 files), build exit 0.
- 2026-09-17: Demo blueprint updated to current truth (variable kill zone, single 120° × 80° radar sector with angular noise, 8–16 quads + 2–3 fixed-wing with per-wave raid axis, status window with RDS, ledger SUPPRESSED accounting) and moved to `docs/30_design/320_demo_blueprint.md` (DOC-320) per the docs taxonomy, on operator instruction. Inbound references updated (contract, README, DOC-404). The 310 fire-control optimisation note remains pinned to the fixed 500 m kill zone — still open. Authority ordering unchanged: the blueprint stays the demo talk-track source, not live status.
- 2026-09-17: Wave randomization and full round accounting on operator instruction. Waves draw 8–16 quads and 2–3 fixed-wing with a per-wave raid axis (quad corridor 30° wide, center within ±27° of north; fixed-wing azimuth 8–34° east of north + 4° per airframe), all inside the 120° sector including maneuver wobble; drone pool is 16 + 3 and pool members start dead. Ledger: rounds resolving on an already-dead track now record INTERCEPT / SUPPRESSED, so FIRE = HIT + MISS + SUPPRESSED + in-flight reconciles exactly (verified live: 176 = 23 + 14 + 139 + 0). Battlespace shows the 120° sector wedge (subtle fill plus edge rays). Briefing updated. Verified: 47 passed (8 files), build exit 0, live run showed wave-1 axis az 11–42° and wave-2 axis az 326–354°, 0 console errors.
- 2026-09-17: Ledger consistency audit (operator request): 725+ rows over 5 waves reconciled exactly against sim counters and HUD (FIRE == shotsFired == RDS; INTERCEPT HIT == intercepts; IMPACT == lives lost). Timestamps monotonic, no duplicate BREACH/IMPACT per track within a wave, kinematics valid and present on all track rows. Known semantic: rounds resolving on an already-dead target record no terminal row (`detonate` early return), so FIRE exceeds HIT+MISS by design; cross-target proximity kills appear as HIT rows whose id differs from the surrounding FIRE block. Open item on the `__cuas` probe amended: observed live in the Playwright MCP harness.
- 2026-09-17: Single-radar sector per explicit operator instruction: one Echodyne Guard-class AESA stares a 120° az × 80° el sector on a north boresight, replacing the three-panel 360° assumption. Azimuth gate added to `RadarSensor.inFov`. Raid geometry moved inside the sector: fixed-wing spawn east -> northeast (~20° / ~40° az), quad corridor narrowed to 10–40° west of north so the ±40% azimuth maneuver stays in-sector. PPI draws the coverage wedge; briefing updated. Verified: 46 passed (8 files), build exit 0, live run showed F01/F02 at az 17°/39° with F02 heading the EDF queue, kills under noise, 0 console errors.
- 2026-09-17: HUD and radar model pass on operator instruction. Status window fixed at 40 rem (effector name header, range/lock, event message, RDS counter); center-screen messages and the duplicated strip removed; rounds-fired (`shots`) exposed on the HUD snapshot. UGV and drone models detailed (glacis, skirts, AESA mast, turret shroud/baffles/optics; quad spine/strobes/motor pods; fixed-wing winglets/nozzle). Radar calculation model: three 120° × 80° staring panels (360° az coverage), 0–80° elevation gate in `RadarSensor.scan`, ±1° az / ±1.5° el uniform angular noise on reports via injectable jitter. Verified: 45 passed (8 files), build exit 0, live run showed EDF population, kills, and fixed window width under message churn; 0 console errors.
- 2026-09-17: Kill zone made variable on explicit operator instruction: it is now the selected effector's range (HN-12 200 m; CAKIR / PENCE-A 400 m). `KILL_ZONE` constant removed; kill zone threaded through `SwarmManager`, `RadarSensor`, `EdgeComputer`, and `DroneTarget`; breach message/ledger and the battlespace ring follow the selection; briefing text updated. Vocabulary rules for `TTB` and `kill zone` updated per the instruction. Verified: 43 passed (8 files), build exit 0, browser run showed 200 m breaches under HN-12 and 400 m breaches + `400m` PPI label after switching to CAKIR, 0 console errors. Blueprint and `310_fire_control_optimization.md` still pin 500 m — flagged as open items.
- 2026-09-17: Verification surface re-run on operator instruction. Snapshot updated: unit 41 passed (8 files, was 38/7); build exit 0; browser re-verified on `127.0.0.1:5175` (5173/5174 held by stale node processes) covering effector selector, EDF queue, PPI, AUTO/MANUAL, pause, ledger rows with kinematics and export, 2D view; 0 console errors. Open items gained a contract-body drift note for modules landed since the last status refresh. Identity, scope, authority ordering, runtime path, milestone claims, and vocabulary unchanged.
- 2026-09-17: Console wordmark and document title aligned to SEM DEFENDER. `GameApp.tsx` renamed to `SimsApp.tsx`. KANGAL removed from hull marks and remaining docs. Blueprint magazine/rings/track counts refreshed to `src/sims/constants.ts`. Verification snapshot: 38 passed. Identity (SEM-Tech DEFENDER product class) unchanged.
- 2026-09-17: Renamed `src/components/game/` to `src/components/sims/` (explicit operator instruction). Path references updated. Identity, vocabulary, and preferred runtime unchanged.
- 2026-09-17: Renamed `src/game/` to `src/sims/` (explicit operator instruction). Path references updated. Identity, vocabulary, and preferred runtime unchanged.
- 2026-09-16: Identity locked to desktop COUNTER-UAS FIRE CONTROL simulator (explicit operator instruction). Runtime remains a desktop browser window; packaged native app is out of scope unless requested.
