import { Grid, Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CAMERA_2D_POLAR,
  cameraFitRadius,
  CAMERA_3D_POLAR,
  CAMERA_3D_POLAR_MAX,
  CAMERA_3D_POLAR_MIN,
  CAMERA_3D_RADIUS,
  CAMERA_MAX_RADIUS,
  CAMERA_MIN_RADIUS,
  CAMERA_NORTH_AZIMUTH,
  CAMERA_TARGET_Y,
  UAV_CONTACT_HIDE_M,
  applyPpiProjection,
  northLockedCameraPosition,
  uavContactWorldSize,
  type ViewMode,
} from "@/sims/camera";
import {
  DETECT_RADIUS,
  FIXED_WING_COUNT,
  KILL_ZONE,
  MAX_IN_FLIGHT,
  OUTER_RADIUS,
  QUAD_COUNT,
  UAV_FIXED_WING_CONTACT,
  UAV_IMMINENT_CONTACT,
  UAV_QUAD_CONTACT,
} from "@/sims/constants";
import { getSim } from "@/sims/simulation";

const _camTarget = new THREE.Vector3(0, CAMERA_TARGET_Y, 0);

export function Scene({ view }: { view: ViewMode }) {
  return (
    <>
      <color attach="background" args={["#08090b"]} />
      <FogSync />
      <hemisphereLight args={["#8a96a4", "#161a1e", 0.55]} />
      <ambientLight intensity={0.32} />
      <directionalLight
        position={[420, 780, 260]}
        intensity={1.15}
        color="#d7dde4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={2200}
        shadow-camera-left={-900}
        shadow-camera-right={900}
        shadow-camera-top={900}
        shadow-camera-bottom={-900}
      />
      <pointLight position={[0, 36, 0]} intensity={14} distance={220} color="#d7dde4" />
      <Stars radius={8000} depth={90} count={900} factor={3} saturation={0} fade speed={0.2} />
      <Ground />
      <Perimeter />
      <UgvInterceptor />
      <DroneField />
      <Projectiles />
      <Bursts />
      <LeadMarker />
      <NorthLockedControls view={view} />
      <SimLoop />
    </>
  );
}

function FogSync() {
  useFrame(({ camera, scene }) => {
    const fog = scene.fog;
    if (!(fog instanceof THREE.Fog)) return;
    const d = camera.position.distanceTo(_camTarget);
    fog.near = Math.max(400, d * 0.65);
    fog.far = Math.max(fog.near + 800, d * 2.6);
  });
  return <fog attach="fog" args={["#08090b", 2200, 5200]} />;
}

function SimLoop() {
  const reduced = useRef<boolean | null>(null);
  useFrame((state, delta) => {
    const sim = getSim();
    sim.camera = state.camera;
    sim.viewport = { w: state.size.width, h: state.size.height };
    if (reduced.current === null) {
      reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    sim.reducedMotion = reduced.current;
    sim.update(delta);
    if (state.camera) applyPpiProjection(state.camera);
  });
  return null;
}

function NorthLockedControls({ view }: { view: ViewMode }) {
  const ref = useRef<OrbitControlsImpl>(null);
  const last3d = useRef({ polar: CAMERA_3D_POLAR, radius: CAMERA_3D_RADIUS });
  const size = useThree((s) => s.size);
  const polarMin = view === "2d" ? CAMERA_2D_POLAR : CAMERA_3D_POLAR_MIN;
  const polarMax = view === "2d" ? CAMERA_2D_POLAR : CAMERA_3D_POLAR_MAX;

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;
    if (view === "2d") {
      last3d.current = { polar: controls.getPolarAngle(), radius: controls.getDistance() };
      const fit = cameraFitRadius(size.width / size.height);
      placeNorthLocked(controls, CAMERA_2D_POLAR, Math.max(controls.getDistance(), fit));
    } else {
      placeNorthLocked(controls, last3d.current.polar, last3d.current.radius);
    }
    controls.update();
  }, [view, size.width, size.height]);

  useFrame(() => {
    const cam = ref.current?.object;
    if (cam) applyPpiProjection(cam);
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableRotate={view === "3d"}
      minDistance={CAMERA_MIN_RADIUS}
      maxDistance={CAMERA_MAX_RADIUS}
      minPolarAngle={polarMin}
      maxPolarAngle={polarMax}
      minAzimuthAngle={CAMERA_NORTH_AZIMUTH}
      maxAzimuthAngle={CAMERA_NORTH_AZIMUTH}
      target={[0, CAMERA_TARGET_Y, 0]}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

function placeNorthLocked(controls: OrbitControlsImpl, polar: number, radius: number): void {
  const [x, y, z] = northLockedCameraPosition(polar, radius);
  controls.object.position.set(x, y, z);
  controls.object.scale.set(1, 1, 1);
  controls.object.lookAt(controls.target);
  applyPpiProjection(controls.object);
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8000, 8000]} />
        <meshStandardMaterial color="#101418" roughness={0.96} metalness={0.04} />
      </mesh>
      <Grid
        args={[2000, 2000]}
        cellSize={50}
        cellThickness={0.6}
        cellColor="#1c232a"
        sectionSize={200}
        sectionThickness={1.1}
        sectionColor="#2a343c"
        fadeDistance={CAMERA_MAX_RADIUS}
        fadeStrength={1.2}
        infiniteGrid
        position={[0, 0.15, 0]}
      />
    </>
  );
}

