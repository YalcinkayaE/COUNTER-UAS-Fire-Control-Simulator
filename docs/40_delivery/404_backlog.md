---
document_id: DOC-404
title: Gap backlog against the JRC-based C-UAS simulator blueprint
status: draft
owner: unresolved
created: 2026-09-17
updated: 2026-09-17
applies_to: working tree on main at 153297f plus uncommitted changes
authority: informative
supersedes: null
related:
  - DOC-310
---

# Gap backlog: SEM DEFENDER vs the JRC-based simulator blueprint

Compared: `docs/30_design/320_demo_blueprint.md` and the code under `src/sims/`, `src/components/sims/`
against `cuas-fire-control-simulator-blueprint-2.md` (2026-09-17, external, not in the repo; referred to
below as "BP2"). Section numbers such as §4 refer to BP2. R, V, S and F IDs are BP2's IDs.

Every item is PROPOSED. Nothing here has been started.

Narrative drift inside the demo blueprint (fixed 500 m kill zone, fixed-wing from the east, unlisted
modules) is already tracked in `REPO_CONTRACT.md` §7 and is not repeated here.

## 0. Decision gate (decide before anything below)

The two documents describe different products. BP2 §3 lists "A. Fire control simulator", which is what
this repo is, and rejects it in favour of "B. Detection-to-decision simulator". BP2 §1 puts engagement
geometry, effector physics and hit/kill probability out of scope. Those are the core of the current
build. Section 3 below lists what that affects.

- [ ] **G-01 F2 Framing.** Fire control (keep the current product) or decision and authorisation (BP2
  Option B). BP2 says the audience decides: EU civil authorities or defence customers. This decides
  whether section 2 is backlog at all.
- [ ] **G-02 F1 Primary purpose.** Operator training, concept evaluation, or Guardian Logic test harness
  (Option C). This decides whether the HMI or the interface adapters come first.
- [ ] **G-03 AUTO release vs a human gate.** BP2 §5 says only a named human moves a track past
  authorisation. The current AUTO mode fires without any per-shot human decision. Decide whether AUTO
  stays, is removed, or becomes "request raised, human authorises".
- [ ] **G-04 F8 Evidence format.** Bespoke ledger or AxoDen evidence objects. BP2 needs this by P0.
- [ ] **G-05 F9 Vendor thresholds.** Whether Echodyne figures (10 Hz, 800 m) become pass criteria or
  stay as labelled priors.

## 1. Gaps under either framing

### 1.1 Determinism and replay (BP2 §4 engineering constraints, §8 replay check, P0 exit)

- [ ] **D-01 Seed the run.** `simulation.ts:121-122` builds `SwarmManager` and `RadarSensor` with the
  default `Math.random`. Both constructors already accept an RNG, so the change is to pass one seeded
  PRNG from the run config. Scope is narrower than it looks: per-drone altitude, speed and manoeuvre
  phases already come from the deterministic `hash()` in `swarmManager.ts`. Only the corridor centre,
  the quad and fixed-wing counts, fixed-wing azimuth (`swarmManager.ts:52-87`) and the radar angle noise
  are unseeded.
- [ ] **D-02 Remove wall-clock reads from the core.** `ledger.ts:41` writes `new Date().toISOString()`
  on every row. Keep sim time (`when`) as the record time and move the wall time into a run header.
- [ ] **D-03 Run header.** Record seed, scenario hash, model/code version and operator identity at
  Engage. None of these is recorded today.
- [ ] **D-04 Replay test.** Same seed and inputs give a byte-identical ledger. Include recorded MANUAL
  inputs, which are the only non-seeded input.
- [ ] **D-05 Declare the platform set** the replay check is claimed for (browser and OS combinations).

### 1.2 Evidence log (R14, §8 evidence integrity, V14)

- [ ] **E-01 Hash chain.** Each ledger row carries the hash of the previous row. The ledger is
  append-only in memory today but has no hash chain.
- [ ] **E-02 Synthetic marker** on every record and in both CSV and JSON exports.
- [ ] **E-03 Gate refusals** logged with the failing clause (depends on G-03 and B-09).
- [ ] **E-04 Export integrity.** Include the header and the final chain hash in the export so a
  modified file can be detected.

### 1.3 Report path and track picture (the "seal", §4)

- [ ] **T-01 Range and velocity come straight from truth.** `radarSensor.ts` `reportOn()` adds noise
  to azimuth and elevation only. `range` and the full `velocity` vector are copied from truth.
  `EdgeComputer.fromReport()` rebuilds position from the noisy angles and the exact range, so the
  position and derived range carry angular error only, and the velocity used for TTB and the intercept
  is exact. Add range noise and a velocity estimate (for example, differenced positions or a filter
  output).
