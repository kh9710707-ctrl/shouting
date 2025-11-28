import React, { useRef, useLayoutEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useScroll, Scroll, Environment, Float, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// Helper materials
const chassisMaterial = new THREE.MeshStandardMaterial({ 
    color: "#1a1a1a", 
    metalness: 0.8, 
    roughness: 0.2,
    envMapIntensity: 1
});
const screenMaterial = new THREE.MeshStandardMaterial({ 
    color: "#050505", 
    metalness: 0.9, 
    roughness: 0.1 
});
const displayMaterial = new THREE.MeshBasicMaterial({ color: "#000" }); // Black screen when off
const keyboardMaterial = new THREE.MeshStandardMaterial({ color: "#2a2a2a" });
const highlightMaterial = new THREE.MeshStandardMaterial({ color: "#3b82f6", emissive: "#1d4ed8", emissiveIntensity: 2, toneMapped: false });

export const MacbookExplode: React.FC = () => {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);
  
  // Refs for individual parts to animate
  const lidRef = useRef<THREE.Group>(null);
  const screenPanelRef = useRef<THREE.Mesh>(null);
  const baseRef = useRef<THREE.Group>(null);
  const keyboardRef = useRef<THREE.Mesh>(null);
  const chipRef = useRef<THREE.Mesh>(null);

  // Refs for HTML text animation
  const titleRef = useRef<HTMLHeadingElement>(null);
  const feature1Ref = useRef<HTMLDivElement>(null);
  const feature2Ref = useRef<HTMLDivElement>(null);

  useFrame((state, delta) => {
    const r1 = scroll.range(0, 1); // Global scroll progress 0 to 1
    const r2 = scroll.range(0.2, 0.5); // Middle section

    if (!groupRef.current || !lidRef.current || !baseRef.current || !chipRef.current) return;

    // 1. Rotate the entire laptop based on scroll
    // Starts facing front, rotates to show side/exploded view
    const targetRotationY = -Math.PI * 0.2 + (r1 * Math.PI * 0.4);
    const targetRotationX = Math.PI * 0.1 + (r1 * Math.PI * 0.15);
    
    // Smooth dampening for rotation
    THREE.MathUtils.damp(groupRef.current.rotation, 'y', targetRotationY, 0.5, delta);
    THREE.MathUtils.damp(groupRef.current.rotation, 'x', targetRotationX, 0.5, delta);

    // 2. "Explode" logic (Separating parts)
    // Base moves down
    const basePos = -1 - (r1 * 1.5);
    baseRef.current.position.y = THREE.MathUtils.lerp(baseRef.current.position.y, basePos, 0.1);

    // Lid moves up
    const lidPos = 0.5 + (r1 * 2);
    lidRef.current.position.y = THREE.MathUtils.lerp(lidRef.current.position.y, lidPos, 0.1);
    
    // Open the lid (rotation)
    // At start (0 scroll), lid is closed (-Math.PI/2). As we scroll, it opens (0 or slightly back).
    const openAngle = -Math.PI / 2 + (r1 * (Math.PI / 2 + 0.5));
    lidRef.current.rotation.x = THREE.MathUtils.lerp(lidRef.current.rotation.x, openAngle, 0.1);

    // 3. Chipset Reveal (Floating in middle)
    // Scales up when in the "explode" phase
    const chipScale = r1 * 1;
    chipRef.current.scale.setScalar(THREE.MathUtils.lerp(chipRef.current.scale.x, chipScale, 0.1));
    chipRef.current.rotation.y += delta * 0.5; // Constant spin
    
    // GSAP-like opacity control for HTML elements using raw DOM manipulation for performance
    if (titleRef.current) {
        titleRef.current.style.opacity = `${1 - scroll.range(0, 0.2) * 2}`;
        titleRef.current.style.transform = `translateY(-${scroll.range(0, 0.2) * 50}px)`;
    }
    
    if (feature1Ref.current) {
        const opacity = scroll.curve(0.3, 0.3); // Peak at 30-60%
        feature1Ref.current.style.opacity = `${opacity}`;
        feature1Ref.current.style.transform = `translateY(20px)`;
    }
    
    if (feature2Ref.current) {
        const opacity = scroll.range(0.7, 0.3); // Appears at end
        feature2Ref.current.style.opacity = `${opacity}`;
    }
  });

  return (
    <>
      <Environment preset="city" />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <ambientLight intensity={0.5} />

      {/* The 3D Scene */}
      <group ref={groupRef} position={[0, 0.5, 0]}>
        
        {/* LID GROUP */}
        <group ref={lidRef} position={[0, 0.02, -0.5]}>
            {/* Screen Housing (Aluminum) */}
            <mesh material={chassisMaterial} position={[0, 0.5, 0]}>
                <boxGeometry args={[2.2, 1.4, 0.05]} />
            </mesh>
            {/* Actual Display Panel (Glass) */}
            <mesh material={screenMaterial} position={[0, 0.5, 0.026]}>
                <planeGeometry args={[2.1, 1.3]} />
            </mesh>
            {/* Glowing Content on Screen */}
            <mesh position={[0, 0.5, 0.027]}>
                <planeGeometry args={[2.1, 1.3]} />
                <meshBasicMaterial color="#22d3ee" opacity={0.8} transparent />
            </mesh>
        </group>

        {/* FLOATING CHIP (Hidden initially) */}
        <mesh ref={chipRef} position={[0, -0.5, 0]} rotation={[Math.PI/4, Math.PI/4, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.05]} />
            <meshStandardMaterial color="#101010" />
            <mesh position={[0, 0, 0.03]}>
                <planeGeometry args={[0.25, 0.25]} />
                <meshBasicMaterial color="#ffd700" />
            </mesh>
        </mesh>

        {/* BASE GROUP */}
        <group ref={baseRef} position={[0, -0.02, -0.5]}>
             {/* Bottom Chassis */}
            <mesh material={chassisMaterial} position={[0, -0.025, 0.5]}>
                <boxGeometry args={[2.2, 0.05, 1.45]} />
            </mesh>
            {/* Keyboard Area */}
            <mesh ref={keyboardRef} material={keyboardMaterial} position={[0, 0.001, 0.3]}>
                <planeGeometry args={[2.1, 0.8]} />
            </mesh>
            {/* Trackpad */}
            <mesh material={screenMaterial} position={[0, 0.001, 0.9]}>
                <planeGeometry args={[0.8, 0.4]} />
            </mesh>
        </group>

      </group>

      <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />

      {/* HTML Overlay tied to Scroll */}
      <Scroll html style={{ width: '100%', height: '100%' }}>
        {/* Page 1 */}
        <div className="w-screen h-screen flex items-center justify-center p-12">
            <div ref={titleRef} className="text-center">
                <h1 className="text-7xl md:text-9xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-600">
                    ULTRABOOK
                </h1>
                <p className="mt-4 text-xl text-neutral-400 font-light">Scroll to dismantle perfection.</p>
            </div>
        </div>

        {/* Page 2 */}
        <div className="w-screen h-screen flex items-start justify-end p-24 pointer-events-none">
             <div ref={feature1Ref} className="max-w-md text-right opacity-0 transition-opacity duration-500">
                <h2 className="text-4xl font-bold text-blue-400 mb-2">M3 Architecture</h2>
                <p className="text-lg text-neutral-300 leading-relaxed">
                    Hidden beneath the aluminum unibody lies the next generation of silicon. 
                    Exploded view reveals the unified memory architecture.
                </p>
            </div>
        </div>

        {/* Page 3 */}
        <div className="w-screen h-screen flex items-center justify-start p-24 pointer-events-none">
            <div ref={feature2Ref} className="max-w-md text-left opacity-0">
                <h2 className="text-4xl font-bold text-purple-400 mb-2">Precision Milled</h2>
                <p className="text-lg text-neutral-300 leading-relaxed">
                    Every key, every capacitor, placed with micrometer precision. 
                    Experience the engineering marvel layer by layer.
                </p>
            </div>
        </div>
      </Scroll>
    </>
  );
};
