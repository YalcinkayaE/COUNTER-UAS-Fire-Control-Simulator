---
document_id: DOC-310
title: Fire-control optimisation (EDF, max track set, quadratic intercept)
status: implemented
owner: unresolved
created: 2026-09-16
updated: 2026-09-16
applies_to: desktop simulator
authority: informative
supersedes: null
related: []
---

# C-UAS fire-control mathematics

**KANGAL / SEM-Tech DEFENDER** desktop COUNTER-UAS FIRE CONTROL simulator.

Formulas use GitHub / KaTeX / MathJax notation: inline `$...$`, display on their own lines as `$$...$$`. Open this file in VS Code (Markdown Math), GitHub, Obsidian, Typora, or Quarto.

This note is the mathematics the simulator actually runs. It is for stakeholders who need to see that the fire order is a defined policy, not a visual heuristic. It is not a fielded radar DSP, not a mixed-integer programme, and not a claim about a production weapon.

Code: `src/game/math.ts`, `src/game/radarSensor.ts`, `src/game/edgeComputer.ts`, `src/game/turretController.ts`, `src/game/constants.ts`.

---

## 0. What is being optimised

The effector is a **single** UGV gun. At each decision instant it can aim at one intercept point. The question is: **which track, from those the sensor is allowed to hold, should receive the next burst?**

The online policy is Earliest Deadline First (EDF) on Time-to-Breach (TTB), evaluated on a **maximum admissible track set**. That set is the subject of Section 1.

---

## 1. The maximum admissible track set $T_{\max}$

### What it is

Let $U$ be the live objects in the battlespace (truth). In the current scenario:

| Class | Count | Typical range | Typical speed |
|---|---|---|---|
| Quadcopter | 20 | 1 km, northwest | 12–38 m/s |
| Small fixed-wing | 2 | 2 km, east | 72–96 m/s |
| Truth population $\|U\|$ | 22 | | |

The UGV radar is modelled as an Echodyne-class AESA with a hard simultaneous-track budget

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

Ties break on range. Receding objects have $T_{\mathrm{breach}} = +\infty$ and fall out of the set unless fewer than 20 inbound tracks exist.

The edge computer **only** ranks, intercepts, and issues a fire call on $T_{\max}$. Objects outside $T_{\max}$ do not exist for Decide/Engage until a later 10 Hz epoch.

### Why a maximum set (not “use every drone”)

1. **Sensor budget.** The AESA is specified at 20 simultaneous tracks. Fire control is defined on what the sensor can hold. Optimising over omniscient truth would describe a different system than the one on the vehicle.

2. **Single effector.** One barrel, one aim point, 0.5 s burst. The useful decision is “who is next”, not “engage all 22 at once”. Bounding the input set to $N_{\max}$ matches that resource.

3. **Edge timing.** Azimuth, elevation, range and velocity arrive at 10 Hz. Each track needs a TTB evaluation and the selected track needs a quadratic intercept. A hard cap keeps the 10 Hz loop bounded.

4. **Deadline, not proximity.** If the cap were “20 nearest”, a 2 km fixed-wing would often be dropped because it is farther than the 1 km quads. That object can still be the first to the 500 m kill zone. Selecting the max set by TTB keeps the budget aligned with the objective: delay or prevent kill-zone breach.

Worked numbers (same formula the code uses):

$$
T_{\mathrm{breach}} = \frac{r - 500\,\mathrm{m}}{v_r}
$$

| Track | Range r | Closing speed $v_r$ | $T_{\mathrm{breach}}$ |
|---|---|---|---|
| Quad, 1 km, 25 m/s inbound | 1000 m | 25 m/s | **20.0 s** |
| Fixed-wing, 2 km, 80 m/s inbound | 2000 m | 80 m/s | **18.75 s** |

The farther aircraft is the earlier deadline. Under a range cap it would lose its radar slot. Under the TTB max set it is admitted and can be first in the EDF queue. That is why the two eastbound fixed-wing tracks are allowed to outrank closer, slower quads.

---

## 2. Time-to-Breach and EDF

Coordinates: origin at the defended point. $+Z$ is north, $+X$ is east. The kill zone is a cylinder of radius

$$
R_{\mathrm{kz}} = 500\,\mathrm{m}
$$