- [ ] **T-02 Reports carry truth IDs.** `id: o.id` passes the ground-truth identity to the track
  file. No association step exists, so identity swaps (R4) cannot happen or be measured. Replace
  with sensor-assigned track IDs and an association step.
- [ ] **T-03 Kind is a truth label.** `kind` (quad or fixedWing) is passed through from truth.
  Every track is classified correctly. Replace with an estimated class plus a confidence value (R5).
- [ ] **T-04 Pre-rank uses truth.** `RadarSensor.scan()` sorts truth objects by truth TTB to choose
  the 20 reported tracks. Choose which tracks to report by a sensor-side rule, not by the truth
  deadline.
- [ ] **T-05 Type-level seal.** Make it impossible for advisory code (`edgeComputer`, HUD) to import
  truth types. Enforce with a lint rule or module boundary test.

### 1.4 Radar model realism (R6, R8, R15, V1, V4, V5, V8, A.4)

- [ ] **RM-01 No range gate.** `inFov()` checks angles only, so quads are reported from the 2 km spawn
  range. `EdgeComputer.maxRange` (set to the effector range in `simulation.ts:395`) limits which
  tracks can be fired on. It does not limit detection. BP2 A.3 gives the claimed EchoGuard prior as
  about 1 km for a small 4-rotor and 2 km for a small fixed wing. Add a per-class range curve with a confidence level.
- [ ] **RM-02 Detection probability.** Every in-sector object is reported on every scan. Add Pd as a
  function of range, class and environment, which produces misses and coasting.
