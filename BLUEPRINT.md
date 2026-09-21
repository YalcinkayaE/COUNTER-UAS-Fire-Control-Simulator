# Rubik’s Cube Prototype Solver Blueprint
Version: 1.1
Created: 2026-09-21
Last Updated: 2026-09-21
Case: APL-001
Status: design specification, not an implemented or benchmarked solver

## 1. Outcome and boundary
Build a deterministic software solver for an ordinary 3×3×3 cube. Accept a complete, validated state; find a move sequence; independently replay it; show moves and their verified result. Provide fast solving first and optional shortest-path search second.

The supplied illustration shows only three faces. It does not provide a verified complete state. Do not invent hidden stickers or claim a solution for that image. It also does not establish physical legality. Treat its small coloured graph as a conceptual illustration: no state labels or move labels establish an actual cube-state graph.

Out of scope: robotic actuation, whole-graph construction, recreating the 2010 proof, supercubes with oriented centres, larger cubes, and guaranteed real-time optimal solving.

## 2. Mathematical contract
Use a fixed centre-relative reference frame. Let a node be a legal cube state and an edge be one allowed face move. Solve by finding a path to the canonical solved state; shortest-path optimisation is optional.

Use half-turn metric (HTM): U, U', U2, R, R', R2, F, F', F2, D, D', D2, L, L', L2, B, B', B2 each cost one. Clockwise is viewed directly at the named face. Whole-cube reorientation is input normalisation, not a solving move.

The legal-state count is:
N = 8! × 3^7 × 12! × 2^11 / 2 = 43,252,003,274,489,856,000.
Corner twists sum to zero modulo 3; edge flips sum to zero modulo 2; corner and edge permutation parity must match. These constraints explain the reductions from arbitrary piece permutations and orientations.

Never store the full graph. Generate successors from move tables only when needed. Even one byte per legal state requires about 43.25 exabytes in decimal units, before edges or indexing.

## 3. Input and observation handling
MVP: editable six-face net or a 54-character facelet string. Add photography only after the deterministic core passes its gates.

Canonical encoding: faces URFDLB, nine stickers per face, row-major when viewed from outside. Face centres are indices 4, 13, 22, 31, 40, 49 in zero-based indexing. Symbols identify destination faces, not hard-coded colours. Provide a labelled net that explicitly defines the top direction of every face. An adapter must test the selected backend’s exact conventions.

For photos, guide the user through six labelled views without changing stickers between captures. Track face orientation; detect face quadrilaterals; rectify; sample nine regions; propose colour classes; require correction of uncertain entries. Retain both observation and confirmed state. Do not use colour confidence as proof of cube legality.

Partial observations return NEEDS_INPUT with missing locations. A later constraint-completion feature could determine whether zero, one or multiple legal completions exist; it must prove uniqueness before treating inferred stickers as certain. This feature is not needed for MVP. Never equate one plausible completion with the observed cube.

For this attachment: request all six labelled faces, or a complete facelet string, before a verified cube-specific answer.

## 3.1. Required Reset Cube and Solve controls
The prototype interface must include both buttons, a six-face editable net and a visible, copyable 54-character state field. The net and field share one canonical state. Initialise the interface with the same complete state produced by Reset Cube.

### Reset Cube
On click, restore the virtual cube to the canonical solved state. Set all 54 stickers, including centres, in URFDLB order:

