import { Canvas } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { bindControlsProbe, getSim } from "@/game/simulation";
import { Overlays } from "./Overlays";
import { Scene } from "./Scene";
import { TacticalHUD } from "./TacticalHUD";

export default function GameApp() {
  const rootRef = useRef<HTMLDivElement>(null);

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
        camera={{ position: [620, 430, 740], fov: 42, near: 2, far: 4800 }}
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
        <Scene />
      </Canvas>
      <TacticalHUD />
      <Overlays />
    </div>
  );
}
