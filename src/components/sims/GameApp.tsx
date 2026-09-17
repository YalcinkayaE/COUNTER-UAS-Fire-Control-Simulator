import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  CAMERA_3D_POLAR,
  CAMERA_3D_RADIUS,
  CAMERA_FAR,
  CAMERA_FOV_DEG,
  northLockedCameraPosition,
  type ViewMode,
} from "@/sims/camera";
import { bindControlsProbe, getSim } from "@/sims/simulation";
import { Overlays } from "./Overlays";
import { Scene } from "./Scene";
import { TacticalHUD } from "./TacticalHUD";

export default function GameApp() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ViewMode>("3d");

  useEffect(() => {
    bindControlsProbe();
    const sim = getSim();
    const onKeyDown = (e: KeyboardEvent) => {
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      sim.input.keys.add(e.code);
      if (e.code === "KeyM") sim.input.modeEdge = true;
      if (e.code === "Escape" || e.code === "KeyP") sim.input.pauseEdge = true;
      if (e.code === "Space") sim.input.fireEdge = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      sim.input.keys.delete(e.code);
    };
    const clear = () => sim.input.keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clear();
    });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative h-dvh w-full touch-none overflow-hidden bg-bg text-fg"
    >
      <Canvas
        camera={{
          position: northLockedCameraPosition(CAMERA_3D_POLAR, CAMERA_3D_RADIUS),
          fov: CAMERA_FOV_DEG,
          near: 2,
          far: CAMERA_FAR,
        }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#08090b");
        }}
        onPointerMove={(e) => {
          const sim = getSim();
          const rect = (e.target as HTMLElement).getBoundingClientRect?.();
          const el = rootRef.current;
          const r = el?.getBoundingClientRect();
          const box = r ?? rect;
          if (!box) return;
          sim.input.ndcX = ((e.clientX - box.left) / box.width) * 2 - 1;
          sim.input.ndcY = -((e.clientY - box.top) / box.height) * 2 + 1;
          sim.input.pointerOver = true;
        }}
        onPointerLeave={() => {
          getSim().input.pointerOver = false;
          getSim().input.pointerDown = false;
        }}
        onPointerDown={() => {
          getSim().input.pointerDown = true;
        }}
        onPointerUp={() => {
          getSim().input.pointerDown = false;
        }}
        style={{ touchAction: "none" }}
      >
        <Scene view={view} />
      </Canvas>
      <TacticalHUD view={view} onViewChange={setView} />
      <Overlays />
    </div>
  );
}
