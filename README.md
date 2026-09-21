# SEM-Tech DEFENDER

Desktop COUNTER-UAS FIRE CONTROL simulator. An operator console ranks inbound tracks by Earliest Deadline First (time to the 36 m asset), slews a turret at 75°/s onto a quadratic intercept, and fires AUTO or MANUAL inside the selected effector's envelope (200–400 m).

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

## Related prototype

`rubiks_cube/` is a separate APL-001 Rubik’s Cube solver prototype.

**Open in Cursor Cloud:** http://127.0.0.1:5173/rubik/  
(Requires `npm run dev` plus `python -m rubik.cli serve` in `rubiks_cube/`.)

See `rubiks_cube/README.md`.
