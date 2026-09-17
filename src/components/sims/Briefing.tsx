import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZIP_HREF, ZIP_NAME } from "./sourceFiles";
import { SourcePanel } from "./SourcePanel";

export function BriefingPanel({ onEngage }: { onEngage?: () => void }) {
  const [sourceOpen, setSourceOpen] = useState(false);

  return (
    <>
      <section className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 md:p-8">
        <h1 className="font-display text-5xl font-semibold leading-none tracking-display text-khaki md:text-6xl">
          SEM DEFENDER
        </h1>
        <p className="mt-1 font-mono text-xs tracking-widest text-accent">COUNTER-UAS FIRE CONTROL</p>
        <div className="mt-6 space-y-3 font-mono text-sm leading-relaxed text-muted">
          <p>
            8–16 quads plus 2–3 fixed-wing at 2 km, inbound through the northern sector — the raid
            axis shifts each wave, and the faster tracks can beat a closer slow one on
            time-to-breach. One Echodyne Guard AESA stares north over a 120° × 80° sector (1° az /
            1.5° el accuracy), publishing az, el, range and velocity at 10 Hz — 20 tracks max,
            ranked by TTB. The edge computer issues the fire call.
          </p>
          <p className="rounded-md border border-line bg-bg px-3 py-2 text-fg">
            TTB = (horizontal range − 36 m asset) / horizontal closing speed
          </p>
          <p>
            AUTO slews at 75°/s onto the quadratic lead from the latest scan. The red ring is the
            selected effector's range — the envelope AUTO may fire in, not the EDF deadline. A
            crossing is GUNS TIGHT, not a lost life; you lose a life if a track overflies the 36 m
            asset. CAKIR 400 m (1350 rds/min), HN-12 200 m (1000), PENCE-A 400 m (120). MANUAL is
            the weapons-release bypass on the same solution; AUTO will not fire outside the
            envelope.
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
