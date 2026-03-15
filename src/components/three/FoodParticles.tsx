"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SPRINKLE_COLORS = [
  "#E23744", "#FF6B81", "#FF9933", "#FFB347",
  "#1E7B3E", "#34D399", "#6366F1", "#818CF8",
  "#D4A052", "#CC0033",
];

/** Colorful sprinkle-like particles scattered across the scene */
export default function FoodParticles({
  count = 120,
  scrollProgress = 0,
}: {
  count?: number;
  scrollProgress?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: [
          (Math.random() - 0.5) * 24,
          (Math.random() - 0.5) * 18,
          -1 - Math.random() * 12,
        ] as [number, number, number],
        scale: 0.03 + Math.random() * 0.08,
        speed: 0.15 + Math.random() * 0.6,
        rotSpeed: (Math.random() - 0.5) * 3,
        offset: Math.random() * Math.PI * 2,
        colorIndex: Math.floor(Math.random() * SPRINKLE_COLORS.length),
      });
    }
    return temp;
  }, [count]);

  // Set per-instance colors
  useEffect(() => {
    if (!meshRef.current) return;
    const color = new THREE.Color();
    particles.forEach((p, i) => {
      color.set(SPRINKLE_COLORS[p.colorIndex]);
      meshRef.current.setColorAt(i, color);
    });
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [particles]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    particles.forEach((p, i) => {
      const scroll = scrollProgress * 10;
      dummy.position.set(
        p.position[0] + Math.sin(t * p.speed * 0.5 + p.offset) * 0.6,
        p.position[1] + Math.cos(t * p.speed * 0.3 + p.offset) * 0.5 - scroll * p.speed * 0.25,
        p.position[2] + Math.sin(t * p.speed * 0.2) * 0.4,
      );
      dummy.rotation.x = t * p.rotSpeed * 0.4;
      dummy.rotation.y = t * p.rotSpeed * 0.6;
      dummy.rotation.z = t * p.rotSpeed * 0.3;
      const s = p.scale * (1 + Math.sin(t * p.speed + p.offset) * 0.3);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <capsuleGeometry args={[0.3, 1, 4, 8]} />
      <meshStandardMaterial roughness={0.35} metalness={0.05} transparent opacity={0.75} />
    </instancedMesh>
  );
}
