# SEM-Tech DEFENDER

Browser C-UAS fire-control prototype. An operator console ranks 20 inbound tracks by Earliest Deadline First, slews a turret at 75°/s onto a quadratic intercept, and fires AUTO or MANUAL before a 500 m kill zone is breached.

This is a seated demo, not a fielded sensor. Detection, track, and identify are oracles; Decide and Engage are implemented.

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