function ringPoints(radius: number, y: number): [number, number, number][] {
  const n = 256;
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.sin(a) * radius, y, Math.cos(a) * radius]);
  }
  return pts;
}

function Perimeter() {
  const detect = useMemo(() => ringPoints(DETECT_RADIUS, 0.7), []);
  const outer = useMemo(() => ringPoints(OUTER_RADIUS, 0.7), []);
  const kill = useMemo(() => ringPoints(KILL_ZONE, 0.7), []);
  return (
    <group>
      <Line points={detect} color="#c9b24a" lineWidth={1.6} />
      <Line points={outer} color="#ee7f1a" lineWidth={1.5} />
      <Line points={kill} color="#e44535" lineWidth={1.4} />
      <SpokeLines />
      <Cardinals />
    </group>
  );
}

function SpokeLines() {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pts.push([0, 0.5, 0], [Math.sin(a) * DETECT_RADIUS, 0.5, Math.cos(a) * DETECT_RADIUS]);
    }
    return pts;
  }, []);
  return <Line points={points} segments color="#5a2a24" lineWidth={1} />;
}

function Cardinals() {
  const y = 24;
  const r = DETECT_RADIUS + 120;
  return (
    <group>
      <CardinalLabel text="N" position={[0, y, r]} accent />
      <CardinalLabel text="E" position={[r, y, 0]} />
      <CardinalLabel text="S" position={[0, y, -r]} />
      <CardinalLabel text="W" position={[-r, y, 0]} />
      <NorthPointer />
    </group>
  );
}

function NorthPointer() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const z0 = DETECT_RADIUS + 8;
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 1.4, z0 + 90, -36, 1.4, z0, 36, 1.4, z0], 3),
    );
    return g;
  }, []);
  return (
    <mesh geometry={geom} renderOrder={3}>
      <meshBasicMaterial color="#c9b24a" side={THREE.DoubleSide} fog={false} />
    </mesh>
  );
}

function CardinalLabel({
  text,
  position,
  accent = false,
}: {
  text: string;
  position: [number, number, number];
  accent?: boolean;
}) {
  return (
    <Html position={position} center sprite pointerEvents="none" zIndexRange={[1, 0]}>
      <div
        className={`font-mono text-sm font-bold tracking-widest md:text-base ${
          accent ? "text-khaki" : "text-muted"
        }`}
      >
        {text}
      </div>
    </Html>
  );
}

const KHAKI = "#c9b24a";
const KHAKI_DEEP = "#9e8a32";
const KHAKI_LIGHT = "#d8c45e";
const KHAKI_METAL = "#b39a40";
const KHAKI_MARK = "#2e2a14";

function KangalMark({
  position,
  rotation,
  width,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("KANGAL mark canvas 2D context unavailable");
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = KHAKI_MARK;
    ctx.font = "700 78px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("KANGAL", 256, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
  }, []);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, width * 0.25]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

