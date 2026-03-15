"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ── Donut (torus with icing + sprinkles) ──────────────────────────── */
function Donut({
  position,
  color,
  icingColor,
  speed,
  rotSpeed,
  scale,
  scrollProgress,
}: {
  position: [number, number, number];
  color: string;
  icingColor: string;
  speed: number;
  rotSpeed: number;
  scale: number;
  scrollProgress: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y =
      position[1] + Math.sin(t * speed + offset) * 0.7 - scrollProgress * 3 * speed;
    ref.current.position.x =
      position[0] + Math.cos(t * speed * 0.6 + offset) * 0.4;
    ref.current.rotation.x += rotSpeed * 0.006;
    ref.current.rotation.y += rotSpeed * 0.01;
    ref.current.rotation.z += rotSpeed * 0.004;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Dough body */}
      <mesh>
        <torusGeometry args={[1, 0.45, 20, 40]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
      </mesh>
      {/* Icing on top half */}
      <mesh position={[0, 0.08, 0]}>
        <torusGeometry args={[1, 0.48, 20, 40, Math.PI]} />
        <meshStandardMaterial color={icingColor} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Sprinkle dots */}
      {[0, 1.2, 2.4, 3.6, 5].map((angle, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(angle) * 1,
            0.35,
            Math.sin(angle) * 1,
          ]}
          scale={0.08}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={["#E23744", "#FF9933", "#1E7B3E", "#6366F1", "#FFB347"][i]}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ── Sandwich (layered box shapes) ─────────────────────────────────── */
function Sandwich({
  position,
  speed,
  rotSpeed,
  scale,
  scrollProgress,
}: {
  position: [number, number, number];
  speed: number;
  rotSpeed: number;
  scale: number;
  scrollProgress: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y =
      position[1] + Math.sin(t * speed + offset) * 0.6 - scrollProgress * 3 * speed;
    ref.current.position.x =
      position[0] + Math.cos(t * speed * 0.5 + offset) * 0.35;
    ref.current.rotation.x += rotSpeed * 0.005;
    ref.current.rotation.y += rotSpeed * 0.008;
    ref.current.rotation.z += rotSpeed * 0.003;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Bottom bread — rounded */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[2.2, 0.35, 1.4]} />
        <meshStandardMaterial color="#D4A052" roughness={0.6} />
      </mesh>
      {/* Lettuce */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[2.3, 0.12, 1.5]} />
        <meshStandardMaterial color="#4CAF50" roughness={0.5} />
      </mesh>
      {/* Tomato */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[2.1, 0.1, 1.3]} />
        <meshStandardMaterial color="#E23744" roughness={0.4} />
      </mesh>
      {/* Cheese */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[2.2, 0.08, 1.4]} />
        <meshStandardMaterial color="#FFB347" roughness={0.35} />
      </mesh>
      {/* Meat/patty */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[2, 0.2, 1.3]} />
        <meshStandardMaterial color="#8B4513" roughness={0.55} />
      </mesh>
      {/* Top bread — curved */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.2, 0.4, 1.4]} />
        <meshStandardMaterial color="#D4A052" roughness={0.6} />
      </mesh>
    </group>
  );
}

