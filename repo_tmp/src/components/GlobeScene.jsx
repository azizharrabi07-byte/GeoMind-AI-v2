import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Globe({ scrollY }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const wireframeRef = useRef();

  const gridPoints = useMemo(() => {
    const pts = [];
    for (let lat = -80; lat <= 80; lat += 10) {
      for (let lng = -180; lng <= 180; lng += 10) {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = lng * (Math.PI / 180);
        const r = 1.8;
        pts.push(new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ));
      }
    }
    return pts;
  }, []);

  const connectionLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i < 120; i++) {
      const a = gridPoints[Math.floor(Math.random() * gridPoints.length)];
      const b = gridPoints[Math.floor(Math.random() * gridPoints.length)];
      if (a && b && a.distanceTo(b) < 2.5 && a.distanceTo(b) > 0.5) {
        const points = [];
        points.push(a.clone());
        const mid = a.clone().lerp(b, 0.5).normalize().multiplyScalar(2.0);
        points.push(mid);
        points.push(b.clone());
        const curve = new THREE.CatmullRomCurve3(points);
        lines.push(curve.getPoints(20));
      }
    }
    return lines;
  }, [gridPoints]);

  const particlesRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.04 + (scrollY || 0) * 0.0001;
      groupRef.current.rotation.x = Math.sin(t * 0.02) * 0.1;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.02;
    }
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const idx = Math.floor(i / 3);
        const speed = 0.2 + (idx % 5) * 0.05;
        positions[i + 1] += Math.sin(t * speed + idx) * 0.002;
        positions[i] += Math.cos(t * speed * 0.7 + idx * 0.5) * 0.002;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.8, 48, 48]} />
        <meshPhysicalMaterial
          color="#1e293b"
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.6}
          envMapIntensity={0.5}
        />
      </mesh>

      <mesh ref={wireframeRef}>
        <sphereGeometry args={[1.82, 24, 18]} />
        <meshBasicMaterial
          wireframe
          color="#334155"
          transparent
          opacity={0.3}
        />
      </mesh>

      {connectionLines.map((points, i) => (
        <mesh key={i}>
          <tubeGeometry
            args={[new THREE.CatmullRomCurve3(points), 12, 0.008, 6, false]}
          />
          <meshBasicMaterial
            color="#6366f1"
            transparent
            opacity={0.08 + Math.random() * 0.08}
          />
        </mesh>
      ))}

      {gridPoints.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshBasicMaterial color="#818cf8" opacity={0.4 + Math.random() * 0.3} transparent />
        </mesh>
      ))}

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={400}
            array={new Float32Array(Array.from({ length: 1200 }, () =>
              (Math.random() - 0.5) * 12
            ))}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          color="#a5b4fc"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

export default function GlobeScene({ scrollY }) {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, -2, -4]} intensity={0.3} color="#6366f1" />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#818cf8" />
      <Globe scrollY={scrollY} />
    </>
  );
}