```text
UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

The string is exactly 54 characters: nine symbols per face. Reset is deterministic, not randomisation. It creates a complete virtual state; it does not reconstruct unseen stickers from the supplied photograph.

Cancel any active search or playback, advance the state revision, clear previous moves, errors, timers and proof status, and update the net and state field atomically. Display “Cube reset · 54/54 stickers defined”. Reset remains available during solving. Centres retain their fixed face labels and colour mapping.

### Solve
On click, take an immutable snapshot of the current complete 54-sticker state and its revision. Validate it using Section 5. If incomplete or illegal, show location-specific corrections and do not launch search. Otherwise submit the exact snapshot to POST /solve using the selected mode and budget. Disable duplicate Solve clicks while that request is active; show “Solving…”. Reset remains enabled.

Replay the returned moves independently against the submitted snapshot. Only after successful verification, display the move sequence and count and animate those moves from that snapshot to the solved cube. Keep the original input and sequence available in the result panel; synchronise the net and current-state field at each animation step. Show “Solved” when playback completes. A previously solved snapshot returns “Already solved · 0 moves” without unnecessary search.

Use a unique request ID plus state revision to discard late results after Reset or any edit. Editing a sticker, changing the state field or applying a manual face turn cancels active search/playback, advances the revision and invalidates the previous solution. On failure or timeout without a verified result, leave the submitted cube unchanged and display the appropriate diagnostic. A verified incumbent on optimal-search timeout may be played with “Shortest solution not proven”.

### Interaction acceptance criteria
- Reset from a partial, invalid or scrambled input defines exactly 54 stickers, nine of each symbol, and a legal solved state.
- Reset followed immediately by Solve reports zero moves.
- Apply legal manual face turns after Reset, then Solve: the exact displayed state is submitted, its returned path replays correctly, and animation ends solved.
- Illegal edits are rejected before search; no arbitrary colour shuffle is used to create a scramble.
- Reset during search or playback takes effect immediately; late responses cannot overwrite the reset state.
- The net and state field never diverge, including during playback.

## 4. Architecture
| Component | Responsibility | Output |
|---|---|---|
| Input editor | Capture stickers and face orientation | FaceletInput |
| Normaliser | Map centres to URFDLB | Canonical 54-facelet state |
| Validator | Check counts, pieces, orientation and parity | ValidState or precise errors |
| Solver adapter | Convert conventions; enforce deadline | Candidate moves and search metadata |
| Independent verifier | Replay moves using separate facelet permutations | VERIFIED or INTERNAL_ERROR |
| Presenter | Show reference frame, moves, playback and claims | User result |
| Optional optimal search | Search complete HTM graph with lower bounds | Best path and proof status |

Keep validation, solving and verification as separate modules. Run bounded search in a cancellable worker process so a blocked backend cannot freeze the interface.

## 5. State model and validation
Maintain two representations:
- Facelets: 54 symbols for capture, rendering and independent replay.
- Cubies: cp[8], co[8], ep[12], eo[12] for search. Define arrays as piece-at-position, with one documented orientation convention.

Validation order:
1. Exactly 54 recognised symbols; six distinct centres.
2. Each mapped face colour appears exactly nine times.
3. All eight expected corner colour triples and twelve expected edge pairs occur exactly once.
4. Convert to cubie coordinates and check twist, flip and permutation parity invariants.
5. Confirm facelet-to-cubie-to-facelet round trip.

For an ordinary cube with a fixed conventional centre arrangement, these cubie constraints characterise reachable states. Centre mapping and orientation conventions must be established first. Unusual manufacturer colour schemes need explicit support rather than guessing opposite colours.

Return specific diagnostics such as EDGE_FLIP_PARITY, CORNER_TWIST_SUM, PERMUTATION_PARITY, DUPLICATE_PIECE and INVALID_COUNTS. With uncertain photos, these mean the entered state is inconsistent, not necessarily that the physical cube is defective.

## 6. Fast solver
Use an existing implementation of Kociemba’s two-phase method behind a replaceable adapter. Select and pin an implementation only after checking its licence, platform compatibility, maintained API, table requirements and cancellation behaviour.

Phase 1 reaches the subgroup where piece orientations are resolved and the four middle-slice edges occupy that slice. Phase 2 solves within the restricted move set generated by U, D, R2, L2, F2, B2. [S2]

Search several phase-1 candidates under an overall budget rather than assuming the first produces the shortest total result. Use the backend’s pruning tables; record table version and checksum. Bound memory and startup costs separately from warm solve time.

A fast result is a verified solution, not a proof of optimality. It may exceed 20 moves, depending on implementation and limits. The mathematical existence of a <=20-move path does not guarantee that this bounded implementation finds one.

## 7. Optional optimal mode
Implement IDA* over all 18 HTM moves with admissible pattern-database lower bounds to the solved state. Start at h(start), increase the cost threshold, and fully exhaust all smaller relevant thresholds before claiming optimality.

Use abstract corner and edge state databases whose transitions are projections of real moves. Combine lower bounds with max(h1,h2,...). Do not add them unless a valid cost-partitioning argument establishes admissibility. Missing table entries must use a conservative bound such as zero, never an optimistic implementation assumption about their distance.

A verified fast solution supplies an upper bound. Complete lower-threshold searches establish a lower bound. If all paths shorter than the incumbent are ruled out, mark it optimal. Safe pruning includes consecutive moves on the same face, which can be combined or cancelled; other canonicalisation rules require completeness tests.

On timeout, preserve the verified incumbent and mark optimality NOT_PROVEN. Return a proven lower bound only from completed searches or admissible heuristics. Never infer impossibility from a timeout. No promise is made that arbitrary 20-move states can be proven optimal within the prototype budget.

## 8. API contract
POST /solve
Request:
{
  "facelets": "<54 URFDLB symbols>",
  "metric": "HTM",
  "mode": "fast",
  "timeout_ms": 5000
}

Response fields:
- status: NEEDS_INPUT | INVALID_STATE | SOLVED | TIMEOUT | INTERNAL_ERROR
- moves: array of valid notation tokens, or null
- move_count: HTM count, or null
- verified: boolean
- optimality: PROVEN | NOT_PROVEN | NOT_APPLICABLE
- lower_bound: optional rigorously established value
- upper_bound: length of verified solution, if available
- elapsed_ms, solver_version, tables_checksum
- errors: location-aware diagnostic array

SOLVED means a verified solution is available. An optimal-mode deadline may therefore return SOLVED with optimality NOT_PROVEN and termination_reason TIME_LIMIT. TIMEOUT without a solution returns moves=null and verified=false. NEEDS_INPUT and INVALID_STATE never launch search.

The solved input returns [] with move_count=0, verified=true and optimality=PROVEN.

## 9. Execution pseudocode
solve(request):
    check metric and enforce server-side resource limits
    if input incomplete: return NEEDS_INPUT
    state = normalise_and_validate(request.facelets)
    if invalid: return INVALID_STATE
    if solved(state): return verified empty optimal solution

    candidate = bounded_fast_search(state)
    if candidate exists:
        replay candidate from original facelets using independent verifier
        if replay is not solved: return INTERNAL_ERROR
        incumbent = candidate

    if mode == optimal and time remains:
        search all HTM paths with admissible IDA* bounds
        improve incumbent and track completed lower-bound searches
        verify any replacement incumbent independently

    return verified incumbent with truthful proof status, or TIMEOUT

Verification is necessary but not sufficient for optimality. It establishes that the sequence works; lower-bound search establishes whether a shorter one exists.

## 10. Implementation package
Suggested local prototype: Python orchestration and CLI, a native search backend where appropriate, and a small browser interface with the required Reset Cube and Solve buttons. Avoid choosing dependencies by popularity alone; benchmark the actual candidate.

Files:
- model.py: representations and convention conversions
- validation.py: legality checks and diagnostics
- solver_adapter.py: pinned two-phase backend
- optimal.py: optional bounded IDA*
- verifier.py: independent 54-facelet move permutations
- cli.py: JSON and facelet input
- api.py: optional service wrapper
- tests/: invariants, integration, known-distance fixtures
- tables/: generated/downloaded tables with provenance and checksums
- benchmarks/: reproducible seeds, environment and results

Generate verifier permutations from documented 3D sticker coordinates, separately from backend cubie tables. Use shared notation definitions but no shared mutable move tables.

## 11. Acceptance gates
| Gate | Required evidence |
|---|---|
| Move correctness | Each face move repeated four times is identity; move followed by inverse is identity; half-turn equals two quarter-turns |
| Representations | Round-trip facelet/cubie conversion across legal generated states |
| Legality | Reject single flipped edge, single twisted corner, odd isolated piece swap, duplicated piece and wrong counts |
| Integration | Replay every returned sequence to exactly the solved facelets |
| Shortest claims | Compare optimal mode with breadth-first ground truth for all unique states within depth 4 |
| Budget handling | Deadline and cancellation tests with/without an incumbent; no unverified moves |
| Observation | Partial image returns NEEDS_INPUT; rotated face and ambiguous colour fixtures require correction |
| Robustness | At least 1,000 seeded legal scramble fixtures and separately sampled uniform legal states; zero wrong verified results |

Record CPU, RAM, OS, dependency version, table size, cold initialisation, median/p95/max warm latency, solution lengths, timeout fraction and peak memory. Random move sequences are not uniform sampling of legal states. For uniform fixtures, sample permutations and orientations while enforcing parity and final orientation constraints.

Provisional engineering target: fast mode p95 below 2 seconds warm on the explicitly recorded test machine, with a 5-second request limit. These are acceptance targets, not measured performance. A timeout rate must be reported, not hidden from latency statistics. Optimal mode has no blanket runtime guarantee.

## 12. Delivery order
1. Fix notation and representations; pass move and validation tests.
2. Integrate fast backend and independent replay; pass 1,000-state gate.
3. Add Reset Cube, Solve, guided input and verified move playback; pass the interaction acceptance criteria and verify user orientation conventions.
4. Add bounded optimal mode and shallow exact benchmarks.
5. Add photo recognition only after capture-error handling is defined.

The first useful demonstrator accepts a confirmed full state and returns a verified move sequence. No AI model is necessary in the solving core.

## Sources
S1: Rokicki, Kociemba, Davidson and Dethridge, “God’s Number is 20”, 2010 result, https://www.cube20.org/ (accessed 2026-09-21).
S2: Herbert Kociemba, “The Two-Phase Algorithm Coordinates”, undated, https://kociemba.org/math/twophase.htm (accessed 2026-09-21).
Algorithm-specific source claims are limited to the group decomposition. Architecture, API, budgets and gates above are proposed engineering choices.


## Revision note
2026-09-21: v1.1 supersedes v1.0. Added required Reset Cube and Solve controls, full-state initialisation, verified animation and stale-result protection.
