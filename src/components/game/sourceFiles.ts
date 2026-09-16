import { strToU8, zipSync } from "fflate";
import audioSrc from "@/game/audio.ts?raw";
import constantsSrc from "@/game/constants.ts?raw";
import droneTargetSrc from "@/game/droneTarget.ts?raw";
import edgeComputerSrc from "@/game/edgeComputer.ts?raw";
import mathSrc from "@/game/math.ts?raw";
import radarSensorSrc from "@/game/radarSensor.ts?raw";
import simulationSrc from "@/game/simulation.ts?raw";
import swarmManagerSrc from "@/game/swarmManager.ts?raw";
import turretControllerSrc from "@/game/turretController.ts?raw";
import radarSrc from "@/components/game/Radar.tsx?raw";
import sceneSrc from "@/components/game/Scene.tsx?raw";
import tacticalHudSrc from "@/components/game/TacticalHUD.tsx?raw";

export type SourceFile = {
  path: string;
  content: string;
};

export const SOURCE_FILES: SourceFile[] = [
  { path: "src/game/math.ts", content: mathSrc },
  { path: "src/game/constants.ts", content: constantsSrc },
  { path: "src/game/droneTarget.ts", content: droneTargetSrc },
  { path: "src/game/radarSensor.ts", content: radarSensorSrc },
  { path: "src/game/edgeComputer.ts", content: edgeComputerSrc },
  { path: "src/game/swarmManager.ts", content: swarmManagerSrc },
  { path: "src/game/turretController.ts", content: turretControllerSrc },
  { path: "src/game/simulation.ts", content: simulationSrc },
  { path: "src/game/audio.ts", content: audioSrc },
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
