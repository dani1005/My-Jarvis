import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

interface GlobeProps {
  rotation: { x: number; y: number };
  scale: number;
  active: boolean;
}

const HolographicMaterial = () => {
  return (
    <meshBasicMaterial
      color="#06b6d4" // Cyan-500
      wireframe={true}
      transparent={true}
      opacity={0.3}
    />
  );
};

const InnerCore = () => {
  return (
    <mesh>
      <sphereGeometry args={[0.95, 32, 32]} />
      <meshBasicMaterial color="#083344" transparent opacity={0.8} />
    </mesh>
  );
};

const RotatingRings = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.2;
      groupRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
       <mesh rotation={[Math.PI / 2, 0, 0]}>
         <torusGeometry args={[1.2, 0.01, 16, 100]} />
         <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
       </mesh>
       <mesh rotation={[0, Math.PI / 4, 0]}>
         <torusGeometry args={[1.4, 0.01, 16, 100]} />
         <meshBasicMaterial color="#06b6d4" transparent opacity={0.3} />
       </mesh>
    </group>
  );
}

const GlobeScene: React.FC<GlobeProps> = ({ rotation, scale, active }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Smoothly interpolate towards target rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotation.x * Math.PI * 2, 0.1);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, rotation.y * Math.PI, 0.1);
      
      // Continuous spin if idle
      if (!active) {
        groupRef.current.rotation.y += 0.005;
      }
      
      const targetScale = active ? scale : 1;
      const currentScale = groupRef.current.scale.x;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.1);
      groupRef.current.scale.set(newScale, newScale, newScale);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <HolographicMaterial />
      </mesh>
      <InnerCore />
      <RotatingRings />
      
      {/* Cities / Points of Interest */}
      <group>
         {[...Array(5)].map((_, i) => {
           const phi = Math.acos(-1 + (2 * i) / 5);
           const theta = Math.sqrt(5 * Math.PI) * phi;
           const x = 1.0 * Math.cos(theta) * Math.sin(phi);
           const y = 1.0 * Math.sin(theta) * Math.sin(phi);
           const z = 1.0 * Math.cos(phi);
           return (
             <mesh key={i} position={[x, y, z]}>
               <sphereGeometry args={[0.02, 8, 8]} />
               <meshBasicMaterial color="#ffffff" />
             </mesh>
           )
         })}
      </group>
    </group>
  );
};

export const Globe: React.FC<GlobeProps> = (props) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
        <GlobeScene {...props} />
      </Canvas>
    </div>
  );
};
