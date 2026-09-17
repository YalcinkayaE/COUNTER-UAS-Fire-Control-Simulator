import {
  Crosshair,
  Volume2,
  VolumeX,
} from "lucide-react";
import { type ReactNode, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { formatBearingDeg, formatDist, formatElevDeg, formatTtb } from "@/sims/math";
import { getHud, getSim, subscribeHud } from "@/sims/simulation";
import { Radar } from "./Radar";

export function TacticalHUD() {
  const hud = useSyncExternalStore(subscribeHud, getHud, getHud);
  const live = hud.phase === "live" || hud.phase === "wavehold" || hud.phase === "paused";

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:p-4">
        <div className="rounded-xl border border-line bg-surface/90 p-3 md:p-4">
          <p className="font-display text-3xl font-semibold leading-none tracking-display text-khaki md:text-4xl">
            KANGAL
          </p>
          <h1 className="mt-1 font-display text-lg font-semibold leading-tight tracking-display md:text-xl">
            SEM DEFENDER
          </h1>
          <p className="mt-0.5 font-mono text-[10px] tracking-widest text-accent">
            COUNTER-UAS FIRE CONTROL
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-lg border border-line bg-surface/90 px-3 py-2 font-mono text-xs tabular-nums text-muted">
            T+{formatClock(hud.elapsed)}
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              onClick={() => getSim().togglePause()}
              className="h-11 rounded-md border border-line bg-surface px-3 font-mono text-xs text-fg hover:bg-surface-2"
            >
              {hud.phase === "paused" ? "Resume" : "Pause simulation"}
            </button>
            <IconBtn label={hud.muted ? "Unmute" : "Mute"} onClick={() => getSim().toggleMute()}>
              {hud.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </IconBtn>
          </div>
        </div>
      </header>

      {live ? (
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:w-auto md:p-4">
          <div className="w-full max-w-xs rounded-xl border border-line bg-surface/90 p-2 md:w-64">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="font-mono text-xs tracking-[0.18em] text-muted">PPI SCOPE</span>
              <span className="font-mono text-xs text-track">10 Hz</span>
            </div>
            <div className="aspect-square overflow-hidden rounded-md border border-line">
              <Radar tracks={hud.tracks} targetId={hud.targetId} yaw={hud.barrel.yaw} />
            </div>
          </div>
        </div>
      ) : null}

      {live ? (
        <aside className="pointer-events-none absolute top-24 right-0 z-10 hidden w-[22rem] max-w-[calc(100%-1.5rem)] flex-col gap-3 p-4 md:top-24 md:flex">
          <TrackTable hud={hud} />
          <StatusStrip hud={hud} />
        </aside>
      ) : null}

      {live ? (
        <div className="pointer-events-none absolute right-0 bottom-24 z-10 w-full p-3 md:hidden">
          <TrackTable hud={hud} compact />
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 hidden -translate-x-1/2 pb-4 md:block">
        <StatusStrip hud={hud} />
      </div>

      {hud.mode === "MANUAL" && hud.leadScreen?.visible ? (
        <div
          className="pointer-events-none absolute z-10 size-8 -translate-x-1/2 -translate-y-1/2"
          style={{ left: hud.leadScreen.x, top: hud.leadScreen.y }}
        >
          <Crosshair className="size-8 text-accent" strokeWidth={1.4} />
        </div>
      ) : null}

      {hud.mode === "MANUAL" && hud.aimScreen?.visible ? (
        <div
          className="pointer-events-none absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg"
          style={{ left: hud.aimScreen.x, top: hud.aimScreen.y }}
        />
      ) : null}

      {hud.message && live ? (
        <p className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-[4.5rem] font-display text-2xl font-semibold tracking-display text-fg">
          {hud.message}
        </p>
      ) : null}

      <MobileBar hud={hud} />
    </>
  );
}

function TrackTable({
  hud,
  compact = false,
}: {
  hud: ReturnType<typeof getHud>;
  compact?: boolean;
}) {
  const rows = compact ? hud.tracks.slice(0, 8) : hud.tracks.slice(0, 20);
  return (
    <div className="rounded-xl border border-line bg-surface/90 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-xs tracking-[0.18em] text-muted">EDF QUEUE</span>
        <span className="font-mono text-xs text-accent">{hud.mode}</span>
      </div>
      <div className="max-h-[min(28rem,52vh)] overflow-y-auto">
      <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
        <thead>
          <tr className="text-dim">
            <th className="pb-1 text-left font-medium">ID</th>
            <th className="pb-1 text-right font-medium">AZ</th>
            <th className="pb-1 text-right font-medium">EL</th>
            <th className="pb-1 text-right font-medium">RNG</th>
            <th className="pb-1 text-right font-medium">V</th>
            <th className="pb-1 text-right font-medium">TTB</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-2 text-dim">
                No tracks
              </td>
            </tr>
          ) : (
            rows.map((t, i) => {
              const hot = t.id === hud.targetId;
              const imminent = Number.isFinite(t.timeToBreach) && t.timeToBreach < 8;
              return (
                <tr
                  key={t.id}
                  className={hot ? "text-fg" : imminent ? "text-danger" : "text-muted"}
                >
                  <td className="py-0.5">
                    {hot ? "▸ " : `${i + 1} `}
                    {t.id}
                    {t.kind === "fixedWing" ? " FW" : ""}
                  </td>
                  <td className="text-right">{formatBearingDeg(t.azimuth)}</td>
                  <td className="text-right">{formatElevDeg(t.elevation)}</td>
                  <td className="text-right">{formatDist(t.range)}</td>
                  <td className="text-right">{t.speed.toFixed(0)}</td>
                  <td className="text-right">{formatTtb(t.timeToBreach)}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function StatusStrip({ hud }: { hud: ReturnType<typeof getHud> }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface/90 px-3 py-2 font-mono text-xs tabular-nums">
      {hud.phase === "paused" ? <span className="text-warn">PAUSED</span> : null}
      {hud.phase === "paused" ? <span className="text-line">|</span> : null}
      <span className={hud.aligned ? "text-accent" : "text-dim"}>
        {hud.aligned ? "LOCKED" : "SLEW"}
      </span>
      <span className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-line">
        <span
          className="block h-full bg-accent"
          style={{ width: `${Math.round((1 - hud.cooldown) * 100)}%` }}
        />
      </span>
    </div>
  );
}

function MobileBar({ hud }: { hud: ReturnType<typeof getHud> }) {
  if (hud.phase === "briefing") return null;
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <Button
        variant={hud.mode === "AUTO" ? "primary" : "secondary"}
        size="sm"
        className="rounded-md"
        onClick={() => getSim().setMode(hud.mode === "AUTO" ? "MANUAL" : "AUTO")}
      >
        {hud.mode}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        className="rounded-md"
        disabled={hud.mode !== "MANUAL"}
        onPointerDown={() => {
          getSim().input.fireEdge = true;
          getSim().input.pointerDown = true;
        }}
        onPointerUp={() => {
          getSim().input.pointerDown = false;
        }}
      >
        Fire
      </Button>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-md border border-line bg-surface text-fg hover:bg-surface-2"
    >
      {children}
    </button>
  );
}

function formatClock(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
