import { Grid, OrbitControls, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { KILL_ZONE, OUTER_RADIUS } from "@/game/constants";
import { getSim } from "@/game/simulation";

export function Scene() {
  return (
    <>
      <color attach="background" args={["#08090b"]} />
      <fog attach="fog" args={["#08090b", 700, 2400]} />
      <hemisphereLight args={["#8a96a4", "#161a1e", 0.55]} />
      <ambientLight intensity={0.18} />
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
      <pointLight position={[0, 28, 0]} intensity={8} distance={180} color="#9eb8a8" />
      <Stars radius={1800} depth={90} count={900} factor={3} saturation={0} fade speed={0.2} />
      <Ground />
      <Perimeter />
      <Facility />
      <TurretMesh />
      <DroneField />
      <Projectiles />
      <Tracers />
      <Bursts />
      <LeadMarker />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={220}
        maxDistance={1600}
        minPolarAngle={0.28}
        maxPolarAngle={1.22}
        target={[0, 8, 0]}
        enableDamping
        dampingFactor={0.08}
      />
      <SimLoop />
    </>
  );
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
    const sh = sim.shakeOffset();
    state.camera.position.x += sh.x;
    state.camera.position.y += sh.y;
    state.camera.position.z += sh.z;
  });
  return null;
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2800, 2800]} />
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
        fadeDistance={1800}
        fadeStrength={1.2}
        infiniteGrid
        position={[0, 0.15, 0]}
      />
    </>
  );
}

function Perimeter() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
        <ringGeometry args={[OUTER_RADIUS - 2.4, OUTER_RADIUS + 2.4, 160]} />
        <meshBasicMaterial color="#6ea88a" transparent opacity={0.82} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.45, 0]}>
        <ringGeometry args={[KILL_ZONE - 2.6, KILL_ZONE + 2.6, 160]} />
        <meshBasicMaterial color="#c45c4a" transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[0.1, KILL_ZONE, 80]} />
        <meshBasicMaterial color="#c45c4a" transparent opacity={0.045} side={THREE.DoubleSide} />
      </mesh>
      <SpokeLines />
    </group>
  );
}

function SpokeLines() {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      pts.push(0, 0.5, 0, Math.cos(a) * OUTER_RADIUS, 0.5, Math.sin(a) * OUTER_RADIUS);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#1e262c" />
    </lineSegments>
  );
}

function Facility() {
  return (
    <group>
      <mesh position={[0, 1.2, 0]} receiveShadow>
        <cylinderGeometry args={[42, 48, 2.4, 8]} />
        <meshStandardMaterial color="#2a3138" roughness={0.7} metalness={0.2} />
      </mesh>
      <mesh position={[18, 8, 12]} castShadow>
        <boxGeometry args={[16, 12, 22]} />
        <meshStandardMaterial color="#3a424a" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[-16, 6, -8]} castShadow>
        <boxGeometry args={[14, 8, 14]} />
        <meshStandardMaterial color="#323940" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 3.4, 0]}>
        <cylinderGeometry args={[8, 10, 4, 12]} />
        <meshStandardMaterial color="#4a525a" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

function TurretMesh() {
  const yaw = useRef<THREE.Group>(null);
  const flash = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const t = getSim().turret;
    if (yaw.current) yaw.current.quaternion.copy(t.quaternion);
    if (flash.current) {
      const hot = getSim().turret.cooldown > 0.92;
      flash.current.intensity = hot ? 40 : 0;
    }
  });
  return (
    <group position={[0, 14, 0]}>
      <mesh position={[0, -6, 0]} castShadow>
        <cylinderGeometry args={[3.4, 4.2, 8, 10]} />
        <meshStandardMaterial color="#5a636c" metalness={0.45} roughness={0.35} />
      </mesh>
      <group ref={yaw}>
        <mesh castShadow>
          <boxGeometry args={[6.5, 4.2, 8]} />
          <meshStandardMaterial color="#8b949c" metalness={0.5} roughness={0.32} />
        </mesh>
        <mesh position={[0, 0.4, 9]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.85, 0.7, 16, 10]} />
          <meshStandardMaterial color="#c5ccd2" metalness={0.6} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0.4, 17.2]}>
          <boxGeometry args={[1.4, 1.4, 1.2]} />
          <meshStandardMaterial color="#9eb8a8" emissive="#9eb8a8" emissiveIntensity={0.4} />
        </mesh>
        <pointLight ref={flash} position={[0, 0, 18]} color="#e8f0ea" distance={80} />
      </group>
    </group>
  );
}

