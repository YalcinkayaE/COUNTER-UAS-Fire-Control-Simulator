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
        <div className="mt-5 overflow-hidden rounded-lg border border-line bg-bg">
          <img
            src="/ugv-welcome.png"
            alt="SEM DEFENDER unmanned ground vehicle with counter-UAS turret"
            className="mx-auto block h-auto w-full max-w-sm object-contain"
            width={334}
            height={308}
            decoding="async"
          />
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