- [ ] **RM-03 False plots and ghost tracks** (multipath, urban Doppler clutter, birds).
- [ ] **RM-04 Range resolution** as a separate parameter from angular accuracy (V5, A.4 #4). Close
  targets should merge.
- [ ] **RM-05 Hover and slow-flight behaviour.** Near-zero Doppler degradation, with a micro-Doppler
  flag (V4, V8).
- [ ] **RM-06 Label vendor numbers.** The constants comments call the ±1° / ±1.5° values
  "datasheet". Mark them CLAIMED (Echodyne, unverified) in `constants.ts` and in the demo blueprint.
- [ ] **RM-07 Name each rate by layer** (A.4 #10): radar 10 Hz, sim step 60 Hz, display rate. Say
  which layer each HUD number belongs to.
- [ ] **RM-08 Radar tasking cost** (A.4 #1), only if an air-and-ground mode is ever added.

### 1.5 Evaluation against truth (R3, R12, R13, R15, §7 metrics)

- [ ] **EV-01 After-action evaluation module** that reads the ledger plus sealed truth after the run.
  Current outcomes are hit, miss and breach only.
- [ ] **EV-02 Runs as distributions.** Batch N seeded runs and report p50 and p95, not a single run's
  result (R15).
- [ ] **EV-03 Metrics that apply under both framings.** Update interval, localisation error, false
  positives, false negatives, identity swaps, range at first confirmed track, and minimum resolvable
  separation.
- [ ] **EV-04 After-action replay view** driven from the ledger (P3).
- [ ] **EV-05 Scoring form per scenario** (V19).

### 1.6 Claim discipline in the docs (BP2 §1 claim-status key)

- [ ] **C-01 Tag claims in the demo blueprint** as ESTABLISHED, CLAIMED, IMPLEMENTED or UNVERIFIED
  CONJECTURE. Examples: "Echodyne-class reports" is CLAIMED; "EDF at 10 Hz" is IMPLEMENTED with
  evidence in `REPO_CONTRACT.md` §6.
- [ ] **C-02 Demo blueprint §2 "Do not claim"** should add: no missed detections, no range noise,
  classification from truth, and no replay guarantee. These follow from T-01 to T-03 and D-01.
- [ ] **C-03 Validity envelope.** State the UA classes, ranges and weather the radar model is meant
  for, and flag runs outside it (§8).
- [ ] **C-04 Record BP2 as a source.** Copy BP2 into the repo (for example under `docs/80_reference/`)
  or record where it is kept, so this backlog's references resolve.

### 1.7 Closest approach and prioritisation fields (V12)

- [ ] **P-01 Closest point of approach.** Add time and distance of closest approach per track next to
  TTB. TTB assumes a radial approach; CPA covers tangential passes.
- [ ] **P-02 Range masks** in the PPI and EDF table, with masked tracks still logged (V13).

## 2. Needed only if G-01 selects Option B (detection to decision)

BP2 lists none of this as implemented, and none of it exists in the repo. Items are grouped by BP2
module and phase. Grouping only: each line needs its own design before work starts.

### 2.1 P0 foundation

- [ ] **B-01 Data model** using the terminology of Regulations (EU) 2019/945 and 2019/947 and
  COM(2023) 659 as type names (R16).
- [ ] **B-02 Scenario file format:** site, weather, light, ambient sound, spectrum load, UA agents,
  decoys, authorised flights, and intent labels (V20).
- [ ] **B-03 Three-partition layout** (sealed, advisory, deterministic) with four boundary message
  types: report, cue, authorisation request, authorised response.

### 2.2 P1 coverage planner (Option D)

- [ ] **B-04 Site model** with 3D occlusion geometry (T1).
- [ ] **B-05 T0 statistical sensor models** for radar, RF/DRI, EO/IR, acoustic and human.
- [ ] **B-06 Blind-spot maps** by altitude, with a vertical field-of-view check (V7). Reproduce S2 as
  the exit test.
- [ ] **B-07 Sampled coverage with declared uncertainty** for RF and acoustic (R7).

### 2.3 P2 detection to confirmation

- [ ] **B-08 Fusion and tracking.** Asynchronous, out-of-order, timestamped reports. Reference
  tracker or plug-in (F5). Associate reports to tracks (see T-02).
- [ ] **B-09 Confirmation manager.** Cue a PTZ camera or spotter, log independent confirmation, and
  measure cue-to-lock time (R2, V6, V9, V16).
- [ ] **B-10 Classify and identify.** Confidence tied to feature diversity. DRI spoofing as a scenario
  control. Flag a radar track with no RF correlate (R5, R11, V10).
- [ ] **B-11 Human sensor class.** Spotters and public reports with delay, fatigue and position error
  (R9).
- [ ] **B-12 HMI additions.** Map, alerts, synthetic camera view, workload capture, authorisation
  requests, and a validity-envelope flag.
- [ ] **B-13 Report schema.** SAPIENT, bespoke, or wait for EUROCAE (F6).
- [ ] **B-14 Operator model.** Single seat or multi-role team (F7).

### 2.4 P3 decision and authorisation

- [ ] **B-15 Decision support.** Route and zone compliance, threat advisory, CPA fields.
- [ ] **B-16 Authorisation gate** with the six preconditions from §5. Deterministic, with an
  exhaustive truth-table test.
- [ ] **B-17 Track lifecycle state machine** from §5. A reacquired track must be reconfirmed.
- [ ] **B-18 Authority profiles:** jurisdiction, acting body, permitted response classes, sensor
  permissions, data handling (F4, §6).
- [ ] **B-19 Collateral layer.** Hazard footprints written by the scenario author, laid over
  people-density and protected-area layers (precondition 5).
- [ ] **B-20 Response interface.** Typed requests. Outcomes read from the scenario script, not
  computed. Include procedural options such as notify, dispatch and relocate (R14).

### 2.5 Scenario library (S1 to S16)

- [ ] **B-21 Seed scenarios** S1 to S11 from §7 and S12 to S16 from A.3. The current wave generator
  partly covers S16 (three or more UA in view) and S13 (manoeuvres). No other scenario exists.

### 2.6 P4 verification and validation

- [ ] **B-22 Analytic checks** (for example, 6 dB acoustic loss per distance doubling, and occlusion
  on hand-built geometry).
- [ ] **B-23 Calibration** against CWA 18150 or DIN 5452-9 style trial data. Data access is OPEN.
- [ ] **B-24 Face-validity review** with C-UAS operators.
- [ ] **B-25 Obtain source texts** not read for BP2: CWA 18150, the two companion JRC handbooks,
  ISO/CD 16746. Pass thresholds stay OPEN until these are read.
- [ ] **B-26 Legal review** of personal-data handling if recorded imagery or DRI data is ever used.

## 3. Built today, out of scope under Option B

If G-01 selects Option B, these are not gaps. They are existing work that BP2 says not to model. Decide
for each whether to keep it as a separate mode, freeze it, or retire it. Do not delete anything
without that decision.

- [ ] **X-01 Quadratic intercept and 2 000 m/s projectile** (`math.ts`, `turretController.ts`)
- [ ] **X-02 75°/s slew budget and 0.85° align gate**
- [ ] **X-03 Effector set** CAKIR, HN-12 and PENCE-A with the kill zone tied to effector range
- [ ] **X-04 Magazine model:** burst, rate of fire, 16 in flight, 48 m fuse
- [ ] **X-05 AUTO/MANUAL fire release** (see G-03)
- [ ] **X-06 Lives and waves scoring**, which BP2 would replace with §7 metrics
- [ ] **X-07 DOC-310** fire-control mathematics note: keep as the reference for the fire-control mode

Parts that carry over to Option B: the EDF TTB ranking (as decision-support input), the 10 Hz radar
sector gate and angular noise (as the start of the T0 radar model), the ledger (as the start of the
evidence log), the PPI and track table (as HMI).
