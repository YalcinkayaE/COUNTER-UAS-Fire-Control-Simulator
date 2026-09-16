# SEM-Tech DEFENDER — Demo Blueprint

**Product:** SEM-Tech DEFENDER  
**Type:** Desktop COUNTER-UAS FIRE CONTROL simulator  
**Runtime:** 6 minutes seated, 12 minutes with Q&A  
**Audience:** C-UAS, C2, weapons, software  
**Classification:** Unclassified simulator — simulated tracks, not a fielded sensor

---

## 1. One-liner

A desktop COUNTER-UAS FIRE CONTROL simulator that ranks 20 inbound drones by **Earliest Deadline First**, slews a turret at **75°/s** onto a **quadratic intercept**, and fires AUTO or MANUAL before a **500 m** kill zone is breached.

Do not call it a tower-defense game. The operator is the **weapons-release authority**, not a builder.

---

## 2. What to claim / not claim

**Claim**
- Live EDF track file at 10 Hz
- Time-to-Breach = (range − 500 m) / radial closing speed
- Quadratic 3D lead for a constant-velocity target
- Hard slew budget (75°/s) and magazine (1.35 s cooldown, 4 in flight)
- AUTO vs MANUAL override on the same intercept solution

**Do not claim**
- Real radar DSP (no CFAR, no micro-Doppler, no missed detections)
- RF / Remote ID / EO classification
- Soft-kill, jamming, or interceptor-drone effectors
- Unity build — this simulator is React + Three.js with the same modules as the C# design

---

## 3. Pre-flight (30 s)

1. Load the console. Confirm title **SEM-Tech DEFENDER**.
2. Leave the camera as-is (facility at origin, green 1 km ring, red 500 m ring).
3. Optional: unmute.
4. Know the keys before you click Engage.

| Input | Action |
|---|---|
| Engage | Weapons free, wave 1 |
| M | AUTO ↔ MANUAL |
| A / D | Yaw (MANUAL) |
| W / S | Pitch (MANUAL) |
| Mouse | Point the barrel (MANUAL) |
| Space / click | Fire if aligned |
| Esc / P | Pause |

---

## 4. Beat sheet (6 minutes)

### Beat 0 — Briefing (0:00–0:45)

**Show:** Start card. Rings visible through the glass.

**Say:**
> Facility at the origin. Outer ring is the 1 000 m radar fence. Inner red ring is the 500 m kill zone. Twenty tracks spawn on the fence and close. If a track crosses 500 m we lose a life. Five lives, eight waves.

**Do not:** click Engage until the rings and the TTB formula are on screen.

### Beat 1 — EDF is the clock (0:45–1:30)

**Show:** Click **Engage**. Point at the **EDF QUEUE** (right) and **PPI SCOPE** (left).

**Say:**
> Detection is assumed. The interesting problem starts after the track file exists. Every 100 ms we recompute Time-to-Breach and sort lowest first. That is Earliest Deadline First — the same idea as “First” in air defense, but in radial time, not path progress.

**Gesture:** the top row (▸ Txx) is AUTO’s current shot. Red TTB < 8 s is imminent.

**Formula to read aloud:**
`TTB = (Distance − 500 m) / Radial Velocity`

Receding or hovering tracks go to infinity. Already inside 500 m is zero — too late.

### Beat 2 — Geometry, not DPS (1:30–2:30)

**Show:** Turret at origin. Sage lead octahedron on the predicted intercept. Tracers on fire.

**Say:**
> The gun does not aim at the drone. It solves a quadratic: projectile speed 240 m/s, target position and velocity. Earliest positive time of flight is the aim point. Slew is 75 degrees per second. Align gate is under a degree. If two hot tracks are 140 degrees apart, AUTO cannot cover both before TTB expires. That is the game.

**If a miss:** “Proximity fuse, 48 m. A miss is a spent round, not a retry.”

### Beat 3 — Magazine (2:30–3:15)

**Show:** Status strip — lives, score, K, LOCKED/SLEW, cooldown bar. Max 4 rounds in flight.

**Say:**
> 2026 C-UAS is a magazine problem. Cheap mass versus expensive interceptors. AUTO will not double-tap a track that already has a round in the air. The scarce resources are slew time, rounds, and your attention.

### Beat 4 — Override (3:15–4:15)

**Show:** Press **M**. Crosshair appears on the mathematical lead. Fire only when aligned.

