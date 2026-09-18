---
document_id: DOC-320
title: SEM-Tech DEFENDER demo blueprint
status: implemented
owner: unresolved
created: 2026-09-16
updated: 2026-09-17
applies_to: desktop simulator
authority: informative
supersedes: null
related:
  - DOC-310
---

# SEM-Tech DEFENDER — Demo Blueprint

**Product:** SEM-Tech DEFENDER
**Type:** Desktop COUNTER-UAS FIRE CONTROL simulator
**Runtime:** 6 minutes seated, 12 minutes with Q&A
**Audience:** C-UAS, C2, weapons, software
**Classification:** Unclassified simulator — simulated tracks, not a fielded sensor

---

## 1. One-liner

A desktop COUNTER-UAS FIRE CONTROL simulator that ranks an inbound raid — **8–16 quads plus 2–3 fixed-wing, axis shifting each wave** — by **Earliest Deadline First** (time to the **36 m asset**), slews a turret at **75°/s** onto a **quadratic intercept**, and fires AUTO or MANUAL inside the selected effector's **kill zone** (the gun envelope).

Do not call it a tower-defense game. The operator is the **weapons-release authority**, not a builder.

---

## 2. What to claim / not claim

**Claim**
- Live EDF track file at 10 Hz from a single Echodyne Guard-class AESA: 120° × 80° staring sector on a north boresight, 1° az / 1.5° el angular accuracy on the reports
- Time-to-Breach = (horizontal range − 36 m asset) / horizontal closing speed; EDF sorts on that deadline
- Effector selection: CAKIR (1350 rds/min, 400 m), HN-12 (1000 rds/min, 200 m), PENCE-A (120 rds/min, 400 m) — the red ring, the AUTO fire envelope, and the BREACH alarm follow the selection; TTB does not
- AUTO commits to a track across bursts unless another deadline is at least 1.5 s earlier, and skips a track when slew plus time of flight exceeds TTB
- Quadratic 3D lead for a constant-velocity target
- Hard slew budget (75°/s) and effector burst cycle (0.5 s burst, 16 rounds in flight)
- AUTO vs MANUAL override on the same intercept solution
- Simulation ledger with full round accounting: every fired round ends as HIT, MISS, or SUPPRESSED; CSV/JSON export

**Do not claim**
- Real radar DSP (no CFAR, no micro-Doppler, no missed detections)
- RF / Remote ID / EO classification
- Soft-kill, jamming, or interceptor-drone effectors
- Unity build — this simulator is React + Three.js with the same modules as the C# design

---

## 3. Pre-flight (30 s)

