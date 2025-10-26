'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import type { FurnitureItem } from '@/lib/furniture-api'
import { RoomGenerator, type RoomConfig } from '@/lib/room-generator'

type ThreeDViewerProps = {
  floorplanImage: string
  selectedStyles: string[]
  furnitureItems?: FurnitureItem[]
  roomType?: 'bedroom' | 'living_room' | 'dining_room' | 'office'
}

export const ThreeDViewer = ({
  floorplanImage,
  selectedStyles,
  furnitureItems = [],
  roomType = 'bedroom'
}: ThreeDViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const furnitureGroupRef = useRef<THREE.Group | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const [loadingFurniture, setLoadingFurniture] = useState<string[]>([])
  const [sceneReady, setSceneReady] = useState(false)

  // Initialise the Three.js scene once on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8f8f8)
    scene.fog = new THREE.Fog(0xf8f8f8, 10, 30)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )
    camera.position.set(6, 4, 6)
    camera.lookAt(0, 0.5, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    })
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 2
    controls.maxDistance = 20
    controls.maxPolarAngle = Math.PI / 2 - 0.1
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.near = 0.1
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.mapSize.set(2048, 2048)
    scene.add(directionalLight)

    // Floor plane based on floorplan image
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(floorplanImage, (texture) => {
      const aspectRatio = texture.image.width / texture.image.height
      const geometry = new THREE.PlaneGeometry(aspectRatio * 6, 6)
      const material = new THREE.MeshPhongMaterial({ map: texture })
      const floor = new THREE.Mesh(geometry, material)
      floor.rotation.x = -Math.PI / 2
      floor.receiveShadow = true
      scene.add(floor)
    })

    const furnitureGroup = new THREE.Group()
    furnitureGroupRef.current = furnitureGroup
    scene.add(furnitureGroup)

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      if (controlsRef.current) controlsRef.current.update()
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    const handleResize = () => {
      const containerEl = containerRef.current
      if (!containerEl || !rendererRef.current || !cameraRef.current) return
      const width = containerEl.clientWidth
      const height = containerEl.clientHeight
      rendererRef.current.setSize(width, height)
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    setSceneReady(true)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      controlsRef.current?.dispose()

      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry?.dispose()
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((mat) => mat.dispose())
              } else {
                object.material.dispose()
              }
            }
          }
        })
      }

      if (rendererRef.current) {
        rendererRef.current.dispose()
        rendererRef.current.forceContextLoss?.()
        if (rendererRef.current.domElement.parentElement) {
          rendererRef.current.domElement.parentElement.removeChild(rendererRef.current.domElement)
        }
      }

      rendererRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      sceneRef.current = null
      furnitureGroupRef.current = null
      setSceneReady(false)
    }
  }, [floorplanImage])

  // Load or regenerate furniture whenever the list changes
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return

    let cancelled = false

    const disposeFurniture = () => {
      if (sceneRef.current && furnitureGroupRef.current) {
        sceneRef.current.remove(furnitureGroupRef.current)
        furnitureGroupRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => mat.dispose())
            } else {
              obj.material.dispose()
            }
          }
        })
      }
    }

    const loadFurniture = async (items: FurnitureItem[]) => {
      if (!sceneRef.current) return

      disposeFurniture()
      const furnitureGroup = new THREE.Group()
      furnitureGroupRef.current = furnitureGroup
      sceneRef.current.add(furnitureGroup)

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (cancelled) break

        setLoadingFurniture((prev) => [...prev, item.id])

        try {
          let furnitureObject: THREE.Group | null = null

          if (item.generated_code) {
            try {
              const func = new Function('THREE', `\n${item.generated_code}\nif (typeof createFurniture === 'function') {\n  return createFurniture();\n} else {\n  throw new Error('createFurniture function not found');\n}\n`)
              furnitureObject = func(THREE)
            } catch (executionError) {
              console.error(`Failed to execute custom code for ${item.id}:`, executionError)
            }
          }

          if (!furnitureObject) {
            try {
              const response = await fetch('http://localhost:8000/api/generate-3d', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  furniture_type: item.subcategory || item.category || 'furniture',
                  style: item.styleTags?.join(' ') || item.style_tags?.join(' ') || selectedStyles.join(' ') || 'modern',
                  colors: Array.isArray(item.colors) ? item.colors : [item.colors || 'neutral'],
                  materials: item.materials || ['wood'],
                  dimensions: item.dimensions
                    ? {
                        width: item.dimensions.width / 39.37,
                        depth: item.dimensions.depth / 39.37,
                        height: item.dimensions.height / 39.37
                      }
                    : undefined
                })
              })

              if (response.ok) {
                const data = await response.json()
                const func = new Function('THREE', `\n${data.code}\nif (typeof createFurniture === 'function') {\n  return createFurniture();\n} else {\n  throw new Error('createFurniture function not found');\n}\n`)
                furnitureObject = func(THREE)
                if (data.source === 'fallback') {
                  console.warn(`Using fallback furniture code for ${item.id}`)
                }
              } else {
                console.error(`Furniture generation failed for ${item.id} with status ${response.status}`)
              }
            } catch (generationError) {
              console.error(`Failed to generate furniture ${item.id}:`, generationError)
            }
          }

          if (!furnitureObject) {
            const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
            const material = new THREE.MeshPhongMaterial({ color: 0x808080 })
            const mesh = new THREE.Mesh(geometry, material)
            mesh.castShadow = true
            mesh.receiveShadow = true

            furnitureObject = new THREE.Group()
            furnitureObject.add(mesh)
          }

          const furnitureType = item.subcategory || item.category || 'furniture'
          const roomConfig: RoomConfig = { width: 5, depth: 5, height: 3, roomType }
          const placement = RoomGenerator.calculateFurniturePlacement(roomConfig, furnitureType, i, items.length)

          furnitureObject.position.set(placement.position.x, placement.position.y, placement.position.z)
          furnitureObject.rotation.y = placement.rotation.y
          if (placement.scale) {
            furnitureObject.scale.multiplyScalar(placement.scale)
          }

          furnitureObject.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })

          furnitureGroup.add(furnitureObject)
        } finally {
          setLoadingFurniture((prev) => prev.filter((id) => id !== item.id))
        }
      }
    }

    loadFurniture(furnitureItems)

    return () => {
      cancelled = true
    }
  }, [sceneReady, furnitureItems, roomType, selectedStyles])

  return (
    <div className="relative flex h-full w-full flex-col">
      <div
        ref={containerRef}
        className="flex-1 w-full rounded-xl border-2 border-[var(--border)] bg-white shadow-lg"
      />

      <div className="absolute bottom-6 right-6 rounded-xl bg-white/90 p-4 text-base shadow-lg backdrop-blur">
        <p className="font-semibold">Selected Styles:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedStyles.map((style) => (
            <span
              key={style}
              className="rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-sm font-medium text-[var(--accent)] shadow-sm"
            >
              {style}
            </span>
          ))}
        </div>
        {loadingFurniture.length > 0 && (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Generating furniture: {loadingFurniture.length} item{loadingFurniture.length > 1 ? 's' : ''}...
          </p>
        )}
      </div>
    </div>
  )
}