**Say:**
> AUTO is the duty officer. MANUAL is you stealing a shot AUTO would waste — or holding fire. Real C2 is one operator supervising the scheduler, not painting every track by hand.

**Do:** slew onto a second-priority track, fire, switch back to AUTO.

### Beat 5 — Leak and reset (4:15–5:00)

**If a breach:** red burst, life −1, “Txx BREACHED KILL ZONE”.

**Say:**
> A leak is a defended-volume violation, not an HP bar. The sim is honest about the kill zone. Pause with Esc if you need to talk over a freeze-frame.

### Beat 6 — Close (5:00–6:00)

**Say:**
> What you saw is the Decide and Engage slice of the kill chain. Detect, Track, and Identify are oracles in this build. Next layers — if you want them — are split-axis raids, threat classes, track quality, and a soft-kill effector.

**Stop talking. Ask for questions.**

---

## 5. Architecture (map to the original C# prompts)

| Prompt | Module | Role in the demo |
|---|---|---|
| 1. Data + EDF | `DroneTarget` + `SwarmManager` | 20 drones on a 1 km ring, 10 Hz sort by TTB |
| 2. Kinematics | `TurretController` | Quadratic intercept, 75°/s `RotateTowards`, AUTO/MANUAL |
| 3. UI | `TacticalHUD` + PPI + LineRenderer analogues | Polar radar, EDF table, tracers, destroy on intercept |

Runtime here is **TypeScript + Three.js** so it plays in the browser. The math and loop are the Unity design.

---

## 6. Numbers (memorize these)

| Item | Value |
|---|---|
| Outer fence | 1 000 m |
| Kill zone | 500 m |
| Tracks / wave | 20 |
| Speed | 15–30 m/s + wave boost |
| Radar | 10 Hz |
| Slew | 75 °/s |
| Align | 0.85° |
| Projectile | 240 m/s |
| Fuse | 48 m |
| Cooldown | 1.35 s |
| In flight | 4 |
| Lives | 5 |
| Waves | 8 |

---

## 7. Talking points vs a fielded C-UAS

| Real kill chain | In this demo |
|---|---|
| Detect (radar/RF/EO) | Instant, certain tracks |
| Track (EKF / JPDA) | Perfect kinematics + weave |
| Identify | Every blip is hostile |
| Decide | **EDF TTB — implemented** |
| Engage | **Quadratic intercept + slew — implemented** |
| Assess | Hit / miss / breach |

Use that table if someone asks “where is the radar algorithm?” Answer: we skipped the sensor so we could demo **fire-control policy**. Sensor fog is a follow-on beat.

---

## 8. Likely questions

**Why 20 drones?**  
Saturation of one turret. EDF is trivial on one track; it is the policy you want when twenty deadlines compete.

**Why not just shoot nearest?**  
Nearest can be slow and far from breach. TTB is the deadline. A 900 m inbound at 30 m/s can beat a 520 m crawler.

**Can AUTO lose?**  
Yes. Slew + cooldown + 4-round cap. Wave speed ramps. That is the point of MANUAL.

**Is this Unity?**  
The design is Unity C# (`DroneTarget`, `SwarmManager`, `TurretController`, `TacticalHUD`). This desktop simulator is the same architecture in a browser window.

**Where is the code?**  
Start screen → View source. Copy one file, or Folders: download zip. Copy all is one concatenated blob.

---

## 9. Failure-mode demos (optional, +2 min)

- **Slew contest:** wait until two imminent rows sit on opposite bearings. Narrate AUTO rotating through the gap.
- **Magazine starve:** watch in-flight count; AUTO skips assigned tracks.
- **MANUAL miss:** fire off-align; round flies to the old lead.
- **Pause freeze-frame (Esc):** walk TTB vs distance on the table without the swarm moving.

---

## 10. Next demo (only if asked)

1. Split-raid waves (two clusters 180° apart) — AUTO fails, override is the skill test.
2. Threat classes — fast leaker, decoy, RF-silent.
3. Soft-kill cone — cheap area effector, fails on silent tracks.
4. Track quality — Pd, coast, false plots. Turns 10 Hz into a sensor.

Do not promise a fielded C-UAS. Promise a sharper operator loop.

---

## 11. Close line

> SEM-Tech DEFENDER is a desktop COUNTER-UAS FIRE CONTROL simulator: EDF on a 10 Hz track file, quadratic lead, a 75-degree slew budget, and an operator who can take the shot away from AUTO.
