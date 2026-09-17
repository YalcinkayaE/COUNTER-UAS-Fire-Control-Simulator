import { DETECT_RADIUS } from "@/sims/constants";
import type { TrackRow } from "@/sims/simulation";

type Props = {
  tracks: TrackRow[];
  targetId: string | null;
  yaw: number;
};

export function Radar({ tracks, targetId, yaw }: Props) {
  const scale = 96 / DETECT_RADIUS;
  return (
    <svg
      viewBox="0 0 220 220"
      className="h-full w-full"
      role="img"
      aria-label="Polar radar, Echodyne 10 Hz, 2 kilometer scope"
    >
      <defs>
        <radialGradient id="scope" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9eb8a8" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#08090b" stopOpacity="0.0" />
        </radialGradient>
      </defs>
      <rect width="220" height="220" fill="#08090b" />
      <circle cx="110" cy="110" r="100" fill="url(#scope)" />
      <circle cx="110" cy="110" r="100" fill="none" stroke="#c9b24a" strokeWidth="1.4" />
      <circle cx="110" cy="110" r="50" fill="none" stroke="#ee7f1a" strokeWidth="1.3" />
      <circle cx="110" cy="110" r="25" fill="none" stroke="#e44535" strokeWidth="1.3" />
      <circle cx="110" cy="110" r="75" fill="none" stroke="#252b32" strokeWidth="0.8" />
      <line x1="110" y1="8" x2="110" y2="212" stroke="#252b32" strokeWidth="0.8" />
      <line x1="8" y1="110" x2="212" y2="110" stroke="#252b32" strokeWidth="0.8" />
      <g>
        <path d="M110 110 L110 10 A100 100 0 0 1 148 18 Z" fill="#9eb8a8" opacity="0.12">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 110 110"
            to="360 110 110"
            dur="4.8s"
            repeatCount="indefinite"
          />
        </path>
        <line x1="110" y1="110" x2="110" y2="10" stroke="#9eb8a8" strokeWidth="1.2">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 110 110"
            to="360 110 110"
            dur="4.8s"
            repeatCount="indefinite"
          />
        </line>
      </g>
      <g
        transform={`translate(110 110) rotate(${(-yaw * 180) / Math.PI})`}
        stroke="#d7dce2"
        strokeWidth="1.4"
      >
        <line x1="0" y1="0" x2="0" y2="-18" />
        <polygon points="0,-22 -3,-14 3,-14" fill="#d7dce2" />
      </g>
      {tracks.map((t) => {
        const x = 110 + t.x * scale;
        const y = 110 - t.z * scale;
        const imminent = Number.isFinite(t.timeToBreach) && t.timeToBreach < 8;
        const isTarget = t.id === targetId;
        const fill = imminent ? "#c45c4a" : t.kind === "fixedWing" ? "#c9b24a" : "#9eb8a8";
        return (
          <g key={t.id}>
            {isTarget ? (
              <circle cx={x} cy={y} r="7" fill="none" stroke="#d7dce2" strokeWidth="1" />
            ) : null}
            {t.kind === "fixedWing" ? (
              <polygon
                points={`${x},${y - 4} ${x + 3.2},${y + 2.4} ${x - 3.2},${y + 2.4}`}
                fill={fill}
              />
            ) : (
              <circle cx={x} cy={y} r={isTarget ? 3.4 : 2.4} fill={fill} />
            )}
          </g>
        );
      })}
      <text x="110" y="18" textAnchor="middle" fill="#c9b24a" fontSize="9" fontFamily="IBM Plex Mono">
        N
      </text>
      <text x="208" y="102" textAnchor="middle" fill="#8a929c" fontSize="9" fontFamily="IBM Plex Mono">
        E
      </text>
      <text x="110" y="216" textAnchor="middle" fill="#8a929c" fontSize="9" fontFamily="IBM Plex Mono">
        S
      </text>
      <text x="12" y="114" textAnchor="middle" fill="#8a929c" fontSize="9" fontFamily="IBM Plex Mono">
        W
      </text>
      <text x="186" y="126" fill="#c9b24a" fontSize="8" fontFamily="IBM Plex Mono">
        2 km
      </text>
      <text x="164" y="114" fill="#ee7f1a" fontSize="8" fontFamily="IBM Plex Mono">
        1
      </text>
      <text x="138" y="114" fill="#e44535" fontSize="8" fontFamily="IBM Plex Mono">
        0.5
      </text>
    </svg>
  );
}