function UgvInterceptor() {
  const turret = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const t = getSim().turret;
    if (turret.current) turret.current.quaternion.copy(t.quaternion);
    if (flash.current) {
      flash.current.intensity = t.burstLeft > 0 ? 48 : 0;
    }
  });

  const wheel = (x: number, z: number) => (
    <group key={`${x}:${z}`} position={[x, 1.15, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[1.2, 1.2, 1.15, 16]} />
        <meshStandardMaterial color="#12161a" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.58, 0.58, 1.22, 12]} />
        <meshStandardMaterial color={KHAKI_METAL} metalness={0.55} roughness={0.32} />
      </mesh>
    </group>
  );

  return (
    <group scale={4}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} receiveShadow>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial color="#5a5340" roughness={0.88} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.35, 0]} castShadow>
        <boxGeometry args={[9.2, 2.3, 16.4]} />
        <meshStandardMaterial color={KHAKI} roughness={0.52} metalness={0.22} />
      </mesh>
      <mesh position={[0, 3.55, 0]} castShadow>
        <boxGeometry args={[8.4, 0.38, 15]} />
        <meshStandardMaterial color={KHAKI_LIGHT} roughness={0.42} metalness={0.28} />
      </mesh>
      <mesh position={[0, 2.55, 7.6]} castShadow>
        <boxGeometry args={[8.6, 1.7, 3.2]} />
        <meshStandardMaterial color={KHAKI_DEEP} roughness={0.5} metalness={0.22} />
      </mesh>
      <mesh position={[0, 3.7, 8.2]}>
        <boxGeometry args={[3.2, 0.7, 1.4]} />
        <meshStandardMaterial color={KHAKI_METAL} metalness={0.4} roughness={0.32} />
      </mesh>
      <KangalMark position={[4.62, 2.45, 0]} rotation={[0, Math.PI / 2, 0]} width={5.2} />
      <KangalMark position={[-4.62, 2.45, 0]} rotation={[0, -Math.PI / 2, 0]} width={5.2} />
      <KangalMark position={[0, 3.78, 5.2]} rotation={[-Math.PI / 2, 0, Math.PI]} width={4.6} />
      {[-5.4, 0, 5.4].flatMap((z) => [-5.35, 5.35].map((x) => wheel(x, z)))}
      <group position={[0, 5.35, -1.1]}>
        <mesh position={[0, -0.55, 0]} castShadow>
          <cylinderGeometry args={[2.5, 2.9, 1.15, 14]} />
          <meshStandardMaterial color={KHAKI_METAL} metalness={0.42} roughness={0.34} />
        </mesh>
        <group ref={turret}>
          <mesh castShadow>
            <boxGeometry args={[5.6, 3.6, 6.8]} />
            <meshStandardMaterial color={KHAKI_LIGHT} metalness={0.38} roughness={0.3} />
          </mesh>
          <KangalMark position={[0, 1.84, 0]} rotation={[-Math.PI / 2, 0, Math.PI]} width={4.2} />
          <mesh position={[0, 0.25, 8.6]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.78, 0.58, 15.5, 14]} />
            <meshStandardMaterial color={KHAKI_METAL} metalness={0.55} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.25, 16.5]}>
            <cylinderGeometry args={[0.95, 0.95, 1.3, 12]} />
            <meshStandardMaterial
              color={KHAKI_LIGHT}
              emissive={KHAKI}
              emissiveIntensity={0.35}
              metalness={0.45}
              roughness={0.24}
            />
          </mesh>
          <pointLight ref={flash} position={[0, 0.2, 17.2]} color="#f3f0d8" distance={90} />
        </group>
      </group>
    </group>
  );
}

function DroneField() {
  return (
    <>
      {Array.from({ length: QUAD_COUNT }, (_, i) => (
        <group key={`q${i}`}>
          <DroneMesh index={i} />
          <ContactMarker index={i} kind="quad" />
        </group>
      ))}
      {Array.from({ length: FIXED_WING_COUNT }, (_, i) => (
        <group key={`f${i}`}>
          <FixedWingMesh index={QUAD_COUNT + i} />
          <ContactMarker index={QUAD_COUNT + i} kind="fixedWing" />
        </group>
      ))}
    </>
  );
}

function contactColor(kind: "quad" | "fixedWing", imminent: boolean): string {
  if (imminent) return UAV_IMMINENT_CONTACT;
  return kind === "fixedWing" ? UAV_FIXED_WING_CONTACT : UAV_QUAD_CONTACT;
}

