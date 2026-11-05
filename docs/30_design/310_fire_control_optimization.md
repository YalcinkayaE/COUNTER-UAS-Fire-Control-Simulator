---
document_id: DOC-310
title: Fire-control mathematics (math.ts)
status: implemented
owner: unresolved
created: 2026-09-16
updated: 2026-09-21
applies_to: desktop simulator
authority: informative
supersedes:
related:
  - DOC-320
  - DOC-405
---

# Fire-control mathematics

**SEM-Tech DEFENDER** — desktop COUNTER-UAS FIRE CONTROL simulator.

This note explains the mathematics behind the operator console: how tracks are ranked, how the gun aims, and when AUTO can or cannot save a track. Part A is for stakeholder reading. Part B is the technical reference that matches `src/sims/math.ts`.

It is **not** a fielded radar DSP, not a mixed-integer raid planner, and not a full optimal-control solver.

Code: `src/sims/math.ts` (and callers in `radarSensor.ts`, `edgeComputer.ts`, `turretController.ts`, `constants.ts`). Demo talk track: DOC-320.

---

# Part A — For stakeholders

## What the maths is deciding

The vehicle carries **one** gun. At any moment it can aim at **one** intercept point. The live question is:

> Among the tracks the sensor is allowed to hold, which one should receive the next burst?

The answer used here is **Earliest Deadline First (EDF)** on **Time-to-Breach (TTB)** — who runs out of time first against the defended hull, not who is nearest on the map.

A second, smaller control is **UGV MOVE**: when an overhead kamikaze sits above the gun’s elevation limit, the hull can drive to open ground range so the turret and radar can see it again.

## Two distances that must not be mixed

| Name | What it is | What it drives on the console |
|---|---|---|
| **Asset** | 36 m horizontal cylinder around the hull | The **TTB / EDF** deadline. One IMPACT here is **UGV HIT** and the run stops. |
| **Kill zone / envelope** | Selected effector range (HN-12 **200 m**; CAKIR / PENCE-A **400 m**) | The red ring, the AUTO fire gate, and the **BREACH** alarm. |

Switching effector moves the red ring. It does **not** re-sort the EDF table — TTB is still time to the 36 m asset.

## The decision loop in plain language

1. **Track** — radar reports position and velocity for up to 20 contacts in a 120° × 80° north-facing sector (10 times per second).
2. **TTB** — for each contact, estimate seconds until it reaches the 36 m asset cylinder on the ground plane (receding or hovering → “REC”; already inside → “NOW”).
3. **EDF sort** — rank by earliest TTB. The top row is the next deadline, not necessarily the closest drone.
4. **Lead aim** — do not aim at where the drone is; solve where it will be when a 2 000 m/s round arrives.
5. **Slew** — the turret turns at 75°/s onto that aim point.
6. **Fire or LATE** — if turn time plus flight time already exceeds TTB, AUTO cannot save that track (**LATE**). Rounds already in the air show as **ENGAGED**; an assigned fire call waiting to shoot shows as **HOLD**.

## Why “nearest” is the wrong policy

A slow quad at 1 km can look urgent on a range display and still have more time than a fast fixed-wing at 2 km.

| Track | Ground range | Closing speed | TTB |
|---|---|---|---|
| Quad | 1 km | 25 m/s | **≈ 38.6 s** |
| Fixed-wing | 2 km | 80 m/s | **≈ 24.6 s** |

The farther aircraft is the earlier deadline. That is what the EDF column is showing.

## What to watch in a live demo

- Top EDF row (▸) is AUTO’s current shot; red TTB under ~8 s is imminent.
- **SLEW vs TTB:** if slew plus time of flight is larger than TTB, the row is **LATE**.
- Switch CAKIR / HN-12 / PENCE-A and watch the red ring move — that is the fire envelope, not the asset deadline.
- **UGV HOLD** vs **UGV MOVE** on the overhead kamikaze (H01): HOLD can leave a zenith blind cone and end in UGV HIT; MOVE at 30 km/h can open the angle so gun and radar regain the track.

