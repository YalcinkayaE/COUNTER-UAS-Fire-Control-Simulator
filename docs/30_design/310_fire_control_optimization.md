---
document_id: DOC-310
title: Fire-control optimisation (EDF, max track set, quadratic intercept)
status: implemented
owner: unresolved
created: 2026-09-16
updated: 2026-09-17
applies_to: desktop simulator
authority: informative
supersedes: null
related:
  - DOC-320
---

# C-UAS fire-control mathematics

**SEM-Tech DEFENDER** desktop COUNTER-UAS FIRE CONTROL simulator.

Formulas use GitHub / KaTeX / MathJax notation: inline `$...$`, display on their own lines as `$$...$$`. Open this file in VS Code (Markdown Math), GitHub, Obsidian, Typora, or Quarto.

This note is the mathematics the simulator actually runs. It is for stakeholders who need to see that the fire order is a defined policy, not a visual heuristic. It is not a fielded radar DSP, not a mixed-integer programme, and not a claim about a production weapon.

Code: `src/sims/math.ts`, `src/sims/radarSensor.ts`, `src/sims/edgeComputer.ts`, `src/sims/turretController.ts`, `src/sims/constants.ts`.

---

## 0. What is being optimised

The effector is a **single** UGV gun. At each decision instant it can aim at one intercept point. The question is: **which track, from those the sensor is allowed to hold, should receive the next burst?**

The online policy is Earliest Deadline First (EDF) on Time-to-Breach (TTB), evaluated on a **maximum admissible track set**. That set is the subject of Section 1.

Two radii must not be collapsed:

| Name | Geometry | Role |
|---|---|---|
| Envelope / kill zone | sphere, selected effector range (HN-12 200 m; CAKIR / PENCE-A 400 m) | AUTO fire gate; red ring; BREACH alarm |
| Asset | horizontal cylinder, 36 m | Loss of a life (`collectImpacts`); EDF deadline |

---

## 1. The maximum admissible track set $T_{\max}$

### What it is

Let $U$ be the live objects in the battlespace (truth). Each wave draws 8–16 quads and 2–3 fixed-wing (pool 16 + 3). The UGV radar is modelled as an Echodyne-class AESA with a hard simultaneous-track budget

$$
N_{\max} = 20
$$

The **maximum admissible track set** is the largest set of live objects the fire-control loop is allowed to see:

$$
T_{\max} \subset U, \qquad |T_{\max}| \le N_{\max}
$$

Admission is not “nearest $N_{\max}$”. It is the $N_{\max}$ objects with the smallest Time-to-Breach (defined in Section 2). Equivalently: take the $N_{\max}$ smallest $T_{\mathrm{breach}}$ values.

$$
T_{\max} = \arg\min_{\,S \subset U,\; |S| \le N_{\max}} \sum_{i \in S} T_{\mathrm{breach},i}
$$

Ties break on radar range. Receding objects have $T_{\mathrm{breach}} = +\infty$ and fall out of the set unless fewer than 20 inbound tracks exist.

The edge computer **only** ranks, intercepts, and issues a fire call on $T_{\max}$. Objects outside $T_{\max}$ do not exist for Decide/Engage until a later 10 Hz epoch.

### Why a maximum set (not “use every drone”)

1. **Sensor budget.** The AESA is specified at 20 simultaneous tracks. Fire control is defined on what the sensor can hold.

2. **Single effector.** One barrel, one aim point, 0.5 s burst. The useful decision is “who is next”.

3. **Edge timing.** Azimuth, elevation, range and velocity arrive at 10 Hz. A hard cap keeps the 10 Hz loop bounded.

4. **Deadline, not proximity.** If the cap were “20 nearest”, a 2 km fixed-wing would often be dropped because it is farther than the 1 km quads. That object can still be the first to the 36 m asset. Selecting the max set by TTB keeps the budget aligned with the objective: delay or prevent an asset overflight.

Worked numbers (same formula the code uses):

$$
T_{\mathrm{breach}} = \frac{\rho - 36\,\mathrm{m}}{v_{\rho}}
$$