/* ── Cake (layered cylinder with cherry on top) ────────────────────── */
function Cake({
  position,
  speed,
  rotSpeed,
  scale,
  scrollProgress,
}: {
  position: [number, number, number];
  speed: number;
  rotSpeed: number;
  scale: number;
  scrollProgress: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y =
      position[1] + Math.sin(t * speed + offset) * 0.5 - scrollProgress * 3 * speed;
    ref.current.position.x =
      position[0] + Math.cos(t * speed * 0.7 + offset) * 0.3;
    ref.current.rotation.y += rotSpeed * 0.008;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Bottom tier */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.5, 24]} />
        <meshStandardMaterial color="#FF6B81" roughness={0.4} />
      </mesh>
      {/* Cream layer */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[1.25, 1.25, 0.08, 24]} />
        <meshStandardMaterial color="#FFF5F0" roughness={0.3} />
      </mesh>
      {/* Top tier */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.4, 24]} />
        <meshStandardMaterial color="#E23744" roughness={0.4} />
      </mesh>
      {/* Icing drip */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.06, 24]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.25} />
      </mesh>
      {/* Cherry on top */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#CC0033" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Cherry stem */}
      <mesh position={[0.02, 1.18, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
        <meshStandardMaterial color="#2E7D32" />
      </mesh>
      {/* Candle */}
      <mesh position={[0.4, 1, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.35, 6]} />
        <meshStandardMaterial color="#FFB347" />
      </mesh>
      {/* Flame */}
      <mesh position={[0.4, 1.22, 0]}>
        <coneGeometry args={[0.06, 0.12, 8]} />
        <meshBasicMaterial color="#FF9933" />
      </mesh>
    </group>
  );
}

/* ── Cupcake ───────────────────────────────────────────────────────── */
function Cupcake({
  position,
  speed,
  rotSpeed,
  scale,
  scrollProgress,
}: {
  position: [number, number, number];
  speed: number;
  rotSpeed: number;
  scale: number;
  scrollProgress: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const offset = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y =
      position[1] + Math.sin(t * speed + offset) * 0.6 - scrollProgress * 3 * speed;
    ref.current.position.x =
      position[0] + Math.cos(t * speed * 0.6 + offset) * 0.3;
    ref.current.rotation.y += rotSpeed * 0.007;
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Cup/wrapper */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.35, 0.6, 16]} />
        <meshStandardMaterial color="#FFB347" roughness={0.5} />
      </mesh>
      {/* Frosting swirl */}
      <mesh position={[0, 0.5, 0]}>
        <coneGeometry args={[0.55, 0.6, 16]} />
        <meshStandardMaterial color="#FF6B81" roughness={0.35} />
      </mesh>
      {/* Cherry */}
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#E23744" />
      </mesh>
    </group>
  );
}

/* ── Scene layout ──────────────────────────────────────────────────── */

export default function FloatingFoodShapes({
  scrollProgress = 0,
}: {
  scrollProgress?: number;
}) {
  return (
    <group>
      {/* Donuts */}
      <Donut position={[-5, 3, -3]} color="#D4A052" icingColor="#FF6B81" speed={0.35} rotSpeed={0.8} scale={0.5} scrollProgress={scrollProgress} />
      <Donut position={[5.5, -1, -5]} color="#C8903C" icingColor="#6366F1" speed={0.45} rotSpeed={0.7} scale={0.35} scrollProgress={scrollProgress} />
      <Donut position={[-2, -4, -7]} color="#D4A052" icingColor="#FF9933" speed={0.3} rotSpeed={0.6} scale={0.25} scrollProgress={scrollProgress} />
      <Donut position={[3, 4, -6]} color="#B8843A" icingColor="#E23744" speed={0.4} rotSpeed={0.9} scale={0.3} scrollProgress={scrollProgress} />

      {/* Sandwiches */}
      <Sandwich position={[4, 2, -4]} speed={0.38} rotSpeed={0.7} scale={0.4} scrollProgress={scrollProgress} />
      <Sandwich position={[-6, -2, -6]} speed={0.32} rotSpeed={0.5} scale={0.3} scrollProgress={scrollProgress} />
      <Sandwich position={[1, 5, -8]} speed={0.28} rotSpeed={0.4} scale={0.22} scrollProgress={scrollProgress} />

      {/* Cakes */}
      <Cake position={[-4, 0, -5]} speed={0.3} rotSpeed={0.5} scale={0.4} scrollProgress={scrollProgress} />
      <Cake position={[6, -3, -7]} speed={0.35} rotSpeed={0.4} scale={0.28} scrollProgress={scrollProgress} />

      {/* Cupcakes */}
      <Cupcake position={[2, -2, -4]} speed={0.42} rotSpeed={0.8} scale={0.5} scrollProgress={scrollProgress} />
      <Cupcake position={[-3, 4, -6]} speed={0.36} rotSpeed={0.6} scale={0.35} scrollProgress={scrollProgress} />
      <Cupcake position={[0, -5, -5]} speed={0.28} rotSpeed={0.5} scale={0.3} scrollProgress={scrollProgress} />
    </group>
  );
}