## This is / this is not

| This simulator | Not this |
|---|---|
| Online fire-control policy for one gun | A fielded C-UAS product claim |
| EDF on time-to-asset | “Shoot the nearest drone” |
| Modelled radar coverage and angular noise | Real Echodyne DSP / CFAR / micro-Doppler |
| Constant-speed lead aim from the last scan | Full moving-shooter ballistics with wind and drop |
| Simple hull evade when elevation is too steep | A full game-theoretic optimal planner |

---

# Part B — Technical reference (`math.ts`)

Formulas use GitHub / KaTeX notation. Callers pass the hull position $\mathbf{U}$; `math.ts` itself does not encode UGV, H01, or a specific elevation limit.

## B.1 Map of exports

| Function | What it computes |
|---|---|
| `hypot3`, `dist3`, `clamp`, `lerp`, `wrapTwoPi` | Euclidean helpers |
| `radialClosingSpeed` | 3D closing toward **world origin** (legacy; EDF does not use this) |
| `horizontalRange` / `horizontalClosingSpeed` | Ground range / closing toward **world origin** |
| `horizontalRangeFrom` / `horizontalClosingFrom` | Ground range / closing toward a **possibly moving** defended point $\mathbf{U},U'$ |
| `timeToBreach` | $(\rho - 36)/v_\rho$; 0 if $\rho\le 36$; $+\infty$ if not closing |
| `solveIntercept` | Constant-$V$ quadratic lead; frozen muzzle |
| `angleBetween` | Unsigned angle between unit directions (slew time) |
| `azimuthFromNorth` | $\psi=\mathrm{atan2}(x,z)$; 0 = north ($+Z$), $+90^\circ$ = east ($+X$) |
| `elevationFromGround` | $\varepsilon=\mathrm{atan2}(\Delta y,\sqrt{\Delta x^2+\Delta z^2})$; $+\pi/2$ = zenith |
| `elevationFromHorizontal` | $\varepsilon=\mathrm{atan2}(h,\rho)$ |
| `minHorizForElevation` | $\rho_{\min}=h/\tan\varepsilon_{\max}$ |
| `elevationSwitch` | $\sigma=\rho_{\min}-\rho$; $\sigma>0$ means too high in elevation |
| `evadeHeadingAway` | Heading of $-\hat{\rho}$ on the ground (bang-bang direction) |
| `sphericalToCartesian` | Reconstruct $(x,y,z)$ from az, el, range about a radar origin |
| `trackAssignment` | HUD gate: ENGAGED / HOLD / LATE |
| `formatTtb`, `formatSlew`, `formatDist`, `formatBearingDeg`, `formatElevDeg` | Display only |

## B.2 Time-to-Breach and EDF

Coordinates: $+Z$ north, $+X$ east. The defended point is the UGV ground position $\mathbf{U}=(U_x,0,U_z)$, not a fixed world origin.

**Horizontal range** (`horizontalRangeFrom`)

$$
\rho = \sqrt{(P_x-U_x)^2+(P_z-U_z)^2}
$$

**Horizontal closing** (`horizontalClosingFrom`), positive inbound, including hull velocity $U'$

$$
v_{\rho} = -\frac{(P_x-U_x)(V_x-U'_x)+(P_z-U_z)(V_z-U'_z)}{\rho}
$$

**Time-to-Breach** (`timeToBreach`; deadline radius = 36 m)

$$
T_{\mathrm{breach}} =
\begin{cases}
0 & \text{if } \rho \le 36 \\[4pt]
+\infty & \text{if } v_{\rho} \le 0 \\[4pt]
(\rho - 36)/v_{\rho} & \text{otherwise}
\end{cases}
$$

