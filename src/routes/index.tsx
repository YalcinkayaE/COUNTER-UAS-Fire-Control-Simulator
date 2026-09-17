import { lazy, Suspense, useEffect, useState } from "react";
import { BriefingPanel } from "@/components/sims/Briefing";

const SimsApp = lazy(() => import("@/components/sims/SimsApp"));

export function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <BootScreen />;
  return (
    <Suspense fallback={<BootScreen />}>
      <SimsApp />
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
