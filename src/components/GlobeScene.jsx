import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function GlobeScene({ scrollY }) {
  const ref = useRef();

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.1;
      ref.current.position.y = Math.sin(scrollY * 0.005) * 0.5;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} intensity={1} />
      <mesh ref={ref}>
        <sphereGeometry args={[2.2, 64, 64]} />
        <meshStandardMaterial 
          color="#1e3a8a" 
          wireframe={true} 
          transparent={true} 
          opacity={0.3} 
        />
      </mesh>
    </group>
  );
}
