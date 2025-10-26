'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export const HeroCanvas = () => {
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
    camera.position.set(0, 0, 25)
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

    // Create museum artwork - geometric reinterpretation of a framed piece
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
    const frameThickness = 0.3
    const frameDepth = 0.4
    const frameWidth = 8
    const frameHeight = 10

    // Frame borders
    const topFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameThickness, frameDepth),
      frameMat
    )
    topFrame.position.y = frameHeight / 2
    artwork.add(topFrame)

    const bottomFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameThickness, frameDepth),
      frameMat
    )
    bottomFrame.position.y = -frameHeight / 2
    artwork.add(bottomFrame)

    const leftFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, frameHeight, frameDepth),
      frameMat
    )
    leftFrame.position.x = -frameWidth / 2
    artwork.add(leftFrame)

    const rightFrame = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, frameHeight, frameDepth),
      frameMat
    )
    rightFrame.position.x = frameWidth / 2
    artwork.add(rightFrame)

    // Canvas/artwork surface
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(frameWidth - 1, frameHeight - 1),
      canvasMat
    )
    canvas.position.z = frameDepth / 2 - 0.05
    artwork.add(canvas)

    // Abstract geometric composition on canvas
    const shapes = new THREE.Group()
    canvas.add(shapes)

    // Golden circle
    const circle = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 32),
      new THREE.MeshStandardMaterial({ color: 0xc9a56a, metalness: 0.3, roughness: 0.6 })
    )
    circle.position.set(-1, 1.5, 0.1)
    shapes.add(circle)

    // Stone rectangles
    const rect1 = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 3),
      accentMat
    )
    rect1.position.set(1.5, -0.5, 0.1)
    rect1.rotation.z = 0.2
    shapes.add(rect1)

    const rect2 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      accentMat
    )
    rect2.position.set(-1.5, -2, 0.1)
    shapes.add(rect2)

    // Lighting setup - gallery spotlights
    const ambientLight = new THREE.AmbientLight(0xfaf9f7, 0.4)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    mainLight.position.set(5, 10, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 1024
    mainLight.shadow.mapSize.height = 1024
    scene.add(mainLight)
    lightRef.current = mainLight

    const fillLight = new THREE.DirectionalLight(0xc9a56a, 0.5)
    fillLight.position.set(-5, 5, -5)
    scene.add(fillLight)

    // Scroll interaction
    let scrollY = 0
    const handleScroll = () => {
      scrollY = window.scrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Animation loop with cinematic zoom
    let frame = 0
    const animate = () => {
      frame += 0.005

      if (artworkRef.current) {
        // Subtle floating animation
        artworkRef.current.position.y = Math.sin(frame) * 0.1
        artworkRef.current.rotation.y = Math.sin(frame * 0.5) * 0.02
      }

      // Scroll-reactive camera zoom (walking toward artwork)
      if (cameraRef.current) {
        const scrollFactor = Math.min(scrollY / 1000, 1)
        const targetZ = 25 - scrollFactor * 18 // Zoom from 25 to 7
        cameraRef.current.position.z += (targetZ - cameraRef.current.position.z) * 0.05
        
        // Slight camera tilt as we approach
        cameraRef.current.position.y = scrollFactor * 0.5
      }

      // Scroll-reactive lighting (gallery spotlight shift)
      if (lightRef.current) {
        const lightScroll = Math.min(scrollY / 800, 1)
        lightRef.current.position.x = 8 - lightScroll * 10
        lightRef.current.position.y = 12 - lightScroll * 4
        lightRef.current.intensity = 1.3 + lightScroll * 0.4
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
      window.removeEventListener('scroll', handleScroll)
      
      // Proper cleanup to free WebGL context
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

  return <div ref={containerRef} className="absolute inset-0" />
}
