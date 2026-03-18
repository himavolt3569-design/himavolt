"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Soft glowing orbs that float behind the menu hero */
function GlowOrbs({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  const orbs = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        position: [
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          -2 - Math.random() * 6,
        ] as [number, number, number],
        scale: 0.15 + Math.random() * 0.35,
        speed: 0.15 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
        color: ["#eaa94d", "#eaa94d", "#1E7B3E", "#6366F1", "#e58f2a"][i % 5],
      })),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const orb = orbs[i];
      const mesh = child as THREE.Mesh;
      mesh.position.y =
        orb.position[1] +
        Math.sin(t * orb.speed + orb.offset) * 0.8 -
        scrollProgress * 2;
      mesh.position.x =
        orb.position[0] + Math.cos(t * orb.speed * 0.7 + orb.offset) * 0.4;
      const s = orb.scale * (1 + Math.sin(t * orb.speed * 1.5 + orb.offset) * 0.15);
      mesh.scale.setScalar(s);
    });
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            color={orb.color}
            transparent
            opacity={0.12}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Camera subtle drift */
function MenuCamera({ scrollProgress }: { scrollProgress: number }) {
  const cameraRef = useRef({ x: 0, y: 0 });

  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime();
    camera.position.x = Math.sin(t * 0.1) * 0.3;
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      0.5 - scrollProgress * 2,
      0.03,
    );
  });

  return null;
}

function Scene({ scrollProgress }: { scrollProgress: number }) {
  return (
    <>
      <MenuCamera scrollProgress={scrollProgress} />
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 5]} intensity={0.8} color="#eaa94d" distance={15} />
      <GlowOrbs scrollProgress={scrollProgress} />
      <fog attach="fog" args={["#F7F8FA", 5, 18]} />
    </>
  );
}

export default function MenuScrollCanvas() {
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      setScrollProgress(Math.min(scrollY / docHeight, 1));
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <Canvas
        camera={{ position: [0, 0.5, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <Scene scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
}