function ContactMarker({ index, kind }: { index: number; kind: "quad" | "fixedWing" }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const viewH = useThree((s) => s.size.height);
  useFrame(({ camera }) => {
    const d = getSim().swarm.drones[index];
    const m = mesh.current;
    if (!d || !m) return;
    const dist = camera.position.distanceTo(d.position);
    m.visible = d.alive && dist > UAV_CONTACT_HIDE_M;
    if (!d.alive) return;
    m.position.copy(d.position);
    m.quaternion.copy(camera.quaternion);
    const s = uavContactWorldSize(dist, viewH);
    m.scale.set(s, s, 1);
    if (mat.current) {
      const hot = Number.isFinite(d.timeToBreach) && d.timeToBreach < 8;
      mat.current.color.set(contactColor(kind, hot));
    }
  });
  return (
    <mesh ref={mesh} visible={false} renderOrder={6} frustumCulled={false}>
      <circleGeometry args={[0.5, 16]} />
      <meshBasicMaterial
        ref={mat}
        color={kind === "fixedWing" ? UAV_FIXED_WING_CONTACT : UAV_QUAD_CONTACT}
        fog={false}
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function FixedWingMesh({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const d = getSim().swarm.drones[index];
    const g = group.current;
    if (!d || !g) return;
    g.visible = d.alive;
    if (!d.alive) return;
    g.position.copy(d.position);
    g.lookAt(d.position.x + d.velocity.x, d.position.y, d.position.z + d.velocity.z);
  });
  return (
    <group ref={group} visible={false} scale={16}>
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[0.7, 1, 0.38]} position={[0, 0.06, 0.15]} castShadow>
        <cylinderGeometry args={[0.28, 0.42, 4.2, 10]} />
        <meshStandardMaterial
          color="#e8cc55"
          emissive={UAV_FIXED_WING_CONTACT}
          emissiveIntensity={0.55}
          metalness={0.28}
          roughness={0.36}
          fog={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 2.45]} scale={[0.7, 1, 0.38]} castShadow>
        <coneGeometry args={[0.28, 1.1, 10]} />
        <meshStandardMaterial
          color="#f0d56a"
          emissive={UAV_FIXED_WING_CONTACT}
          emissiveIntensity={0.45}
          metalness={0.3}
          roughness={0.32}
          fog={false}
        />
      </mesh>
      <mesh position={[0, 0.04, -0.15]} castShadow>
        <boxGeometry args={[7.4, 0.1, 1.15]} />
        <meshStandardMaterial
          color="#c9b24a"
          emissive={UAV_FIXED_WING_CONTACT}
          emissiveIntensity={0.35}
          metalness={0.28}
          roughness={0.4}
          fog={false}
        />
      </mesh>
      <mesh position={[0, 0.55, -1.85]} castShadow>
        <boxGeometry args={[0.08, 0.85, 0.7]} />
        <meshStandardMaterial
          color="#e8cc55"
          emissive={UAV_FIXED_WING_CONTACT}
          emissiveIntensity={0.35}
          metalness={0.28}
          roughness={0.36}
          fog={false}
        />
      </mesh>
      <mesh position={[0, 0.08, -1.85]} castShadow>
        <boxGeometry args={[2.2, 0.08, 0.45]} />
        <meshStandardMaterial
          color="#c9b24a"
          emissive={UAV_FIXED_WING_CONTACT}
          emissiveIntensity={0.3}
          metalness={0.28}
          roughness={0.4}
          fog={false}
        />
      </mesh>
    </group>
  );
}

/** Motor tips in drone-local space (+Z forward). Front span is tighter than the tail. */
const QUAD_TIPS: [number, number, number][] = [
  [2.48, 0.12, 2.18],
  [-2.48, 0.12, 2.18],
  [2.78, 0.12, -2.02],
  [-2.78, 0.12, -2.02],
];

const HULL = {
  metalness: 0.32,
  roughness: 0.34,
  color: "#d4eee0",
  emissive: UAV_QUAD_CONTACT,
  emissiveIntensity: 0.42,
  fog: false,
} as const;
const CARBON = { metalness: 0.22, roughness: 0.58, color: "#161b20", fog: false } as const;
const ARM = {
  metalness: 0.36,
  roughness: 0.32,
  color: "#c5e6d4",
  emissive: UAV_QUAD_CONTACT,
  emissiveIntensity: 0.22,
  fog: false,
} as const;

