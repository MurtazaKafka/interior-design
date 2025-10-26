'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Loader2, Sparkles, Undo2, Upload } from 'lucide-react'

type GenerationStatus = 'idle' | 'loading' | 'success' | 'error'

interface CompleteRoomGeneratorProps {
  onRoomGenerated?: (code: string) => void
}

const FALLBACK_DESCRIPTION = 'Modern bedroom with warm lighting, layered textures, and cozy furniture placement.'

type StatusPalette = {
  [key in GenerationStatus]: string
}

const STATUS_STYLES: StatusPalette = {
  idle: 'bg-slate-100 text-slate-600',
  loading: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  error: 'bg-rose-100 text-rose-700'
}

export const CompleteRoomGenerator = ({ onRoomGenerated }: CompleteRoomGeneratorProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const animationRef = useRef<number | null>(null)
  const generatedRootRef = useRef<THREE.Group | null>(null)

  const [imageData, setImageData] = useState<string | null>(null)
  const [description, setDescription] = useState<string>(FALLBACK_DESCRIPTION)
  const [generatedCode, setGeneratedCode] = useState<string>('')
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [message, setMessage] = useState<string>('Upload a room reference image to begin.')
  const [source, setSource] = useState<string>('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500)
    camera.position.set(6, 4, 6)
    camera.lookAt(0, 1.5, 0)
    cameraRef.current = camera

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 1, 0)
    controlsRef.current = controls

    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8)
    keyLight.position.set(8, 10, 6)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-6, 4, -8)
    scene.add(fillLight)

    const grid = new THREE.GridHelper(20, 20, 0x4b5563, 0x1f2937)
    if ('material' in grid && grid.material && Array.isArray(grid.material)) {
      grid.material.forEach((material) => {
        material.transparent = true
        material.opacity = 0.35
      })
    } else if ('material' in grid && grid.material) {
      const material = grid.material as THREE.Material & { transparent?: boolean; opacity?: number }
      material.transparent = true
      material.opacity = 0.35
    }
    scene.add(grid)

    const axes = new THREE.AxesHelper(1.5)
    axes.position.set(-3, 0, -3)
    scene.add(axes)

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      const host = containerRef.current
      const rendererInstance = rendererRef.current
      const cameraInstance = cameraRef.current
      if (!host || !rendererInstance || !cameraInstance) return

      const nextWidth = host.clientWidth
      const nextHeight = host.clientHeight
      rendererInstance.setSize(nextWidth, nextHeight)
      cameraInstance.aspect = nextWidth / nextHeight
      cameraInstance.updateProjectionMatrix()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement)
      }
    }
  }, [])

  const disposeGenerated = useCallback(() => {
    const scene = sceneRef.current
    const group = generatedRootRef.current
    if (!scene || !group) return

    scene.remove(group)
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose())
        } else if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose()
        }
      }

      if ((child as THREE.Light).isLight) {
        const light = child as THREE.Light & { dispose?: () => void }
        light.dispose?.()
      }
    })

    generatedRootRef.current = null
  }, [])

  const focusCameraOnGroup = useCallback((group: THREE.Group) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const boundingBox = new THREE.Box3().setFromObject(group)
    if (boundingBox.isEmpty()) return

    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    boundingBox.getSize(size)
    boundingBox.getCenter(center)

    const maxDimension = Math.max(size.x, size.y, size.z)
    const fitOffset = 1.6
    const distance = (maxDimension / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * fitOffset

    const direction = new THREE.Vector3(0.5, 0.4, 0.8).normalize()
    camera.position.copy(center.clone().add(direction.multiplyScalar(distance)))
    camera.near = Math.max(0.1, distance / 100)
    camera.far = Math.max(500, distance * 5)
    camera.updateProjectionMatrix()

    controls.target.copy(center)
    controls.update()
  }, [])

  const injectGeneratedScene = useCallback(
    (code: string) => {
      const hostScene = sceneRef.current
      if (!hostScene) throw new Error('Three.js scene not initialised yet.')

      disposeGenerated()

      const generatedRoot = new THREE.Group()
      generatedRoot.name = 'ClaudeCompleteRoom'
      generatedRootRef.current = generatedRoot

      let result: unknown
      try {
        const factory = new Function(
          'THREE',
          `\n${code}\nif (typeof createCompleteRoom === 'function') return createCompleteRoom();\nif (typeof createScene === 'function') return createScene();\nif (typeof createRoom === 'function') return createRoom();\nreturn null;`
        )
        result = factory(THREE)
      } catch (error) {
        throw new Error(`Execution failed: ${(error as Error).message}`)
      }

      let generatedCamera: THREE.Camera | null = null
      let controlsTarget: THREE.Vector3 | null = null

      if (result instanceof THREE.Scene) {
        if (result.userData?.camera instanceof THREE.Camera) {
          generatedCamera = result.userData.camera
        }
        if (result.userData?.controlsTarget instanceof THREE.Vector3) {
          controlsTarget = result.userData.controlsTarget.clone()
        }

        while (result.children.length > 0) {
          const child = result.children.shift()
          if (child) generatedRoot.add(child)
        }
      } else if (result instanceof THREE.Object3D) {
        generatedRoot.add(result)
      } else {
        throw new Error('Claude returned unsupported code. Expected a Scene or Object3D.')
      }

      if (generatedRoot.children.length === 0) {
        throw new Error('Claude code executed but produced no objects.')
      }

      hostScene.add(generatedRoot)
      hostScene.updateMatrixWorld(true)

      const camera = cameraRef.current
      const controls = controlsRef.current
      if (
        camera &&
        generatedCamera instanceof THREE.PerspectiveCamera &&
        camera instanceof THREE.PerspectiveCamera
      ) {
        camera.position.copy(generatedCamera.position)
        camera.quaternion.copy(generatedCamera.quaternion)
        camera.fov = generatedCamera.fov
        camera.near = generatedCamera.near
        camera.far = generatedCamera.far
        camera.updateProjectionMatrix()

        if (controls) {
          if (!controlsTarget) {
            const direction = new THREE.Vector3()
            generatedCamera.getWorldDirection(direction)
            controlsTarget = generatedCamera.position.clone().add(direction)
          }
          controls.target.copy(controlsTarget)
          controls.update()
        }
      } else if (generatedRoot.children.length && camera && controls) {
        focusCameraOnGroup(generatedRoot)
      }

      const stats = { meshes: 0, lights: 0 }
      generatedRoot.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) stats.meshes += 1
        if ((child as THREE.Light).isLight) stats.lights += 1
      })

      setMessage(`Added ${generatedRoot.children.length} objects | Meshes: ${stats.meshes} | Lights: ${stats.lights}`)
    },
    [disposeGenerated, focusCameraOnGroup]
  )

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setImageData(reader.result as string)
      setStatus('idle')
      setMessage('Image ready. Describe the vibe and hit Generate.')
    }
    reader.readAsDataURL(file)

    event.target.value = ''
  }, [])

  const resetView = useCallback(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    camera.position.set(6, 4, 6)
    camera.lookAt(0, 1.5, 0)
    camera.near = 0.1
    camera.far = 500
    camera.updateProjectionMatrix()

    controls.target.set(0, 1, 0)
    controls.update()
  }, [])

  const clearScene = useCallback(() => {
    disposeGenerated()
    setStatus('idle')
    setMessage('Cleared generated content. Ready for the next inspiration image.')
    setGeneratedCode('')
  }, [disposeGenerated])

  const requestGeneration = useCallback(async () => {
    if (!imageData) {
      setStatus('error')
      setMessage('Upload a room image before generating the scene.')
      return
    }

    setStatus('loading')
    setMessage('Asking Claude to recreate the room...')

    try {
      const response = await fetch('http://localhost:8000/api/generate-complete-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_data: imageData,
          description: description || FALLBACK_DESCRIPTION,
          existing_code: generatedCode || null,
          max_tokens: 8000
        })
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(body || `HTTP ${response.status}`)
      }

      const data = (await response.json()) as { code?: string; source?: string }
      if (!data.code) {
        throw new Error('Claude response missing Three.js code.')
      }

      setGeneratedCode(data.code)
      setSource(data.source ?? '')
      injectGeneratedScene(data.code)

      setStatus('success')
      setMessage('Room rendered successfully. Explore it in 3D!')

      if (onRoomGenerated) {
        onRoomGenerated(data.code)
      }
    } catch (error) {
      console.error('Failed to generate complete room:', error)
      setStatus('error')
      setMessage(`Generation failed: ${(error as Error).message}`)
    }
  }, [description, generatedCode, imageData, injectGeneratedScene, onRoomGenerated])

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Generate a complete room</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a room inspiration photo, add a quick description, and Claude will return fully-populated Three.js code.
          </p>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference photo</span>
              <div className="mt-2 flex h-44 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
                {imageData ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-full w-full overflow-hidden rounded-xl"
                  >
                    <Image
                      src={imageData}
                      alt="Room inspiration"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 360px"
                      priority
                    />
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-700">
                      Change image
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500"
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-sm font-medium">Drop or click to upload</span>
                    <span className="text-xs text-slate-400">JPEG or PNG</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Style prompt</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Bright contemporary bedroom with walnut furniture, brushed brass lighting, and abstract wall art."
                className="mt-2 h-28 w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-inner focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={requestGeneration}
                disabled={status === 'loading'}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating scene
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate full room
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={clearScene}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Clear scene
              </button>

              <button
                type="button"
                onClick={resetView}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                <Undo2 className="h-4 w-4" />
                Reset view
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/40 bg-slate-900/90 p-4 shadow-xl">
          <div className={`mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
            {message}
          </div>
          <div ref={containerRef} className="h-[520px] w-full rounded-xl border border-slate-800 bg-slate-950" />
        </div>
      </section>

      {generatedCode && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Latest Three.js output</h3>
            {source && <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{source}</span>}
          </div>
          <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
            <code>{generatedCode}</code>
          </pre>
        </section>
      )}
    </div>
  )
}