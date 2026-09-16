import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ZIP_HREF, ZIP_NAME } from "./sourceFiles";
import { SourcePanel } from "./SourcePanel";

export function BriefingPanel({
  highScore,
  onEngage,
}: {
  highScore: number;
  onEngage?: () => void;
}) {
  const [sourceOpen, setSourceOpen] = useState(false);

  return (
    <>
      <section className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 md:p-8">
        <p className="font-mono text-xs tracking-widest text-accent">SEM-TECH · TACTICAL BRIEF</p>
        <h1 className="mt-2 font-display text-5xl font-semibold leading-[0.92] tracking-display md:text-6xl">
          DEFENDER
        </h1>
        <p className="mt-1 font-mono text-xs text-muted">
          COUNTER-UAS FIRE CONTROL · 20 INBOUND TRACKS
        </p>
        <div className="mt-6 space-y-3 font-mono text-sm leading-relaxed text-muted">
          <p>
            Swarm inbound on a 1 000 m ring. Inner kill zone is 500 m. The 10 Hz radar loop ranks
            tracks by Earliest Deadline First:
          </p>
          <p className="rounded-md border border-line bg-bg px-3 py-2 text-fg">
            TTB = (Distance − 500 m) / Radial Velocity
          </p>
          <p>
            AUTO slews the interceptor at 75°/s onto the quadratic lead point. MANUAL lets you put
            the pip on the same solution.
          </p>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-2 font-mono text-xs">
          <Stat label="Tracks" value="20" />
          <Stat label="Lives" value="5" />
          <Stat label="Best" value={String(highScore)} />
        </dl>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-bg px-3 py-2">
      <dt className="text-dim">{label}</dt>
      <dd className="mt-0.5 text-lg text-fg tabular-nums">{value}</dd>
    </div>
  );
}
