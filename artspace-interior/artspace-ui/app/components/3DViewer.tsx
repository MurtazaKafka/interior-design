import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

type ThreeDViewerProps = {
  floorplanImage: string
  selectedStyles: string[]
}

export const ThreeDViewer = ({ floorplanImage, selectedStyles }: ThreeDViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    sceneRef.current = scene

    // Initialize camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.z = 5
    cameraRef.current = camera

    // Initialize renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Initialize controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controlsRef.current = controls

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Load floorplan texture
    const textureLoader = new THREE.TextureLoader()
    textureLoader.load(floorplanImage, (texture) => {
      const aspectRatio = texture.image.width / texture.image.height
      const geometry = new THREE.PlaneGeometry(aspectRatio * 2, 2)
      const material = new THREE.MeshBasicMaterial({ map: texture })
      const plane = new THREE.Mesh(geometry, material)
      scene.add(plane)

      // Add walls (placeholder)
      const wallHeight = 1
      const wallGeometry = new THREE.BoxGeometry(aspectRatio * 2, wallHeight, 0.1)
      const wallMaterial = new THREE.MeshPhongMaterial({ color: 0xeeeeee })
      
      // Back wall
      const backWall = new THREE.Mesh(wallGeometry, wallMaterial)
      backWall.position.set(0, wallHeight / 2, -0.05)
      scene.add(backWall)

      // Side walls
      const sideWallGeometry = new THREE.BoxGeometry(0.1, wallHeight, 2)
      const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
      leftWall.position.set(-aspectRatio, wallHeight / 2, 0)
      scene.add(leftWall)

      const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial)
      rightWall.position.set(aspectRatio, wallHeight / 2, 0)
      scene.add(rightWall)

      // Position camera to view the entire room
      camera.position.set(0, wallHeight * 2, wallHeight * 3)
      camera.lookAt(0, 0, 0)
      controls.update()
    })

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      if (controlsRef.current) controlsRef.current.update()
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current)
      }
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      rendererRef.current.setSize(width, height)
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [floorplanImage])

  return (
    <div className="relative flex h-full w-full flex-col">
      <div ref={containerRef} className="flex-1 w-full rounded-xl border-2 border-[var(--border)] bg-white shadow-lg" />
      <div className="absolute bottom-6 right-6 rounded-xl bg-white/90 p-4 text-base shadow-lg backdrop-blur">
        <p className="font-semibold">Selected Styles:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedStyles.map(style => (
            <span
              key={style}
              className="rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-sm font-medium text-[var(--accent)] shadow-sm"
            >
              {style}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
