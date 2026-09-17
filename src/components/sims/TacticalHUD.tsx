import {
  Crosshair,
  Volume2,
  VolumeX,
} from "lucide-react";
import { type ReactNode, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import type { ViewMode } from "@/sims/camera";
import type { LedgerEntry } from "@/sims/ledger";
import { EFFECTOR_IDS } from "@/sims/constants";
import { formatBearingDeg, formatDist, formatElevDeg, formatTtb } from "@/sims/math";
import { getHud, getSim, subscribeHud } from "@/sims/simulation";
import { Radar } from "./Radar";

export function TacticalHUD({
  view,
  onViewChange,
}: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}) {
  const hud = useSyncExternalStore(subscribeHud, getHud, getHud);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const live = hud.phase === "live" || hud.phase === "wavehold" || hud.phase === "paused";

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:p-4">
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface/90 p-3 md:gap-4 md:p-4">
          <div>
            <h1 className="font-display text-3xl font-semibold leading-none tracking-display text-khaki md:text-4xl">
              SEM DEFENDER
            </h1>
            <p className="mt-1 font-mono text-[10px] tracking-widest text-accent">
              COUNTER-UAS FIRE CONTROL
            </p>
          </div>
          <CompassRose />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-lg border border-line bg-surface/90 px-3 py-2 font-mono text-xs tabular-nums text-muted">
            T+{formatClock(hud.elapsed)}
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button
              type="button"
              aria-pressed={ledgerOpen}
              onClick={() => setLedgerOpen((open) => !open)}
              className="h-11 rounded-md border border-line bg-surface px-3 font-mono text-xs text-fg hover:bg-surface-2"
            >
              Ledger
            </button>
            <button
              type="button"
              aria-pressed={view === "2d"}
              onClick={() => onViewChange(view === "2d" ? "3d" : "2d")}
              className="h-11 rounded-md border border-line bg-surface px-3 font-mono text-xs text-fg hover:bg-surface-2"
            >
              {view === "2d" ? "3D view" : "2D view"}
            </button>
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
              <Radar
                tracks={hud.tracks}
                targetId={hud.targetId}
                yaw={hud.barrel.yaw}
                effectiveRange={hud.effector.range}
              />
            </div>
          </div>
        </div>
      ) : null}

      {live ? (
        <aside className="pointer-events-none absolute top-24 right-0 z-10 hidden w-[22rem] max-w-[calc(100%-1.5rem)] flex-col gap-3 p-4 md:top-24 md:flex">
          <TrackTable hud={hud} />
        </aside>
      ) : null}

      {live ? (
        <div className="pointer-events-none absolute right-0 bottom-24 z-10 w-full p-3 md:hidden">
          <TrackTable hud={hud} compact />
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-1/2 z-10 hidden -translate-x-1/2 pb-4 md:block">
        <StatusWindow hud={hud} />
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

      <MobileBar hud={hud} />
      {ledgerOpen ? <LedgerPanel entries={hud.ledger} onClose={() => setLedgerOpen(false)} /> : null}
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
      <EffectorPicker id={hud.effector.id} rpm={hud.effector.rpm} range={hud.effector.range} />
      <div className="mt-2 max-h-[min(28rem,52vh)] overflow-y-auto">
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

function LedgerPanel({
  entries,
  onClose,
}: {
  entries: readonly LedgerEntry[];
  onClose: () => void;
}) {
  const rows = [...entries].reverse();
  return (
    <div className="pointer-events-auto absolute inset-x-3 top-24 z-30 mx-auto max-w-4xl md:inset-x-auto md:right-4 md:left-auto md:w-[44rem]">
      <section
        className="flex max-h-[min(28rem,60vh)] flex-col rounded-xl border border-line bg-surface p-3 shadow-lg"
        aria-label="Simulation ledger"
      >
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-mono text-xs tracking-[0.18em] text-muted">LEDGER</h2>
          <span className="font-mono text-[10px] text-dim">{entries.length} rows</span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="h-8 rounded-md border border-line bg-surface-2 px-2 font-mono text-[10px] text-fg hover:bg-surface"
              onClick={() => downloadLedger("csv")}
            >
              CSV
            </button>
            <button
              type="button"
              className="h-8 rounded-md border border-line bg-surface-2 px-2 font-mono text-[10px] text-fg hover:bg-surface"
              onClick={() => downloadLedger("json")}
            >
              JSON
            </button>
            <button
              type="button"
              className="h-8 rounded-md border border-line bg-surface-2 px-2 font-mono text-[10px] text-fg hover:bg-surface"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse font-mono text-[11px] tabular-nums">
            <thead>
              <tr className="text-dim">
                <th className="sticky top-0 bg-surface pb-1 text-left font-medium">When</th>
                <th className="sticky top-0 bg-surface pb-1 text-left font-medium">What</th>
                <th className="sticky top-0 bg-surface pb-1 text-left font-medium">Action</th>
                <th className="sticky top-0 bg-surface pb-1 text-left font-medium">Outcome</th>
                <th className="sticky top-0 bg-surface pb-1 text-right font-medium">AZ</th>
                <th className="sticky top-0 bg-surface pb-1 text-right font-medium">EL</th>
                <th className="sticky top-0 bg-surface pb-1 text-right font-medium">RNG</th>
                <th className="sticky top-0 bg-surface pb-1 text-right font-medium">V</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-2 text-dim">
                    No events. Engage to start a run.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.seq} className="text-muted">
                    <td className="py-0.5 pr-2 text-dim">{formatLedgerWhen(row.when)}</td>
                    <td className="py-0.5 pr-2 text-fg">{row.what}</td>
                    <td className="py-0.5 pr-2">{row.action}</td>
                    <td className="py-0.5 pr-2">{row.outcome}</td>
                    <td className="py-0.5 pr-2 text-right">{formatLedgerDeg(row.az)}</td>
                    <td className="py-0.5 pr-2 text-right">{formatLedgerDeg(row.el)}</td>
                    <td className="py-0.5 pr-2 text-right">{formatLedgerNum(row.rng)}</td>
                    <td className="py-0.5 text-right">{formatLedgerNum(row.v)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function downloadLedger(kind: "csv" | "json"): void {
  const sim = getSim();
  const body = kind === "json" ? sim.ledger.toJson() : sim.ledger.toCsv();
  const mime = kind === "json" ? "application/json" : "text/csv";
  const href = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = href;
  a.download = `sem-defender-ledger.${kind}`;
  a.click();
  URL.revokeObjectURL(href);
}

function formatLedgerWhen(s: number): string {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `T+${String(m).padStart(2, "0")}:${r.toFixed(1).padStart(4, "0")}`;
}

function formatLedgerDeg(deg: number | null): string {
  return deg === null ? "—" : `${deg.toFixed(0)}°`;
}

function formatLedgerNum(n: number | null): string {
  return n === null ? "—" : n.toFixed(0);
}

function EffectorPicker({
  id,
  rpm,
  range,
}: {
  id: string;
  rpm: number;
  range: number;
}) {
  return (
    <div className="pointer-events-auto">
      <div className="flex gap-1">
        {EFFECTOR_IDS.map((eid) => (
          <button
            key={eid}
            type="button"
            aria-pressed={id === eid}
            onClick={() => getSim().setEffector(eid)}
            className={`h-8 flex-1 rounded-md border px-1 font-mono text-[10px] ${
              id === eid
                ? "border-khaki bg-khaki/15 text-khaki"
                : "border-line bg-surface-2 text-muted hover:text-fg"
            }`}
          >
            {eid}
          </button>
        ))}
      </div>
      <p className="mt-1 font-mono text-[10px] text-dim">
        {rpm} rds/min · {range} m
      </p>
    </div>
  );
}

function StatusWindow({ hud }: { hud: ReturnType<typeof getHud> }) {
  return (
    <div className="flex w-[40rem] max-w-[calc(100vw-2rem)] flex-col items-center gap-1.5 rounded-lg border border-line bg-surface/90 px-4 py-2 font-mono text-xs tabular-nums">
      <span className="font-display text-lg font-semibold leading-none tracking-display text-khaki">
        {hud.effector.id}
      </span>
      <div className="flex items-center justify-center gap-2 whitespace-nowrap">
        {hud.phase === "paused" ? <span className="text-warn">PAUSED</span> : null}
        {hud.phase === "paused" ? <span className="text-line">|</span> : null}
        <span className={hud.inRange ? "text-accent" : "text-warn"}>
          {hud.inRange ? "IN RANGE" : "OUT OF RANGE"}
        </span>
        <span className="text-line">|</span>
        <span className={hud.aligned ? "text-accent" : "text-dim"}>
          {hud.aligned ? "LOCKED" : "SLEW"}
        </span>
        {hud.message ? <span className="text-line">|</span> : null}
        {hud.message ? <span className="text-fg">{hud.message}</span> : null}
        <span className="text-line">|</span>
        <span className="text-muted">
          RDS <span className="text-fg">{hud.shots}</span>
        </span>
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
          <span
            className="block h-full bg-accent"
            style={{ width: `${Math.round((1 - hud.cooldown) * 100)}%` }}
          />
        </span>
      </div>
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

function CompassRose() {
  return (
    <svg
      viewBox="0 0 88 88"
      className="size-16 shrink-0 md:size-[4.5rem]"
      role="img"
      aria-label="Compass, north up. Cardinals N, E, S, W."
    >
      <circle cx="44" cy="50" r="24" fill="none" stroke="#252b32" strokeWidth="1.2" />
      <line x1="44" y1="30" x2="44" y2="70" stroke="#252b32" strokeWidth="0.8" />
      <line x1="24" y1="50" x2="64" y2="50" stroke="#252b32" strokeWidth="0.8" />
      <polygon points="44,20 39,38 44,34 49,38" fill="#c9b24a" />
      <text
        x="44"
        y="16"
        textAnchor="middle"
        fill="#c9b24a"
        fontSize="12"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
        fontWeight="700"
      >
        N
      </text>
      <text
        x="80"
        y="54"
        textAnchor="middle"
        fill="#8a929c"
        fontSize="10"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        E
      </text>
      <text
        x="44"
        y="84"
        textAnchor="middle"
        fill="#8a929c"
        fontSize="10"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        S
      </text>
      <text
        x="8"
        y="54"
        textAnchor="middle"
        fill="#8a929c"
        fontSize="10"
        fontFamily="IBM Plex Mono, ui-monospace, monospace"
      >
        W
      </text>
    </svg>
  );
}

function formatClock(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
