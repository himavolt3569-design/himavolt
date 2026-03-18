"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import FoodParticles from "./FoodParticles";
import FloatingFoodShapes from "./FloatingFoodShapes";

/** Camera controller that moves based on scroll progress */
function ScrollCamera({ scrollProgress }: { scrollProgress: number }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      2 - scrollProgress * 8,
      0.05,
    );
    camera.position.z = THREE.MathUtils.lerp(
      camera.position.z,
      10 - scrollProgress * 3,
      0.05,
    );
    camera.rotation.x = THREE.MathUtils.lerp(
      camera.rotation.x,
      scrollProgress * -0.12,
      0.05,
    );
  });

  return null;
}

/** Warm lighting that fills the food scene */
function FoodLighting({ scrollProgress }: { scrollProgress: number }) {
  const pointRef = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (!pointRef.current) return;
    const t = clock.getElapsedTime();
    pointRef.current.position.set(
      Math.sin(t * 0.15) * 4 + Math.sin(scrollProgress * Math.PI) * 3,
      3 + Math.sin(t * 0.1) * 1 - scrollProgress * 2,
      5,
    );
  });

  return (
    <>
      <ambientLight intensity={0.6} color="#FFF5EE" />
      <pointLight ref={pointRef} intensity={2} distance={25} color="#eaa94d" />
      <directionalLight position={[5, 5, 5]} intensity={0.5} color="#FFFFFF" />
      <directionalLight position={[-3, 3, 2]} intensity={0.3} color="#e58f2a" />
      {/* Rim light from behind */}
      <pointLight position={[0, 0, -8]} intensity={0.8} distance={15} color="#f1c980" />
    </>
  );
}

/** The main Three.js scene for the landing page */
function Scene({ scrollProgress }: { scrollProgress: number }) {
  return (
    <>
      <ScrollCamera scrollProgress={scrollProgress} />
      <FoodLighting scrollProgress={scrollProgress} />
      <FoodParticles count={100} scrollProgress={scrollProgress} />
      <FloatingFoodShapes scrollProgress={scrollProgress} />
      <fog attach="fog" args={["#FFF5EE", 10, 28]} />
    </>
  );
}

export default function LandingScrollCanvas() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    >
      <Canvas
        camera={{ position: [0, 2, 10], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
      >
        <Scene scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
}
