'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
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
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{ 
        antialias: false, // Disable antialiasing to reduce GPU load
        alpha: true,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        stencil: false,
        depth: true
      }}
      dpr={[1, 1.5]} // Limit pixel ratio
      style={{ background: 'transparent' }}
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

