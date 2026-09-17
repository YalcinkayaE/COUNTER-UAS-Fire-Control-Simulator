import { strToU8, zipSync } from "fflate";
import audioSrc from "@/sims/audio.ts?raw";
import constantsSrc from "@/sims/constants.ts?raw";
import droneTargetSrc from "@/sims/droneTarget.ts?raw";
import edgeComputerSrc from "@/sims/edgeComputer.ts?raw";
import mathSrc from "@/sims/math.ts?raw";
import radarSensorSrc from "@/sims/radarSensor.ts?raw";
import simulationSrc from "@/sims/simulation.ts?raw";
import swarmManagerSrc from "@/sims/swarmManager.ts?raw";
import turretControllerSrc from "@/sims/turretController.ts?raw";
import radarSrc from "@/components/game/Radar.tsx?raw";
import sceneSrc from "@/components/game/Scene.tsx?raw";
import tacticalHudSrc from "@/components/game/TacticalHUD.tsx?raw";

export type SourceFile = {
  path: string;
  content: string;
};

export const SOURCE_FILES: SourceFile[] = [
  { path: "src/sims/math.ts", content: mathSrc },
  { path: "src/sims/constants.ts", content: constantsSrc },
  { path: "src/sims/droneTarget.ts", content: droneTargetSrc },
  { path: "src/sims/radarSensor.ts", content: radarSensorSrc },
  { path: "src/sims/edgeComputer.ts", content: edgeComputerSrc },
  { path: "src/sims/swarmManager.ts", content: swarmManagerSrc },
  { path: "src/sims/turretController.ts", content: turretControllerSrc },
  { path: "src/sims/simulation.ts", content: simulationSrc },
  { path: "src/sims/audio.ts", content: audioSrc },
  { path: "src/components/game/Scene.tsx", content: sceneSrc },
  { path: "src/components/game/TacticalHUD.tsx", content: tacticalHudSrc },
  { path: "src/components/game/Radar.tsx", content: radarSrc },
];

export const ZIP_NAME = "sem-tech-defender-source.zip";

function makeZipHref(): string {
  const files: Record<string, Uint8Array> = {};
  for (const file of SOURCE_FILES) {
    files[file.path] = strToU8(file.content);
  }
  const zipped = zipSync(files);
  return URL.createObjectURL(new Blob([zipped], { type: "application/zip" }));
}

export const ZIP_HREF =
  typeof URL !== "undefined" && typeof URL.createObjectURL === "function" ? makeZipHref() : "";
