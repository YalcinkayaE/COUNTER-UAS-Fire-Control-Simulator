import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { unlockAudio } from "@/sims/audio";
import { getHud, getSim, subscribeHud } from "@/sims/simulation";
import { BriefingPanel } from "./Briefing";

export function Overlays() {
  const hud = useSyncExternalStore(subscribeHud, getHud, getHud);

  if (hud.phase === "briefing") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 px-4 backdrop-blur-[2px]">
        <BriefingPanel
          onEngage={() => {
            unlockAudio();
            getSim().start();
          }}
        />
      </div>
    );
  }

  if (hud.phase === "defeat") {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/70 px-4 backdrop-blur-[2px]">
        <div className="flex max-w-lg flex-col items-center gap-4 rounded-xl border border-danger/50 bg-surface px-8 py-8 text-center">
          <p className="font-display text-5xl font-semibold tracking-display text-danger">UGV HIT</p>
          <p className="font-mono text-sm text-muted">
            Direct impact on the vehicle. Simulation stopped.
          </p>
          <Button
            size="lg"
            className="rounded-md"
            onClick={() => getSim().returnToBriefing()}
          >
            Reset
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