function DroneField() {
  return (
    <>
      {Array.from({ length: 20 }, (_, i) => (
        <DroneMesh key={i} index={i} />
      ))}
    </>
  );
}

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
      d.position.y + d.velocity.y,
      d.position.z + d.velocity.z,
    );
    if (rotors.current) rotors.current.rotation.z = d.rotor;
    if (led.current) {
      const hot = Number.isFinite(d.timeToBreach) && d.timeToBreach < 8;
      led.current.emissiveIntensity = hot ? 1.6 + Math.sin(d.age * 10) * 0.6 : 0.5;
    }
  });
  return (
    <group ref={group} visible={false} scale={9}>
      <mesh castShadow>
        <boxGeometry args={[3.2, 1.1, 5.4]} />
        <meshStandardMaterial color="#3a4148" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.2, 3.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.7, 1.8, 6]} />
        <meshStandardMaterial color="#4a525a" />
      </mesh>
      <mesh position={[0, 0.7, 1.4]}>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial
          ref={led}
          color="#c45c4a"
          emissive="#c45c4a"
          emissiveIntensity={0.6}
        />
      </mesh>
      <group ref={rotors}>
        <Rotor arm={[2.6, 0.4, 2.1]} />
        <Rotor arm={[-2.6, 0.4, 2.1]} />
        <Rotor arm={[2.6, 0.4, -2.1]} />
        <Rotor arm={[-2.6, 0.4, -2.1]} />
      </group>
    </group>
  );
}

function Rotor({ arm }: { arm: [number, number, number] }) {
  return (
    <group position={arm}>
      <mesh>
        <boxGeometry args={[0.18, 0.18, 2.4]} />
        <meshStandardMaterial color="#2a3036" />
      </mesh>
      <mesh>
        <boxGeometry args={[3.4, 0.08, 0.35]} />
        <meshStandardMaterial color="#6a7380" />
      </mesh>
    </group>
  );
}

function Projectiles() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    const list = getSim().projectiles;
    for (let i = 0; i < 4; i++) {
      const m = refs.current[i];
      const p = list[i];
      if (!m) continue;
      if (!p || !p.alive) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      m.position.copy(p.position);
      m.lookAt(p.position.x + p.velocity.x, p.position.y + p.velocity.y, p.position.z + p.velocity.z);
    }
  });
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
          scale={10}
        >
          <capsuleGeometry args={[0.55, 3.2, 4, 8]} />
          <meshStandardMaterial color="#e8eee8" emissive="#9eb8a8" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </>
  );
}

function Tracers() {
  const lines = useMemo(() => [makeLine(), makeLine(), makeLine(), makeLine()], []);
  useFrame(() => {
    const list = getSim().tracers;
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i]!;
      const t = list[i];
      if (!t) {
        ln.visible = false;
        continue;
      }
      ln.visible = true;
      const pos = ln.geometry.getAttribute("position");
      pos.setXYZ(0, t.from.x, t.from.y, t.from.z);
      pos.setXYZ(1, t.to.x, t.to.y, t.to.z);
      pos.needsUpdate = true;
      const mat = ln.material as THREE.LineBasicMaterial;
      mat.opacity = Math.max(0, 1 - t.age / t.life);
    }
  });
  useEffect(() => {
    return () => {
      for (const ln of lines) {
        ln.geometry.dispose();
        (ln.material as THREE.Material).dispose();
      }
    };
  }, [lines]);
  return (
    <>
      {lines.map((ln, i) => (
        <primitive key={i} object={ln} />
      ))}
    </>
  );
}

function makeLine(): THREE.Line {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const m = new THREE.LineBasicMaterial({
    color: 0x9eb8a8,
    transparent: true,
    opacity: 1,
    depthTest: false,
  });
  const line = new THREE.Line(g, m);
  line.frustumCulled = false;
  line.visible = false;
  return line;
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
