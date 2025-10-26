'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type ScrollArtworkProps = {
  scrollProgress: number
}

export const ScrollArtwork = ({ scrollProgress }: ScrollArtworkProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const artworkRef = useRef<THREE.Group | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const lightRef = useRef<THREE.DirectionalLight | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0xfaf9f7, 20, 60)

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 35)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setClearColor(0xfaf9f7, 0)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Create museum artwork - geometric framed piece
    const artwork = new THREE.Group()
    scene.add(artwork)
    artworkRef.current = artwork

    // Golden frame material
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xc9a56a,
      metalness: 0.4,
      roughness: 0.5
    })

    // Canvas material
    const canvasMat = new THREE.MeshStandardMaterial({
      color: 0xf5f4f2,
      metalness: 0.05,
      roughness: 0.95
    })

    // Accent material
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xe3e1dc,
      metalness: 0.2,
      roughness: 0.7,
      transparent: true,
      opacity: 0.9
    })

    // Create ornate frame
    const frameThickness = 0.4
    const frameDepth = 0.6
    const frameWidth = 12
    const frameHeight = 16

    // Frame borders
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameThickness, frameDepth),
      frameMat
    )
    topFrame.position.y = frameHeight / 2
    topFrame.castShadow = true
    artwork.add(topFrame)

    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameThickness, frameDepth),
      frameMat
    )
    bottomFrame.position.y = -frameHeight / 2
    bottomFrame.castShadow = true
    artwork.add(bottomFrame)

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, frameHeight, frameDepth),
      frameMat
    )
    leftFrame.position.x = -frameWidth / 2
    leftFrame.castShadow = true
    artwork.add(leftFrame)

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, frameHeight, frameDepth),
      frameMat
    )
    rightFrame.position.x = frameWidth / 2
    rightFrame.castShadow = true
    artwork.add(rightFrame)

    // Canvas/artwork surface
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(frameWidth - 1.5, frameHeight - 1.5),
      canvasMat
    )
    canvas.position.z = frameDepth / 2 - 0.05
    canvas.receiveShadow = true
    artwork.add(canvas)

    // Abstract geometric composition on canvas
    const shapes = new THREE.Group()
    canvas.add(shapes)

    // Golden circle
    const circle = new THREE.Mesh(
      new THREE.CircleGeometry(2, 32),
      new THREE.MeshStandardMaterial({ color: 0xc9a56a, metalness: 0.3, roughness: 0.6 })
    )
    circle.position.set(-1.5, 2, 0.1)
    shapes.add(circle)

    // Stone rectangles
    const rect1 = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 4.5),
      accentMat
    )
    rect1.position.set(2, -1, 0.1)
    rect1.rotation.z = 0.15
    shapes.add(rect1)

    const rect2 = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 2.5),
      accentMat
    )
    rect2.position.set(-2, -3, 0.1)
    shapes.add(rect2)

    // Small accent circle
    const smallCircle = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshStandardMaterial({ color: 0xeae8e4, metalness: 0.1, roughness: 0.8 })
    )
    smallCircle.position.set(1, 4, 0.1)
    shapes.add(smallCircle)

    // Lighting setup - gallery spotlights
    const ambientLight = new THREE.AmbientLight(0xfaf9f7, 0.5)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4)
    mainLight.position.set(8, 12, 10)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    scene.add(mainLight)
    lightRef.current = mainLight

    const fillLight = new THREE.DirectionalLight(0xc9a56a, 0.6)
    fillLight.position.set(-6, 6, -8)
    scene.add(fillLight)

    // Animation loop
    let frame = 0
    const animate = () => {
      frame += 0.003

      if (artworkRef.current) {
        // Subtle floating animation
        artworkRef.current.position.y = Math.sin(frame) * 0.08
      }

      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      rendererRef.current.setSize(w, h)
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      
      if (artworkRef.current) {
        artworkRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose()
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose())
              } else {
                child.material.dispose()
              }
            }
          }
        })
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose()
        rendererRef.current.forceContextLoss()
        if (containerRef.current && rendererRef.current.domElement) {
          containerRef.current.removeChild(rendererRef.current.domElement)
        }
      }
    }
  }, [])

  // Update camera position based on scroll
  useEffect(() => {
    if (cameraRef.current) {
      // Smooth zoom from 35 to 3 (deep into the painting)
      const targetZ = 35 - scrollProgress * 32
      cameraRef.current.position.z += (targetZ - cameraRef.current.position.z) * 0.1
      
      // Slight upward tilt as we enter
      const targetY = scrollProgress * 0.8
      cameraRef.current.position.y += (targetY - cameraRef.current.position.y) * 0.1
    }

    // Lighting shifts as we enter
    if (lightRef.current) {
      lightRef.current.position.x = 8 - scrollProgress * 12
      lightRef.current.intensity = 1.4 + scrollProgress * 0.6
    }
  }, [scrollProgress])

  return <div ref={containerRef} className="absolute inset-0" />
}

