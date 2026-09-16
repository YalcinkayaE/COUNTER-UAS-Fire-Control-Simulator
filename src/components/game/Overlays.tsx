import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/game/audio";
import { getHud, getSim, resetSim, subscribeHud } from "@/game/simulation";
import { BriefingPanel } from "./Briefing";

export function Overlays() {
  const hud = useSyncExternalStore(subscribeHud, getHud, getHud);

  if (hud.phase === "briefing") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 px-4 backdrop-blur-[2px]">
        <BriefingPanel
          highScore={hud.highScore}
          onEngage={() => {
            unlockAudio();
            getSim().start();
          }}
        />
      </div>
    );
  }

  if (hud.phase === "paused") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/55 px-4">
        <section className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
          <h2 className="font-display text-3xl font-semibold tracking-display">Paused</h2>
          <p className="mt-2 font-mono text-sm text-muted">Hold fire. Tracks still inbound on resume.</p>
          <div className="mt-5 flex gap-2">
            <Button className="rounded-md" onClick={() => getSim().togglePause()}>
              Resume
            </Button>
            <Button variant="secondary" className="rounded-md" onClick={() => resetSim()}>
              Abort
            </Button>
          </div>
        </section>
      </div>
    );
  }

  if (hud.phase === "defeat") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/75 px-4">
        <section className="w-full max-w-md rounded-xl border border-line bg-surface p-6 md:p-8">
          <p className="font-mono text-xs tracking-widest text-danger">PERIMETER LOST</p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-display">
            Facility compromised
          </h2>
          <dl className="mt-6 grid grid-cols-3 gap-2 font-mono text-xs">
            <MiniStat label="Score" value={String(hud.score)} />
            <MiniStat label="Kills" value={String(hud.intercepts)} />
            <MiniStat label="Best" value={String(hud.highScore)} />
          </dl>
          <Button
            className="mt-6 rounded-md"
            size="lg"
            onClick={() => {
              unlockAudio();
              getSim().start();
            }}
          >
            Re-arm
          </Button>
        </section>
      </div>
    );
  }

  return null;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-bg px-3 py-2">
      <dt className="text-dim">{label}</dt>
      <dd className="mt-0.5 text-lg text-fg tabular-nums">{value}</dd>
    </div>
  );
}
