'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

type FrameProps = {
  scrollProgress: number
}

function Frame({ scrollProgress }: FrameProps) {
  const frameRef = useRef<THREE.Group>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  // Update camera position based on scroll
  useFrame(({ camera }) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      // Smooth zoom from Z=8 to Z=0.8 (entering the frame)
      const targetZ = 8 - scrollProgress * 7.2
      camera.position.z += (targetZ - camera.position.z) * 0.1
      
      // Slight upward tilt as we enter
      const targetY = scrollProgress * 0.3
      camera.position.y += (targetY - camera.position.y) * 0.1
      
      camera.lookAt(0, 0, 0)
    }
  })

  // Subtle floating animation
  useFrame(({ clock }) => {
    if (frameRef.current) {
      frameRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.05
    }
  })

  return (
    <group ref={frameRef}>
      {/* Golden Frame */}
      {/* Top bar */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <boxGeometry args={[6.5, 0.3, 0.4]} />
        <meshStandardMaterial color="#c9a56a" metalness={0.4} roughness={0.5} />
      </mesh>
      
      {/* Bottom bar */}
      <mesh position={[0, -3.2, 0]} castShadow>
        <boxGeometry args={[6.5, 0.3, 0.4]} />
        <meshStandardMaterial color="#c9a56a" metalness={0.4} roughness={0.5} />
      </mesh>
      
      {/* Left bar */}
      <mesh position={[-3.1, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 6.5, 0.4]} />
        <meshStandardMaterial color="#c9a56a" metalness={0.4} roughness={0.5} />
      </mesh>
      
      {/* Right bar */}
      <mesh position={[3.1, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 6.5, 0.4]} />
        <meshStandardMaterial color="#c9a56a" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Canvas/Painting Surface */}
      <mesh position={[0, 0, -0.15]} receiveShadow>
        <planeGeometry args={[5.8, 6]} />
        <meshStandardMaterial color="#f5f4f2" metalness={0.05} roughness={0.95} />
      </mesh>

      {/* Abstract Geometric Composition on Canvas */}
      {/* Golden circle */}
      <mesh position={[-1, 1.5, -0.1]}>
        <circleGeometry args={[0.8, 32]} />
        <meshStandardMaterial color="#c9a56a" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Stone rectangle 1 */}
      <mesh position={[1.2, -0.5, -0.1]} rotation={[0, 0, 0.15]}>
        <planeGeometry args={[1.5, 2.5]} />
        <meshStandardMaterial color="#e3e1dc" metalness={0.2} roughness={0.7} transparent opacity={0.9} />
      </mesh>

      {/* Stone rectangle 2 */}
      <mesh position={[-1.3, -1.8, -0.1]}>
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial color="#eae8e4" metalness={0.1} roughness={0.8} transparent opacity={0.85} />
      </mesh>

      {/* Small accent circle */}
      <mesh position={[0.8, 2, -0.1]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#d4d1cc" metalness={0.15} roughness={0.75} />
      </mesh>
    </group>
  )
}

type ZoomSceneProps = {
  scrollProgress: number
}

export function ZoomScene({ scrollProgress }: ZoomSceneProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if WebGL is available
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (!gl) {
        console.warn('WebGL context could not be created')
        setHasWebGL(false)
        setError('WebGL is not supported in your browser')
      } else {
        console.log('WebGL is available and ready')
        setHasWebGL(true)
      }
    } catch (e) {
      console.error('WebGL detection error:', e)
      setHasWebGL(false)
      setError('WebGL is disabled or unavailable')
    }
  }, [])

  // Show loading state while checking WebGL
  if (hasWebGL === null) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#faf9f7]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#c9a56a] border-r-transparent"></div>
          <p className="mt-4 text-sm text-[#6b6764]">Loading 3D scene...</p>
        </div>
      </div>
    )
  }

  // Fallback UI when WebGL is not available
  if (hasWebGL === false) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#faf9f7]">
        <div className="max-w-md text-center p-8">
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto text-[#c9a56a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="serif text-2xl text-[#2a2826] mb-3">3D Scene Unavailable</h3>
          <p className="text-sm text-[#6b6764] leading-relaxed mb-4">
            {error || 'WebGL is required to display the 3D artwork.'}
          </p>
          <p className="text-xs text-[#6b6764] leading-relaxed">
            Please enable hardware acceleration in your browser settings or try refreshing the page.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{ 
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        stencil: false,
        depth: true
      }}
      dpr={[1, 1.5]}
      style={{ 
        width: '100%',
        height: '100%',
        background: 'transparent'
      }}
      onCreated={({ gl, scene, camera }) => {
        // Successfully created WebGL context
        console.log('✅ WebGL Canvas created successfully')
        console.log('Camera position:', camera.position)
        console.log('Scene children:', scene.children.length)
      }}
      onError={(error) => {
        // Handle Canvas creation errors
        console.error('❌ Canvas creation error:', error)
        setHasWebGL(false)
        setError('Failed to initialize 3D graphics')
      }}
    >
      {/* Lighting - Gallery setup */}
      <ambientLight intensity={0.5} color="#faf9f7" />
      <directionalLight 
        position={[5, 8, 5]} 
        intensity={1.4} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight 
        position={[-4, 4, -4]} 
        intensity={0.6} 
        color="#c9a56a" 
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#faf9f7', 10, 20]} />

      {/* The Frame */}
      <Frame scrollProgress={scrollProgress} />
    </Canvas>
  )
}