Hovering kamikaze: $v_{\rho}=0$ $\Rightarrow$ TTB $=+\infty$ (HUD **REC**). Inside the 36 m cylinder: TTB $=0$ (HUD **NOW**).

TTB does **not** use the selected effector's range.

EDF on the max track set $T_{\max}$:

$$
i^{\star} = \arg\min_{i \in T_{\max}} T_{\mathrm{breach},i}
$$

That is greedy “who is next”, not a batch raid plan. Worked numbers match Part A.

## B.3 Maximum admissible track set $T_{\max}$

Truth $U$ per wave: 8–16 quads + 2–3 fixed-wing + one independent kamikaze **H01** (pool 16 + 3 + 1). Radar is a **120° × 80°** north stare, **20 tracks**, 10 Hz, kinematic reports (not DSP).

$$
T_{\max} \subset U,\qquad |T_{\max}|\le 20
$$

Admission is the 20 smallest TTBs among objects **in the sector**. Receding / hovering tracks have $T_{\mathrm{breach}}=+\infty$ and fall out unless fewer than 20 inbound exist. A kamikaze **outside ±60° of north** is never reported.

## B.4 Quadratic intercept (`solveIntercept`)

Muzzle $\mathbf{S}$ (current UGV pose, $y=14$ m). $v_p=2000$ m/s.

$$
\|\boldsymbol{\Delta}+\mathbf{V}t\|=v_p t,\qquad \boldsymbol{\Delta}=\mathbf{P}-\mathbf{S}
$$

$$
\bigl(\|\mathbf{V}\|^{2}-v_p^{2}\bigr)t^{2}+2(\boldsymbol{\Delta}\cdot\mathbf{V})t+\|\boldsymbol{\Delta}\|^{2}=0
$$

Earliest $t>0$ and $t\le 30$ s. Aim point $\mathbf{P}+\mathbf{V}t$.

The quadratic treats the gun as **frozen** at the current $\mathbf{S}$ for that round. Hull velocity $U'$ is in TTB, not in this intercept. At 30 km/h and $t\sim 0.2$ s the hull moves about 1.7 m, compared with the modelled 48 m fuse radius. AUTO will not fire unless $\|\mathbf{P}_{\mathrm{aim}}-\mathbf{S}\|$ is inside the selected envelope.

## B.5 Slew, assignment, fire gate

Slew $75^\circ$/s. $T_{\mathrm{slew}}=\angle(\hat{b},\mathbf{P}_{\mathrm{aim}}-\mathbf{S})/\omega$ (`angleBetween` / `TURRET_SLEW_RAD`).

In-time: skip if $T_{\mathrm{slew}}+t_{\mathrm{int}}\ge T_{\mathrm{breach}}$ unless TTB is already 0. HUD **LATE** is `trackAssignment` when that geometry fails and no round is in the air.

**ENGAGED** = rounds in flight to that id. **HOLD** = assigned fire call, not yet firing. Burst 0.5 s then 0.5 s recovery. Fuse 48 m.

Gun elevation is clamped in `turretController` (not `math.ts`) per effector: HN-12 **−5°…+85°**; CAKIR **−15°…+70°**; PENCE-A placeholder **−8°…+70°**. Look-at $y$ is rewritten as $y_S+ \rho\tan\varepsilon_{\mathrm{clamp}}$. A 90° (zenith) target cannot be followed.

## B.6 Elevation window and bang-bang hull evade

These four functions are the **Hamiltonian example** in `math.ts`. They are a reduced Pontryagin condition for a speed-limited hull, not $H=T+V$ mechanics and not a costate ODE.

Elevation from height above the muzzle and ground range (`elevationFromHorizontal`):

$$
\varepsilon = \mathrm{atan2}(h,\rho)
$$

Zenith is $\varepsilon=\pi/2$ when $\rho=0$.

To keep $\varepsilon\le\varepsilon_{\max}$ (per effector: HN-12 85°, CAKIR / PENCE-A 70° max; radar 80°):

