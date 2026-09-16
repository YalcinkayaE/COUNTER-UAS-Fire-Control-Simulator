import { useSyncExternalStore } from "react";
import { unlockAudio } from "@/game/audio";
import { getHud, getSim, subscribeHud } from "@/game/simulation";
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

  return null;
}