The 1 km ring is the inner fence; the 2 km ring is the detection fence.

For track $i$ with position $\mathbf{P}_i$ and velocity $\mathbf{V}_i$:

**Radial distance**

$$
r_i = \|\mathbf{P}_i\|
$$

**Closing speed** (positive inbound)

$$
v_{r,i} = -\frac{\mathbf{P}_i \cdot \mathbf{V}_i}{r_i}
$$

If the object is receding or hovering, $v_{r,i} \le 0$.

**Time-to-Breach** (kill zone 500 m)

$$
T_{\mathrm{breach},i} =
\begin{cases}
0 & \text{if } r_i \le 500 \\[4pt]
+\infty & \text{if } v_{r,i} \le 0 \\[4pt]
\dfrac{r_i - 500}{v_{r,i}} & \text{otherwise}
\end{cases}
$$

Inside 500 m the track stays shootable (`TTB = NOW`). The gun keeps firing until a kill or the asset (horizontal radius 36 m).

EDF on the max set:

$$
i^{\star} = \arg\min_{i \in T_{\max}} T_{\mathrm{breach},i}
$$

That $i^{\star}$ is the fire-call target. AUTO slews and fires on it. MANUAL withholds the engage bit and leaves weapons release with the operator, on the same intercept solution.

When several tracks have $T_{\mathrm{breach}} = 0$, the tie-break is range: shoot the one closest to the asset first.

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

If no positive root exists, there is no fire call for that epoch.

---

## 5. Slew, burst, and the fire gate

Turret slew rate

$$
\omega = 75^{\circ}/\mathrm{s}
$$

Alignment tolerance $0.85^{\circ}$. Time to swing onto the aim point from the current barrel direction $\hat{b}$:

$$
T_{\mathrm{slew}} = \frac{\angle(\hat{b},\; \mathbf{P}_{\mathrm{aim}} - \mathbf{S})}{\omega}
$$

Gun cycle: 1000 rounds/min, **0.5 s** burst, then 0.5 s recovery. In-burst spacing is $60/1000 = 0.06\,\mathrm{s}$.

**Implemented fire gate (AUTO):** intercept exists, track is $i^{\star}$, barrel is inside $0.85^{\circ}$, burst/recovery allow a round.

**Implemented fire gate (MANUAL):** same intercept, but the operator must hold fire. That is the weapons-release bypass.

A geometric feasibility test used in scheduling theory is

$$
T_{\mathrm{slew}} + t_{\mathrm{int}} < T_{\mathrm{breach},i^{\star}}
$$

The simulator **does not** currently skip $i^{\star}$ when this inequality fails. It still aims at the EDF head. The inequality is the right next tightening if the gun cannot physically catch the hottest track before the 500 m ring.

---

## 6. What this is, and what it is not

| This document / this sim | Not this |
|---|---|
| Online EDF on a TTB-selected max set of 20 | A MILP/CPLEX batch raid plan |
| Simulated 10 Hz az/el/range/velocity | Fielded Echodyne DSP |
| Quadratic lead for one kinetic gun | Soft-kill, multi-effector assignment |
| Greedy “who is next” | Optimal assignment of all bursts over the whole raid |

The value for stakeholders is that the visible queue (AZ, EL, RNG, V, TTB) is exactly this model: admit at most 20 by deadline, fire the minimum deadline, lead with the quadratic. A 2 km fixed-wing can be first because $T_{\mathrm{breach}}$ said so, not because the picture looked urgent.

---

## 7. Constants (as coded)

| Name | Value |
|---|---|
| Kill zone $R_{\mathrm{kz}}$ | 500 m |
| Inner fence | 1000 m |
| Detection fence / PPI scale | 2000 m |
| Radar rate | 10 Hz |
| Max tracks $N_{\max}$ | 20 |
| Truth objects | 20 quads + 2 fixed-wing |
| Slew $\omega$ | 75°/s |
| Align | 0.85° |
| $v_p$ | 2000 m/s |
| Burst | 0.5 s at 1000 r/min |
| Quad speed | 12–38 m/s |
| Fixed-wing speed | 72–96 m/s |
| Path change (alt, azimuth, speed) | up to 40% of spawn values |
