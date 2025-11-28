import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ScrollControls, Loader } from '@react-three/drei';
import { MacbookExplode } from './components/MacbookExplode';
import { ParticleField } from './components/ParticleField';

enum DemoType {
  SCROLL_PRODUCT = 'SCROLL_PRODUCT',
  PARTICLES = 'PARTICLES'
}

const App: React.FC = () => {
  const [demoType, setDemoType] = useState<DemoType>(DemoType.SCROLL_PRODUCT);

  return (
    <div className="h-screen w-screen bg-black relative">
      {/* Navigation / Toggle Switch */}
      <nav className="absolute top-0 left-0 w-full z-50 flex justify-between items-center p-6 pointer-events-none">
        <div className="text-white font-bold text-xl tracking-tighter pointer-events-auto">
          VISUAL<span className="text-neutral-500">DEMO</span>
        </div>
        <div className="flex gap-4 pointer-events-auto bg-white/10 backdrop-blur-md p-1 rounded-full">
          <button
            onClick={() => setDemoType(DemoType.SCROLL_PRODUCT)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              demoType === DemoType.SCROLL_PRODUCT
                ? 'bg-white text-black shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Explode & Scroll
          </button>
          <button
            onClick={() => setDemoType(DemoType.PARTICLES)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
              demoType === DemoType.PARTICLES
                ? 'bg-white text-black shadow-lg'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Interactive Particles
          </button>
        </div>
      </nav>

      {/* 3D Canvas Environment */}
      <div className="absolute inset-0 w-full h-full">
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ antialias: true, toneMappingExposure: 1.5 }}
        >
          <Suspense fallback={null}>
            {demoType === DemoType.SCROLL_PRODUCT ? (
              // ScrollControls creates the DOM scroll container and syncs it with 3D
              <ScrollControls pages={3} damping={0.2}>
                <MacbookExplode />
              </ScrollControls>
            ) : (
              <ParticleField />
            )}
          </Suspense>
        </Canvas>
      </div>
      
      <Loader />
    </div>
  );
};

export default App;