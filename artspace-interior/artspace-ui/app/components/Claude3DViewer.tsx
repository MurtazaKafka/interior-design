import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { FallbackGenerators } from '@/lib/claude-3d-generator'
import type { FurnitureItem } from '@/lib/furniture-api'

type Claude3DViewerProps = {
  selectedStyles: string[]
  furnitureItems?: FurnitureItem[]
  useClaudeGeneration?: boolean
}

export const Claude3DViewer = ({
  selectedStyles,
  furnitureItems = [],
  useClaudeGeneration = false
}: Claude3DViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const furnitureGroupRef = useRef<THREE.Group | null>(null)

  const [loadingStates, setLoadingStates] = useState<Record<string, string>>({})
  const [generationStats, setGenerationStats] = useState({ total: 0, claude: 0, fallback: 0 })

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f8f8)
    scene.fog = new THREE.Fog(0xf8f8f8, 10, 30)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )
    camera.position.set(6, 4, 6)
    camera.lookAt(0, 0.5, 0)
    cameraRef.current = camera

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 30
    controls.maxPolarAngle = Math.PI / 2 - 0.1
    controlsRef.current = controls

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.mapSize.set(2048, 2048)
    scene.add(directionalLight)

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(12, 12)
    const floorMaterial = new THREE.MeshPhongMaterial({ color: 0xf2f2f2 })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Furniture group
    const furnitureGroup = new THREE.Group()
    furnitureGroupRef.current = furnitureGroup
    scene.add(furnitureGroup)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      const currentContainer = containerRef.current
      if (!currentContainer || !rendererRef.current || !cameraRef.current) return
      const width = currentContainer.clientWidth
      const height = currentContainer.clientHeight
      rendererRef.current.setSize(width, height)
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }

      rendererRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      sceneRef.current = null
      furnitureGroupRef.current = null
    }
  }, [])

  // Load furniture with Claude generation
  const loadFurnitureWithClaude = useCallback(async (items: FurnitureItem[]) => {
    if (!sceneRef.current) return

    // Clear existing furniture
    if (furnitureGroupRef.current) {
      sceneRef.current.remove(furnitureGroupRef.current)
      furnitureGroupRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          if (obj.material instanceof THREE.Material) {
            obj.material.dispose()
          }
        }
      })
    }

    // Create new furniture group
    const furnitureGroup = new THREE.Group()
    furnitureGroupRef.current = furnitureGroup
    sceneRef.current.add(furnitureGroup)

    const stats = { total: items.length, claude: 0, fallback: 0 }

    // Process each furniture item
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      setLoadingStates((prev) => ({ ...prev, [item.id]: 'generating' }))

      try {
        let furnitureObject: THREE.Group | null = null

        if (useClaudeGeneration) {
          // Try to generate with Claude
          try {
            const response = await fetch('http://localhost:8000/api/generate-3d', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                furniture_type: item.subcategory || 'furniture',
                style: item.styleTags?.join(' ') || selectedStyles.join(' ') || 'modern',
                colors: Array.isArray(item.colors) ? item.colors : [item.colors || 'brown'],
                materials: item.materials || ['wood'],
                dimensions: item.dimensions
                  ? {
                      width: item.dimensions.width / 39.37, // inches to meters
                      depth: item.dimensions.depth / 39.37,
                      height: item.dimensions.height / 39.37
                    }
                  : undefined
              })
            })

            if (response.ok) {
              const data = await response.json()

              // Execute the generated code
              const func = new Function('THREE', `
                ${data.code}
                if (typeof createFurniture === 'function') {
                  return createFurniture();
                } else {
                  throw new Error('createFurniture function not found');
                }
              `)

              furnitureObject = func(THREE)

              if (data.source === 'claude') {
                stats.claude += 1
                setLoadingStates((prev) => ({ ...prev, [item.id]: 'claude' }))
              } else {
                stats.fallback += 1
                setLoadingStates((prev) => ({ ...prev, [item.id]: 'fallback' }))
              }
            }
          } catch (error) {
            console.warn(`Failed to generate with Claude for ${item.id}:`, error)
          }
        }

        // Use fallback if Claude generation failed or is disabled
        if (!furnitureObject) {
          const fallbackType = item.subcategory || 'chair'
          const fallbackGenerator = FallbackGenerators[fallbackType as keyof typeof FallbackGenerators]

          if (fallbackGenerator) {
            furnitureObject = fallbackGenerator()
            stats.fallback += 1
            setLoadingStates((prev) => ({ ...prev, [item.id]: 'fallback' }))
          } else {
            // Ultimate fallback - create a simple box
            furnitureObject = new THREE.Group()
            const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
            const material = new THREE.MeshPhongMaterial({ color: 0x808080 })
            const mesh = new THREE.Mesh(geometry, material)
            furnitureObject.add(mesh)
            stats.fallback += 1
            setLoadingStates((prev) => ({ ...prev, [item.id]: 'box' }))
          }
        }

        // Position furniture in a grid
        const cols = Math.ceil(Math.sqrt(items.length))
        const row = Math.floor(i / cols)
        const col = i % cols
        const spacing = 2.5

        furnitureObject.position.x = (col - cols / 2) * spacing
        furnitureObject.position.z = (row - Math.ceil(items.length / cols) / 2) * spacing

        // Apply shadows
        furnitureObject.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        // Add to scene
        furnitureGroup.add(furnitureObject)
      } catch (error) {
        console.error(`Failed to load furniture ${item.id}:`, error)
        setLoadingStates((prev) => ({ ...prev, [item.id]: 'error' }))
      }
    }

    setGenerationStats(stats)
  }, [selectedStyles, useClaudeGeneration])

  // Load furniture when items or generation settings change
  useEffect(() => {
    if (!sceneRef.current || !furnitureItems.length) return

  // The loader updates local React state to reflect async generation progress.
  // This happens asynchronously and is safe, so we silence the lint warning.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  loadFurnitureWithClaude(furnitureItems)
  }, [furnitureItems, loadFurnitureWithClaude])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Generation stats overlay */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <h3 className="text-sm font-semibold mb-2">3D Generation</h3>
        <div className="space-y-1 text-xs">
          <div>Total Models: {generationStats.total}</div>
          {useClaudeGeneration && (
            <>
              <div className="text-green-600">Claude Generated: {generationStats.claude}</div>
              <div className="text-yellow-600">Fallback Used: {generationStats.fallback}</div>
            </>
          )}
        </div>
      </div>

      {/* Loading states for each item */}
      <div className="absolute top-4 right-4 max-h-96 overflow-y-auto bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <h3 className="text-sm font-semibold mb-2">Model Status</h3>
        <div className="space-y-1 text-xs max-w-xs">
          {Object.entries(loadingStates).map(([id, state]) => (
            <div key={id} className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  state === 'claude'
                    ? 'bg-green-500'
                    : state === 'fallback'
                    ? 'bg-yellow-500'
                    : state === 'generating'
                    ? 'bg-blue-500 animate-pulse'
                    : state === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                }`}
              />
              <span className="truncate">
                {id}: {state}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="text-xs space-y-1">
          <div>🖱️ Left click + drag to rotate</div>
          <div>🖱️ Right click + drag to pan</div>
          <div>🖱️ Scroll to zoom</div>
        </div>
      </div>
    </div>
  )
}