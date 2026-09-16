import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZIP_HREF, ZIP_NAME } from "./sourceFiles";
import { SourcePanel } from "./SourcePanel";

export function BriefingPanel({ onEngage }: { onEngage?: () => void }) {
  const [sourceOpen, setSourceOpen] = useState(false);

  return (
    <>
      <section className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 md:p-8">
        <p className="font-display text-6xl font-semibold leading-[0.86] tracking-display text-khaki md:text-7xl">
          KANGAL
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-display md:text-3xl">
          SEM DEFENDER
        </h1>
        <p className="mt-1 font-mono text-xs tracking-widest text-accent">COUNTER-UAS FIRE CONTROL</p>
        <div className="mt-6 space-y-3 font-mono text-sm leading-relaxed text-muted">
          <p>
            Twenty quadcopters inbound from the northwest plus two small fixed-wing UAVs at 2 km
            east — faster, so time-to-breach can beat a closer slow track. Echodyne publishes
            azimuth, elevation, range and velocity at 10 Hz (20 tracks max, ranked by TTB). The
            edge computer issues the fire call. MANUAL bypasses AUTO:
          </p>
          <p className="rounded-md border border-line bg-bg px-3 py-2 text-fg">
            TTB = (Distance − 500 m) / Radial Velocity
          </p>
          <p>
            AUTO slews at 75°/s onto the quadratic lead from the last 10 Hz scan. Crossing 500 m
            is a breach, not a despawn: EDF keeps that track at TTB NOW and the gun stays on it
            until a kill or the asset. MANUAL is the weapons-release bypass on the same solution.
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