function DroneMesh({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const rotors = useRef<THREE.Group>(null);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const d = getSim().swarm.drones[index];
    const g = group.current;
    if (!d || !g) return;
    g.visible = d.alive;
    if (!d.alive) return;
    g.position.copy(d.position);
    g.lookAt(
      d.position.x + d.velocity.x,
      d.position.y,
      d.position.z + d.velocity.z,
    );
    if (rotors.current) {
      const spin = d.rotor;
      rotors.current.children.forEach((child, i) => {
        child.rotation.y = i % 2 === 0 ? spin : -spin;
      });
    }
    if (led.current) {
      const hot = Number.isFinite(d.timeToBreach) && d.timeToBreach < 8;
      led.current.emissiveIntensity = hot ? 1.6 + Math.sin(d.age * 10) * 0.6 : 0.5;
    }
  });
  return (
    <group ref={group} visible={false} scale={14}>
      {/* One flattened diamond hull — fighter planform, not a box with a cone glued on. */}
      <mesh scale={[0.78, 0.26, 1.72]} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial {...HULL} />
      </mesh>
      {/* Wing glove through the mid-body so the X-frame reads as a fighter, not four sticks. */}
      <mesh position={[0, 0.02, 0.08]} castShadow>
        <boxGeometry args={[2.35, 0.1, 0.95]} />
        <meshStandardMaterial
          color="#c5e6d4"
          emissive={UAV_QUAD_CONTACT}
          emissiveIntensity={0.28}
          metalness={0.32}
          roughness={0.34}
          fog={false}
        />
      </mesh>
      <mesh position={[0, 0.01, -0.35]} castShadow>
        <boxGeometry args={[1.55, 0.08, 0.7]} />
        <meshStandardMaterial
          color="#b7dcc8"
          emissive={UAV_QUAD_CONTACT}
          emissiveIntensity={0.22}
          metalness={0.32}
          roughness={0.36}
          fog={false}
        />
      </mesh>
      {/* Cockpit glass on the spine, camera in the chin. */}
      <mesh position={[0, 0.22, 0.55]} scale={[0.55, 0.32, 0.85]} castShadow>
        <sphereGeometry args={[0.48, 12, 10]} />
        <meshStandardMaterial color="#0c1218" metalness={0.9} roughness={0.08} />
      </mesh>
      <mesh position={[0, -0.04, 1.72]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.22, 12]} />
        <meshStandardMaterial color="#0a0e12" metalness={0.9} roughness={0.08} />
      </mesh>
      <mesh position={[0, -0.04, 1.84]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 12]} />
        <meshStandardMaterial color="#173044" emissive="#1a3a52" emissiveIntensity={0.45} />
      </mesh>
      {/* Carbon plate + battery sled under the hull */}
      <mesh position={[0, -0.08, 0]} castShadow>
        <boxGeometry args={[1.05, 0.12, 1.45]} />
        <meshStandardMaterial {...CARBON} />
      </mesh>
      <mesh position={[0, -0.26, -0.15]} castShadow>
        <boxGeometry args={[0.72, 0.22, 1.15]} />
        <meshStandardMaterial color="#2a3138" metalness={0.28} roughness={0.48} />
      </mesh>
      {/* Twin tails */}
      <mesh position={[0.2, 0.38, -1.22]} castShadow>
        <boxGeometry args={[0.06, 0.52, 0.42]} />
        <meshStandardMaterial color="#c5ccd3" metalness={0.38} roughness={0.36} />
      </mesh>
      <mesh position={[-0.2, 0.38, -1.22]} castShadow>
        <boxGeometry args={[0.06, 0.52, 0.42]} />
        <meshStandardMaterial color="#c5ccd3" metalness={0.38} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.1, -1.68]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial
          ref={led}
          color={UAV_IMMINENT_CONTACT}
          emissive={UAV_IMMINENT_CONTACT}
          emissiveIntensity={1.1}
          fog={false}
        />
      </mesh>
      {QUAD_TIPS.map((tip) => (
        <CarbonArm key={`${tip[0]}:${tip[2]}`} tip={tip} />
      ))}
      <group ref={rotors}>
        {QUAD_TIPS.map((tip) => (
          <group key={`p${tip[0]}:${tip[2]}`} position={[tip[0], tip[1] + 0.32, tip[2]]}>
            <PropDisc />
          </group>
        ))}
      </group>
    </group>
  );
}