1. Load the console. Confirm title **SEM DEFENDER**.
2. Leave the camera as-is (facility at origin, khaki 2 km detect ring, orange 1 km fence, red kill-zone ring at the selected effector's range, pale 120° sector wedge to the north). North is up on both the battlespace and the PPI.
3. Optional: unmute.
4. Know the keys before you click Engage.

| Input | Action |
|---|---|
| Engage | Weapons free, wave 1 |
| Effector buttons | CAKIR / HN-12 / PENCE-A — kill zone follows |
| M | AUTO ↔ MANUAL |
| A / D | Yaw (MANUAL) |
| W / S | Pitch (MANUAL) |
| Mouse | Point the barrel (MANUAL) |
| Space / click | Fire if aligned |
| Esc / P | Pause |
| 2D view | Top-down, north-up, 2 km ring in frame |
| Ledger | When / what / action / outcome (AZ, EL, RNG, V), CSV/JSON export |

---

## 4. Beat sheet (6 minutes)

### Beat 0 — Briefing (0:00–0:45)

**Show:** Start card. Rings and the sector wedge visible through the glass.

**Say:**
> Facility at the origin. Gold ring is the 2 km detect volume, orange is the 1 km fence, red is the kill zone — the selected gun's range: 200 m on the HN-12, 400 m on CAKIR or PENCE-A. That ring is where AUTO is allowed to fire, not the EDF deadline. The pale wedge is the radar: one Echodyne Guard staring north, 120 by 80 degrees. The raid is eight to sixteen quads from 1 km plus two or three fixed-wing from 2 km, axis shifting each wave; they weave in azimuth and altitude. Crossing the red ring is GUNS TIGHT. One overflight of the 36 m site is UGV HIT — the run stops.

**Do not:** click Engage until the rings and the TTB formula are on screen.

### Beat 1 — EDF is the clock (0:45–1:30)

**Show:** Click **Engage**. Point at the **EDF QUEUE** (right) and **PPI SCOPE** (left).

**Say:**
> Detection is assumed inside the sector. The interesting problem starts after the track file exists. Every 100 ms we recompute Time-to-Breach and sort lowest first. That is Earliest Deadline First — the same idea as "First" in air defense, but in radial time, not path progress.

**Gesture:** the top row (▸ Txx) is AUTO's current shot. Red TTB < 8 s is imminent. SLEW vs TTB: if slew plus time of flight is larger than TTB the row is LATE — AUTO cannot save it. ENGAGED means rounds are already in the air; HOLD is the assigned fire call waiting to shoot.

**Formula to read aloud:**
`TTB = (horizontal range − 36 m asset) / horizontal closing speed`

Receding or hovering tracks go to infinity. NOW means the track is over the asset, not that it has entered the gun envelope.

### Beat 2 — Geometry, not DPS (1:30–2:30)

**Show:** Turret at origin. Sage lead octahedron on the predicted intercept. Tracers on fire.

**Say:**
> The gun does not aim at the drone. It solves a quadratic: projectile speed 2 000 m/s, target position and velocity from the last scan — with one degree of azimuth noise on the report, like the datasheet says. Earliest positive time of flight is the aim point. Slew is 75 degrees per second. Align gate is under a degree. Two hot tracks at opposite edges of the sector cannot both be serviced before TTB expires. That is the constraint.

**If a miss:** "Proximity fuse, 48 m. A miss is a spent round, not a retry — and the ledger records every round: hit, miss, or suppressed because the track died first."

### Beat 3 — Magazine (2:30–3:15)

**Show:** Bottom status window — effector name, IN RANGE / LOCKED, the event line, and the RDS counter climbing.

**Say:**
> 2026 C-UAS is a magazine problem. Cheap mass versus expensive interceptors. Half-second bursts at the effector's cyclic rate, cap 16 in flight. The scarce resources are slew time, rounds, and your attention. The rounds counter at the bottom is the honest bill.

### Beat 4 — Override (3:15–4:15)

**Show:** Press **M**. Crosshair appears on the mathematical lead. Fire only when aligned.

**Say:**
> AUTO is the duty officer. MANUAL is you stealing a shot AUTO would waste — or holding fire. Real C2 is one operator supervising the scheduler, not painting every track by hand.

**Do:** slew onto a second-priority track, fire, switch back to AUTO. Or click an EDF row to designate — AUTO stays on, but the fire call pins to that track (★). Click again to clear. Optional: switch effector mid-wave and watch the red kill-zone ring move — that is the fire envelope. The EDF column does not re-sort; TTB is still time to the asset. **UGV HOLD** vs **UGV MOVE** (30 km/h): HOLD keeps the zenith blind cone (HN-12 85° / CAKIR 70°; H01 overhead → UGV HIT). MOVE can open ground range so radar and turret see the kamikaze.

### Beat 5 — Leak and reset (4:15–5:00)

**If a breach:** red burst, "Txx BREACHED 200 m — GUNS TIGHT" in the status window, ledger row with the ring it crossed.

**Say:**
> GUNS TIGHT means they are inside the gun you picked. A lost life is HIT ASSET — the 36 m cylinder — not the red ring. Pause with Esc if you need to talk over a freeze-frame.

### Beat 6 — Close (5:00–6:00)

**Say:**
> What you saw is the Decide and Engage slice of the kill chain. Detect, Track, and Identify are oracles in this build — the radar's sector, rate, and accuracy are modelled, the detection logic is not. Next layers — if you want them — are threat classes, track quality, and a soft-kill effector.

**Stop talking. Ask for questions.**

---

## 5. Architecture (map to the original C# prompts)

| Prompt | Module | Role in the demo |
|---|---|---|
| 1. Data + EDF | `DroneTarget` + `SwarmManager` | 8–16 quads + 2–3 fixed-wing per wave, raid axis drawn per wave |
| 1a. Sensor | `RadarSensor` | 10 Hz reports, 120° × 80° sector gate, 1° / 1.5° angular noise |
| 1b. Track file | `EdgeComputer` | Reconstructs tracks from reports, EDF sort, coasts between scans |
| 2. Kinematics | `TurretController` | Quadratic intercept, 75°/s `RotateTowards`, AUTO/MANUAL |
| 3. UI | `TacticalHUD` + PPI + LineRenderer analogues | Polar radar with sector wedge, EDF table, status window, tracers, destroy on intercept |

Runtime here is **TypeScript + Three.js** so it plays in the browser. The math and loop are the Unity design.

---

## 6. Numbers (memorize these)

| Item | Value |
|---|---|
| Detect ring | 2 000 m |
| Outer fence | 1 000 m |
| Kill zone / envelope | Selected effector's range: 200 m (HN-12) / 400 m (CAKIR, PENCE-A) |
| Asset / TTB deadline | 36 m horizontal cylinder |
| Effectors | CAKIR 1350 rds/min · HN-12 1000 rds/min · PENCE-A 120 rds/min |
| Tracks / wave | 8–16 quads + 2–3 fixed-wing (radar file holds 20) |
| Raid axis | Drawn per wave, inside the sector |
| Radar sector | 120° az × 80° el, boresight north |
| Angular accuracy | ±1° az / ±1.5° el on reports |
| Radar rate | 10 Hz (simulated Echodyne Guard-class reports) |
| Slew | 75 °/s |
| Align | 0.85° |
| Projectile | 2 000 m/s (1 km in 0.5 s) |
| Fuse | 48 m |
| Burst | 0.5 s at the effector's rate |
| In flight | 16 |
| Lives | 5 (sim; not on the HUD) |
| Waves | 8 |

---

## 7. Talking points vs a fielded C-UAS

| Real kill chain | In this demo |
|---|---|
| Detect (radar/RF/EO) | Sector, rate, and accuracy modelled; detection itself certain |
| Track (EKF / JPDA) | Perfect kinematics + weave, coasted between scans |
| Identify | Every blip is hostile |
| Decide | **EDF TTB — implemented** |
| Engage | **Quadratic intercept + slew + effector envelope — implemented** |
| Assess | Hit / miss / suppressed / breach, all in the ledger |

Use that table if someone asks "where is the radar algorithm?" Answer: we model the sensor's coverage and accuracy so we can demo **fire-control policy**. Detection logic is a follow-on beat.

---

## 8. Likely questions

**Why does the wave size change?**
Saturation of one turret is the demo, and a memorized raid is not. Each wave draws 8–16 quads and 2–3 fixed-wing and picks an axis inside the sector. EDF is trivial on one track; it is the policy you want when a dozen deadlines compete.

**Why not just shoot nearest?**
Nearest can be slow and far from the asset. TTB is time to the 36 m cylinder. A fixed-wing at 2 km closing at 80 m/s has TTB ≈ 24.6 s; a quad at 1 km closing at 25 m/s has ≈ 38.6 s. The farther aircraft is the earlier deadline. Inside the red ring those numbers stay distinct — TTB does not collapse to NOW.

**Can AUTO lose?**
Yes. Slew + burst cycle + 16-round cap + the envelope. Wave speed ramps. That is the point of MANUAL.

**Why does the red ring move when I switch effector?**
Because the kill zone is the gun's range — the AUTO fire envelope and the BREACH alarm. Pick PENCE-A and the ring moves to 400 m. TTB does not move; it is still time to the 36 m asset.

**Is this Unity?**
The design is Unity C# (`DroneTarget`, `SwarmManager`, `RadarSensor`, `EdgeComputer`, `TurretController`, `TacticalHUD`). This desktop simulator is the same architecture in a browser window.

**Where is the code?**
Start screen → View source. Copy one file, or Folders: download zip. Copy all is one concatenated blob.

---

## 9. Failure-mode demos (optional, +2 min)

- **Slew contest:** wait until two imminent rows sit at opposite sector edges. Narrate AUTO rotating through the gap.
- **Magazine starve:** watch the RDS counter and the in-flight cap; AUTO skips assigned tracks.
- **MANUAL miss:** fire off-align; round flies to the old lead.
- **Wrong gun:** switch to PENCE-A late in a wave — 120 rds/min cannot service the queue even with a 400 m envelope.
- **HN-12 ceiling:** a high fixed-wing can stay outside the 200 m sphere and still run the 36 m asset. TTB keeps counting down; AUTO stays OUT OF RANGE. Switch to CAKIR.
- **Hover-then-dive:** one kamikaze H01 (HV, cyan) comes from the north (in the 120° sector), parks at 280 m (TTB REC), climbs to ~420 m, then dives on the hull’s last ground position. Elevation is per effector (HN-12 −5°…+85°; CAKIR / PENCE-A −8°…+70°); white tint marks the zenith blind cone. **UGV HOLD** → blind spot → UGV HIT. **UGV MOVE** (30 km/h) can open the angle so the gun and radar can still see it.
- **Pause freeze-frame (Esc):** walk TTB vs distance on the table without the swarm moving.

---

## 10. Next demo (only if asked)

Parked items 3–5 (split-raid, hover-then-dive, Pd + coast + AUTO quality gate) live in `docs/40_delivery/405_todo_later.md` (DOC-405). AUTO stays the default.

1. Split-raid waves (two clusters at opposite sector edges, or beyond it — implies a trainable sector or a second radar; that trade-off is the conversation).
2. Threat classes — fast leaker, decoy, RF-silent.
3. Soft-kill cone — cheap area effector, fails on silent tracks.
4. Track quality — Pd, coast, false plots. Turns 10 Hz into a sensor.

Do not promise a fielded C-UAS. Promise a sharper operator loop.

---

## 11. Close line

> SEM DEFENDER is a desktop COUNTER-UAS FIRE CONTROL simulator: EDF on time to the 36 m asset, a 10 Hz track file from a 120-degree sector, quadratic lead, a 75-degree slew budget, an effector choice that moves the fire envelope, and an operator who can take the shot away from AUTO.
