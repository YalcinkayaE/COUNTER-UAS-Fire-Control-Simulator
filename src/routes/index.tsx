import { lazy, Suspense, useEffect, useState } from "react";
import { BriefingPanel } from "@/components/game/Briefing";

const GameApp = lazy(() => import("@/components/game/GameApp"));

export function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <BootScreen />;
  return (
    <Suspense fallback={<BootScreen />}>
      <GameApp />
    </Suspense>
  );
}

function BootScreen() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 text-fg">
      <BriefingPanel />
    </main>
  );
}
