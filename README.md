# SEM-Tech DEFENDER

Desktop COUNTER-UAS FIRE CONTROL simulator. Inbound UAS arrive in swarms and at different speeds. Each wave draws a mix of slower quads and faster fixed-wing aircraft. They do not hold one path: they change azimuth, altitude, and speed while they close, and the raid axis shifts from wave to wave. One northern contact hovers, climbs, and then dives.

The ground vehicle can move and fire at the same time. The operator console ranks the tracks by Earliest Deadline First (time to the 36 m asset), slews a turret at 75°/s onto a quadratic intercept, and fires AUTO or MANUAL inside the selected effector's envelope.

Three effectors are on the console. They differ in rate of fire and range. The red kill-zone ring follows the one you select. The console opens on Effector 3.

| Label | Rate | Range |
|---|---|---|
| Effector 1 | 1350 rds/min | 400 m |
| Effector 2 | 120 rds/min | 400 m |
| Effector 3 | 1000 rds/min | 200 m |

The ledger is an audit log, round by round. Every shot is its own row, with azimuth, elevation, range, and speed, and each round ends as a hit, a miss, or suppressed. Export is CSV or JSON.

The operator is the weapons-release authority. Detection, track, and identify are oracles; Decide and Engage are implemented. Simulated tracks only — not a fielded sensor.

Current runtime is a desktop browser window.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173

| Input | Action |
|---|---|
| Engage | Weapons free, wave 1 |
| M | AUTO ↔ MANUAL |
| A / D | Yaw (MANUAL) |
| W / S | Pitch (MANUAL) |
| Mouse | Point the barrel (MANUAL) |
| Space / click | Fire if aligned |
| Esc / P | Pause |

## Verify

```bash
npm test
npm run build
```

Walkthrough script: `docs/30_design/320_demo_blueprint.md`.
