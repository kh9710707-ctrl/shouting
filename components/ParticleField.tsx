import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// Reduce particle count slightly for cleaner look with InstancedMesh
const PARTICLES_PER_LETTER = 30; 
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Utility: Create a texture for a specific character
const createCharTexture = (char: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 128; // Higher res for better quality
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    // Add a glow effect behind the text
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

interface LetterGroupProps {
  char: string;
  texture: THREE.Texture;
  audioDataRef: React.MutableRefObject<Uint8Array | null>;
  listening: boolean;
}

// Sub-component for a single letter group (e.g., all 'A's)
const LetterGroup: React.FC<LetterGroupProps> = ({ 
  char, 
  texture, 
  audioDataRef, 
  listening 
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Initialize random state for each instance
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLES_PER_LETTER }, () => {
      // Cylindrical distribution (Hollow Center)
      // Radius: Minimum 8 to leave center empty, max 18
      const radius = 8 + Math.random() * 10; 
      const angle = Math.random() * Math.PI * 2; 
      const y = (Math.random() - 0.5) * 30; // Vertical spread (Tall cylinder)
      
      return {
        radius,
        angle,
        y,
        // Uniform orbit direction
        orbitSpeed: 0.2 + Math.random() * 0.2, 
        // Rotate on Y axis (Earth rotation)
        rotateSpeed: 0.5 + Math.random() * 1.5, 
        randomScale: 0.8 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      };
    });
  }, []);

  // Refs for smoothing audio values (prevent chaotic jumping)
  const smoothedBass = useRef(0);
  const smoothedTreble = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();

    // 1. Audio Analysis & Smoothing
    let targetBass = 0;
    let targetTreble = 0;

    if (listening && audioDataRef.current) {
       const data = audioDataRef.current;
       
       // Bass: Lower frequencies (0-10)
       let bassSum = 0;
       for (let i = 0; i < 10; i++) bassSum += data[i];
       targetBass = (bassSum / 10) / 255; // 0.0 to 1.0

       // Treble: Higher frequencies (100-150)
       let trebleSum = 0;
       for (let i = 100; i < 150; i++) trebleSum += data[i];
       targetTreble = (trebleSum / 50) / 255;
    } else {
       // Idle "Breathing" animation
       targetBass = Math.sin(time * 2) * 0.05 + 0.05;
    }

    // Smooth out the values (Lerp) to remove chaotic jumping
    smoothedBass.current = THREE.MathUtils.lerp(smoothedBass.current, targetBass, 0.2);
    smoothedTreble.current = THREE.MathUtils.lerp(smoothedTreble.current, targetTreble, 0.1);

    const bass = smoothedBass.current;
    const treble = smoothedTreble.current;

    // 2. Update Particles
    particles.forEach((p, i) => {
        // A. Orbit Logic (Cylindrical)
        p.angle += p.orbitSpeed * delta * 0.5; // Slow continuous rotation
        
        // Expansion based on bass (Widen the cylinder slightly on beat)
        const expansion = bass * 2; 
        const currentRadius = p.radius + expansion;

        // Cylindrical coordinates to Cartesian
        const x = currentRadius * Math.cos(p.angle);
        const z = currentRadius * Math.sin(p.angle);
        const y = p.y + Math.sin(time + p.phase) * 0.5; // Gentle float up/down

        dummy.position.set(x, y, z);

        // B. Rotation Logic - Earth Self-Rotation (Y-Axis)
        dummy.rotation.set(0, time * p.rotateSpeed + p.phase, 0);

        // C. Scale Logic - DRASTIC CHANGE
        // Base scale is small (0.2). Audio adds a HUGE multiplier.
        // This makes them "Small when quiet, Big when loud"
        const baseSize = 0.2 * p.randomScale;
        const audioBoost = bass * 12.0; // Very sensitive multiplier
        const finalScale = baseSize + audioBoost;
        
        dummy.scale.setScalar(finalScale);

        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);

        // D. Color Logic
        // Shift hue based on time and treble
        // Using HSL to ensure they are visible against the pink background
        const hue = (time * 0.1 + (i * 0.02) + treble * 0.5) % 1;
        const lightness = 0.4 + bass * 0.3; // Keep them somewhat saturated/darker to pop on pink
        
        const color = new THREE.Color().setHSL(hue, 1.0, 0.5); // High saturation
        meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLES_PER_LETTER]}>
      <planeGeometry args={[1, 1]} />
      {/* Changed blending to Normal so colors show up against Pink background */}
      <meshBasicMaterial 
        map={texture} 
        transparent 
        side={THREE.DoubleSide}
        depthWrite={false} 
        blending={THREE.NormalBlending} 
      />
    </instancedMesh>
  );
};

export const ParticleField: React.FC = () => {
  const [listening, setListening] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Pre-generate textures for A-Z
  const letterTextures = useMemo(() => {
    return ALPHABET.split('').map(char => ({ char, texture: createCharTexture(char) }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512; 
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      setListening(true);
    } catch (err) {
      console.error("Error:", err);
      alert("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  useFrame(() => {
    if (listening && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    }
  });

  return (
    <>
      {/* Background is now Pink */}
      <color attach="background" args={['#FFC0CB']} />
      
      {/* Start Button Overlay */}
      {!listening && (
        <Html center>
          <div className="flex flex-col items-center justify-center bg-white/20 backdrop-blur-xl p-8 rounded-2xl border border-white/40 shadow-2xl transition-all z-50">
            <div className="text-6xl mb-6 animate-bounce">🎤</div>
            <h2 className="text-black text-3xl font-bold mb-3 tracking-tight text-center">Alphabet Beats</h2>
            <p className="text-black/70 mb-8 text-center max-w-xs text-sm leading-relaxed">
              A 3D audio-reactive particle cylinder.<br/>
              Background is pink, bass is big.
            </p>
            <button 
              onClick={startMicrophone}
              className="px-8 py-3 bg-pink-600 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-lg"
            >
              Start Listening
            </button>
          </div>
        </Html>
      )}

      <group rotation={[0, 0, 0]} position={[0, 0, 0]}>
        {letterTextures.map(({ char, texture }) => (
            <LetterGroup 
                key={char} 
                char={char} 
                texture={texture} 
                audioDataRef={dataArrayRef}
                listening={listening}
            />
        ))}
      </group>

      {/* Post Processing / Environment */}
      <ambientLight intensity={0.8} />
      {/* Fog matching the pink background */}
      <fog attach="fog" args={['#FFC0CB', 8, 45]} />
    </>
  );
};