| Track | Horizontal range $\rho$ | Closing $v_{\rho}$ | $T_{\mathrm{breach}}$ |
|---|---|---|---|
| Quad, 1 km, 25 m/s inbound | 1000 m | 25 m/s | **38.6 s** |
| Fixed-wing, 2 km, 80 m/s inbound | 2000 m | 80 m/s | **24.6 s** |

The farther aircraft is the earlier deadline.

---

## 2. Time-to-Breach and EDF

Coordinates: origin at the defended point. $+Z$ is north, $+X$ is east.

**Horizontal range**

$$
\rho_i = \sqrt{P_{i,x}^{2} + P_{i,z}^{2}}
$$

**Horizontal closing speed** (positive inbound)

$$
v_{\rho,i} = -\frac{P_{i,x} V_{i,x} + P_{i,z} V_{i,z}}{\rho_i}
$$

**Time-to-Breach** (asset cylinder 36 m)

$$
T_{\mathrm{breach},i} =
\begin{cases}
0 & \text{if } \rho_i \le 36 \\[4pt]
+\infty & \text{if } v_{\rho,i} \le 0 \\[4pt]
\dfrac{\rho_i - 36}{v_{\rho,i}} & \text{otherwise}
\end{cases}
$$

TTB does **not** use the selected effector's range. Switching CAKIR / HN-12 / PENCE-A moves the fire envelope and the BREACH alarm; it does not re-sort the EDF queue.

A 3D sphere at the gun range is the wrong deadline: quads can climb to 231 m and fixed-wing to 266 m. Above 200 m they never enter the HN-12 sphere, 3D TTB grows as they pass overhead, and they can still hit the asset. Horizontal TTB keeps counting down.

EDF on the max set:

$$
i^{\star} = \arg\min_{i \in T_{\max}} T_{\mathrm{breach},i}
$$

That $i^{\star}$ is the fire-call candidate. AUTO then applies commitment and the in-time gate (Section 5). MANUAL withholds the engage bit and leaves weapons release with the operator, on the same intercept solution.

This is a greedy online policy for a single machine with deadlines. It is not a batch schedule over the whole raid.

---

## 3. Radar measurements (10 Hz)

Each admitted track is published as an Echodyne-class report, simulated from kinematics (not RF processing):

| Symbol | Quantity | Definition in the sim |
|---|---|---|
| $\psi_i$ | Azimuth | From north, clockwise toward east: $\psi = \mathrm{atan2}(x,z)$ |
| $\varepsilon_i$ | Elevation | Above the ground plane: $\varepsilon = \mathrm{atan2}(\Delta y,\sqrt{\Delta x^{2}+\Delta z^{2}})$ |
| $R_i$ | Range | Distance from the UGV radar mast at $(0,16,0)$ m |
| $\mathbf{V}_i$ | Velocity | Cartesian velocity (speed in a given direction) |

Coverage is a 120° az × 80° el staring sector on a north boresight. Reports carry ±1° az / ±1.5° el angular noise.

The edge computer reconstructs Cartesian position from $(\psi, \varepsilon, R)$ and coasts that state between 10 Hz scans. Intercept and TTB are computed from the reconstructed (or coasted) state, not from raw truth, so Decide/Engage is radar-fed.

---

## 4. Quadratic intercept

Gun position $\mathbf{S}$ (muzzle, near $(0,14,0)$ m). Projectile speed

$$
v_p = 2000\,\mathrm{m/s}
\qquad (1\,\mathrm{km\ in\ } 0.5\,\mathrm{s})
$$

Relative geometry $\boldsymbol{\Delta} = \mathbf{P}_{i^{\star}} - \mathbf{S}$. Constant-velocity intercept:

$$
\|\boldsymbol{\Delta} + \mathbf{V}_{i^{\star}}\, t\| = v_p\, t
$$

which expands to the quadratic used in code:

$$
\bigl(\|\mathbf{V}\|^{2} - v_p^{2}\bigr) t^{2}
+ 2\,(\boldsymbol{\Delta}\cdot\mathbf{V})\, t
+ \|\boldsymbol{\Delta}\|^{2}
= 0
$$

Take the smallest $t > 0$ that is finite and at most 30 s. The aim point is

