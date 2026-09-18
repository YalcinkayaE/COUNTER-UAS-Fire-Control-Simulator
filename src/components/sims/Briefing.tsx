import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { UGV_MOVE_KMH } from "@/sims/constants";
import { getHud, getSim, subscribeHud } from "@/sims/simulation";
import { ZIP_HREF, ZIP_NAME } from "./sourceFiles";
import { SourcePanel } from "./SourcePanel";

export function BriefingPanel({ onEngage }: { onEngage?: () => void }) {
  const [sourceOpen, setSourceOpen] = useState(false);
  const hud = useSyncExternalStore(subscribeHud, getHud, getHud);

  return (
    <>
      <section className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 md:p-8">
        <h1 className="font-display text-5xl font-semibold leading-none tracking-display text-khaki md:text-6xl">
          SEM DEFENDER
        </h1>
        <p className="mt-1 font-mono text-xs tracking-widest text-accent">COUNTER-UAS FIRE CONTROL</p>
        <div className="mt-6 space-y-3 font-mono text-sm leading-relaxed text-muted">
          <p>
            8–16 quads from 1 km plus 2–3 fixed-wing from 2 km, inbound through the northern
            sector. The raid axis shifts each wave, and a faster track can beat a closer slow one
            on time-to-breach. Quads and fixed-wing weave in azimuth and altitude. One Echodyne
            Guard AESA stares north over a 120° × 80° sector (1° az / 1.5° el accuracy), publishing
            az, el, range and velocity at 10 Hz — 20 tracks max, ranked by TTB. The edge computer
            issues the fire call.
          </p>
          <p className="rounded-md border border-line bg-bg px-3 py-2 text-fg">
            TTB = (horizontal range − 36 m asset) / horizontal closing speed
          </p>
          <p>
            AUTO slews at 75°/s onto the quadratic lead from the latest scan. The kill zone is the
            selected effector's range — a crossing is a breach (GUNS TIGHT), not a lost life. EDF
            ranks by time to the 36 m site around the UGV; the gun stays on a track across bursts
            unless a hotter deadline pulls it off. Three kamikaze quads (H01–H03, HV) are not in the
            raid: they approach from separate bearings, park outside the HN-12 200 m envelope (TTB
            REC), then dive. CAKIR 400 m (1350
            rds/min), HN-12 200 m (1000), PENCE-A 400 m (120). MANUAL is the weapons-release bypass
            on the same solution; AUTO will not fire outside the envelope.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {onEngage ? (
              <Button size="lg" className="rounded-md" onClick={onEngage}>
                Engage
              </Button>
            ) : (
              <p className="font-mono text-xs text-dim">Loading battlespace…</p>
            )}
            <button
              type="button"
              aria-pressed={hud.ugvMove}
              onClick={() => getSim().toggleUgvMove()}
              className={`h-11 rounded-md border px-3 font-mono text-xs ${
                hud.ugvMove
                  ? "border-khaki bg-khaki/15 text-khaki"
                  : "border-line bg-surface-2 text-muted hover:text-fg"
              }`}
            >
              {hud.ugvMove ? `UGV MOVE ${UGV_MOVE_KMH} km/h` : "UGV HOLD"}
            </button>
            <p className="font-mono text-xs text-dim">M mode · A/D slew · Space fire · Esc pause</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              variant="secondary"
              className="rounded-md"
              onClick={() => setSourceOpen(true)}
            >
              View source
            </Button>
            <Button size="sm" variant="ghost" className="rounded-md" asChild>
              <a href={ZIP_HREF} download={ZIP_NAME}>
                Download zip
              </a>
            </Button>
          </div>
        </div>
      </section>
      <SourcePanel open={sourceOpen} onClose={() => setSourceOpen(false)} />
    </>
  );
}