function CarbonArm({ tip }: { tip: [number, number, number] }) {
  const [x, y, z] = tip;
  const len = Math.hypot(x, z);
  const yaw = Math.atan2(x, z);
  return (
    <group rotation={[0, yaw, 0]}>
      <mesh position={[0, y, len * 0.52]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, len * 0.92, 8]} />
        <meshStandardMaterial {...ARM} />
      </mesh>
      <mesh position={[0, y + 0.12, len * 0.52]} castShadow>
        <boxGeometry args={[0.22, 0.07, len * 0.9]} />
        <meshStandardMaterial color="#e6ebf0" metalness={0.42} roughness={0.28} />
      </mesh>
      <mesh position={[0, y, len]} castShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.46, 12]} />
        <meshStandardMaterial color="#8b949c" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0, y + 0.26, len]}>
        <cylinderGeometry args={[0.14, 0.14, 0.18, 8]} />
        <meshStandardMaterial color="#d2d8de" metalness={0.72} roughness={0.2} />
      </mesh>
    </group>
  );
}

function PropDisc() {
  return (
    <>
      <mesh>
        <boxGeometry args={[2.35, 0.035, 0.18]} />
        <meshStandardMaterial color="#1a1e22" />
      </mesh>
      <mesh>
        <boxGeometry args={[0.18, 0.035, 2.35]} />
        <meshStandardMaterial color="#1a1e22" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.18, 20]} />
        <meshBasicMaterial
          color="#9aa3ab"
          transparent
          opacity={0.26}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

const _bulletAxis = new THREE.Vector3(0, 1, 0);
const _bulletDir = new THREE.Vector3();
const _bulletDummy = new THREE.Object3D();

function Projectiles() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useFrame(() => {
    const inst = mesh.current;
    if (!inst) return;
    const list = getSim().projectiles;
    for (let i = 0; i < MAX_IN_FLIGHT; i++) {
      const p = list[i];
      if (!p || !p.alive) {
        _bulletDummy.scale.set(0, 0, 0);
        _bulletDummy.position.set(0, -2000, 0);
        _bulletDummy.updateMatrix();
        inst.setMatrixAt(i, _bulletDummy.matrix);
        continue;
      }
      _bulletDir.copy(p.velocity);
      if (_bulletDir.lengthSq() < 1e-8) _bulletDir.set(0, 0, 1);
      else _bulletDir.normalize();
      _bulletDummy.position.copy(p.position);
      _bulletDummy.scale.set(1, 1, 1);
      _bulletDummy.quaternion.setFromUnitVectors(_bulletAxis, _bulletDir);
      _bulletDummy.updateMatrix();
      inst.setMatrixAt(i, _bulletDummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_IN_FLIGHT]} frustumCulled={false}>
      <capsuleGeometry args={[0.85, 11, 3, 6]} />
      <meshStandardMaterial
        color="#f3e3a6"
        emissive="#e8c45a"
        emissiveIntensity={2.4}
        metalness={0.18}
        roughness={0.32}
      />
    </instancedMesh>
  );
}

function Bursts() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const list = getSim().bursts;
    for (let i = 0; i < 8; i++) {
      const m = refs.current[i];
      const b = list[i];
      if (!m) continue;
      if (!b) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.copy(b.position);
      const k = 1 + (b.age / b.life) * 14;
      m.scale.setScalar(k);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 1 - b.age / b.life;
      mat.color.set(b.kind === "breach" ? "#c45c4a" : "#d7e0d8");
    }
  });
  return (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[4, 10, 10]} />
          <meshBasicMaterial transparent opacity={0.8} color="#d7e0d8" />
        </mesh>
      ))}
    </>
  );
}

function LeadMarker() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const sim = getSim();
    const m = ref.current;
    if (!m) return;
    const ic = sim.turret.intercept;
    if (!ic || sim.phase === "briefing") {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(ic.x, ic.y, ic.z);
    m.rotation.y += 0.03;
  });
  return (
    <mesh ref={ref} visible={false}>
      <octahedronGeometry args={[5.5, 0]} />
      <meshBasicMaterial color="#9eb8a8" wireframe transparent opacity={0.85} />
    </mesh>
  );
}