$$
\rho_{\min} = \frac{h}{\tan\varepsilon_{\max}}
\qquad\texttt{minHorizForElevation}
$$

Worked: $h=406$ m (420 m AGL − 14 m muzzle), $\varepsilon_{\max}=70^\circ$ $\Rightarrow$ $\rho_{\min}\approx 148$ m. Under HN-12 ($85^\circ$) the same height needs only $\rho_{\min}\approx 36$ m.

Switching function (`elevationSwitch`):

$$
\sigma = \rho_{\min} - \rho
$$

- $\sigma>0$: target too high in elevation; PMP for $|u|\le v_{\mathrm{ugv}}$ says run **away** at $v_{\max}$.
- $\sigma<0$: already in the elevation window.

Bang-bang heading (`evadeHeadingAway`): unit ground direction $-\hat{\rho}$ (increase $\rho$).

**UGV HOLD:** $u=0$. H01 climbs then dives on the hull’s last ground point. Elevation goes toward 90°. The selected effector’s elevation max leaves a zenith blind cone. One overflight of the 36 m cylinder is **UGV HIT**; the run stops.

**UGV MOVE:** $v_{\mathrm{ugv}}=30$ km/h $= 30/3.6$ m/s. While H01 is in climb/dive and $\sigma>0$ for the selected $\varepsilon_{\max}$, heading is `evadeHeadingAway`. Otherwise heading is 90° off the fire-call azimuth. H01 does not chase the hull after commit; it dives on the frozen ground aim. Opening $\rho$ can bring $\varepsilon$ back into the radar and gun windows.

This is **not** a full Hamiltonian. There is no adjoint $\lambda(t)$, no $H=\lambda^\top f-L$, and no differential game. The four functions above are the closed-form switch for that one bounded-speed problem.

## B.7 Radar measurements (10 Hz)

Kinematic reports, not RF:

| Symbol | Quantity | `math.ts` |
|---|---|---|
| $\psi$ | Azimuth from north | `azimuthFromNorth` |
| $\varepsilon$ | Elevation above ground | `elevationFromGround` |
| $R$ | Range from the mast | `hypot3` about radar origin |
| Reconstruction | az, el, $R$ $\to$ Cartesian | `sphericalToCartesian` |

Sector: 120° az × 80° el, north boresight. Noise: ±1° az / ±1.5° el. Velocity on the report is truth. Edge coasts between scans.

## B.8 Scope boundary (technical)

| In `math.ts` / this sim | Not this |
|---|---|
| EDF on TTB to the 36 m cylinder | MILP raid plan |
| 10 Hz kinematic az/el/range/$V$ | Fielded Echodyne DSP |
| Frozen-muzzle quadratic lead | Moving-shooter intercept with $S(t)=S_0+U't$ |
| Bang-bang $\sigma$ / evade heading | Full Pontryagin or Isaacs game |
| One IMPACT = UGV HIT | Five-life game scoring |

## B.9 Constants (as coded)

| Name | Value |
|---|---|
| Asset / TTB deadline | 36 m horizontal cylinder |
| Envelope / kill zone | 200 m HN-12; 400 m CAKIR, PENCE-A |
| Inner fence | 1000 m |
| Detection fence / PPI | 2000 m |
| Radar | 10 Hz, 20 tracks, 120° × 80° |
| Truth / wave | 8–16 quads + 2–3 fixed-wing + H01 |
| Slew | 75°/s |
| Align | 0.85° |
| Gun elevation | Per effector: HN-12 −5°…**85°**; CAKIR −15°…**70°**; PENCE-A placeholder −8°…**70°** |
| $v_p$ | 2000 m/s |
| Burst | 0.5 s at effector rpm, then 0.5 s recovery |
| Fuse | 48 m |
| UGV MOVE | **30 km/h**; HOLD is stationary |
| H01 | North ingress, hover 280 m, climb ~420 m, dive on committed ground point |