$$
\mathbf{P}_{\mathrm{aim}} = \mathbf{P}_{i^{\star}} + \mathbf{V}_{i^{\star}}\, t_{\mathrm{int}}
$$

If no positive root exists, there is no fire call for that track.

AUTO will not engage unless $\|\mathbf{P}_{\mathrm{aim}} - \mathbf{S}\|$ is inside the selected effector's range (the envelope). The turret may still slew toward an out-of-range intercept.

---

## 5. Slew, burst, commitment, and the fire gate

Turret slew rate

$$
\omega = 75^{\circ}/\mathrm{s}
$$

Alignment tolerance $0.85^{\circ}$. Time to swing onto the aim point from the current barrel direction $\hat{b}$:

$$
T_{\mathrm{slew}} = \frac{\angle(\hat{b},\; \mathbf{P}_{\mathrm{aim}} - \mathbf{S})}{\omega}
$$

Gun cycle: 0.5 s burst at the selected effector's rate, then 0.5 s recovery. In-burst spacing is $60/\mathrm{rpm}$.

**In-time gate (implemented):** skip a candidate when

$$
T_{\mathrm{slew}} + t_{\mathrm{int}} \ge T_{\mathrm{breach},i}
$$

unless $T_{\mathrm{breach},i} = 0$ (already over the asset — last chance). Receding tracks ($T_{\mathrm{breach}} = +\infty$) are not feasible. If every candidate fails the gate, the EDF head is still published so the turret can slew; `autoEngage` stays false.

**Commitment (implemented):** stay on the current fire-call track across bursts unless it leaves the track file, becomes infeasible, or another feasible track's TTB is at least **1.5 s** earlier. That stops the queue flipping every recovery interval while several tracks sit at similar deadlines.

**Wave-clear:** leftover burst state and in-flight rounds are aborted. Rounds resolve as INTERCEPT / SUPPRESSED so a reused track ID on the next wave cannot inherit a MISS.

**Implemented fire gate (AUTO):** intercept exists, track is the committed/feasible call, intercept is inside the envelope, barrel is inside $0.85^{\circ}$, burst/recovery allow a round.

**Implemented fire gate (MANUAL):** same intercept, but the operator must hold fire.

Proximity fuse 48 m. Aligned AUTO still hits inside that bubble; the fuse is larger than typical closest-approach on a committed shot, so lead geometry is not the thing that makes AUTO lose.

---

## 6. What this is, and what it is not

| This document / this sim | Not this |
|---|---|
| Online EDF on a TTB-selected max set of 20 | A MILP/CPLEX batch raid plan |
| Simulated 10 Hz az/el/range/velocity | Fielded Echodyne DSP |
| Quadratic lead for one kinetic gun | Soft-kill, multi-effector assignment |
| Greedy “who is next” plus stickiness | Optimal assignment of all bursts over the whole raid |

The value for stakeholders is that the visible queue (AZ, EL, RNG, V, TTB) is this model: admit at most 20 by time to the asset, fire the committed feasible minimum deadline, lead with the quadratic, and only shoot inside the gun envelope. A 2 km fixed-wing can be first because $T_{\mathrm{breach}}$ said so, not because the picture looked urgent.

---

## 7. Constants (as coded)

| Name | Value |
|---|---|
| Asset / TTB deadline | 36 m horizontal cylinder |
| Envelope / kill zone | 200 m HN-12; 400 m CAKIR, PENCE-A |
| Inner fence | 1000 m |
| Detection fence / PPI scale | 2000 m |
| Radar rate | 10 Hz |
| Max tracks $N_{\max}$ | 20 |
| Truth objects / wave | 8–16 quads + 2–3 fixed-wing |
| Slew $\omega$ | 75°/s |
| Align | 0.85° |
| $v_p$ | 2000 m/s |
| Burst | 0.5 s at the effector's rate, then 0.5 s recovery |
| Commitment hysteresis | 1.5 s |
| Fuse | 48 m |
| Quad speed | 12–38 m/s |
| Fixed-wing speed | 72–96 m/s |
| Path change (alt, azimuth, speed) | up to 40% of spawn values |
