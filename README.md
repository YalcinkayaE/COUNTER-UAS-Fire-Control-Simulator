# SEM-Tech DEFENDER

Desktop COUNTER-UAS FIRE CONTROL simulator. An operator console ranks 20 inbound tracks by Earliest Deadline First, slews a turret at 75°/s onto a quadratic intercept, and fires AUTO or MANUAL before the selected effector's kill zone (200–400 m) is breached.

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

Walkthrough script: `SEM-Tech DEFENDER Demo Blueprint.md`.
