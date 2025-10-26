"use client"

import React, {useEffect, useRef} from 'react'

type Props = { sessionId: string }

export default function MeshPreview({ sessionId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let mounted = true
    let renderer: any = null
    let scene: any = null
    let camera: any = null
    let controls: any = null
    let animationId: number | null = null

    async function init() {
      const THREE = await import('three')
      const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js')
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js')

      if (!mounted || !containerRef.current) return

      const width = containerRef.current.clientWidth || 600
      const height = containerRef.current.clientHeight || 400

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      containerRef.current.appendChild(renderer.domElement)

      scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf6f6f6)

      camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000)
      camera.position.set(0, 0, 4)

      controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 0, 0)
      controls.update()

      const ambient = new THREE.AmbientLight(0xffffff, 0.8)
      scene.add(ambient)
      const dir = new THREE.DirectionalLight(0xffffff, 0.6)
      dir.position.set(5, 5, 5)
      scene.add(dir)

      const loader = new OBJLoader()
      const meshUrl = `${process.env.NEXT_PUBLIC_NERF_API_URL || 'http://localhost:5000'}/api/mesh/${sessionId}`

      // Show a simple loading text while loading
      const loading = document.createElement('div')
      loading.textContent = 'Loading 3D model...'
      loading.style.position = 'absolute'
      loading.style.top = '8px'
      loading.style.left = '8px'
      loading.style.color = '#666'
      loading.style.fontSize = '13px'
      containerRef.current.appendChild(loading)

      loader.load(
        meshUrl,
        (obj) => {
          if (!mounted) return
          // Center and scale
          const box = new THREE.Box3().setFromObject(obj)
          const size = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = maxDim > 0 ? 2.0 / maxDim : 1.0
          obj.scale.setScalar(scale)
          box.setFromObject(obj)
          const center = box.getCenter(new THREE.Vector3())
          obj.position.sub(center)

          scene.add(obj)
          if (loading.parentNode) loading.parentNode.removeChild(loading)
        },
        (xhr) => {
          // progress
        },
        (err) => {
          console.error('OBJ load error', err)
          if (loading.parentNode) loading.parentNode.removeChild(loading)
        }
      )

      function animate() {
        animationId = requestAnimationFrame(animate)
        if (controls) controls.update()
        renderer.render(scene, camera)
      }

      animate()

      function onResize() {
        if (!containerRef.current) return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }

      window.addEventListener('resize', onResize)

      // cleanup
      return () => {
        mounted = false
        window.removeEventListener('resize', onResize)
        if (animationId) cancelAnimationFrame(animationId)
        if (renderer) {
          renderer.dispose()
          if (renderer.domElement && renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
      }
    }

    const cleanupPromise = init()

    return () => {
      mounted = false
      // cleanupPromise may return cleanup; rely on effect cleanup above
    }
  }, [sessionId])

  return (
    <div ref={containerRef} className="relative h-96 w-full rounded-lg bg-[var(--surface)]" />
  )
}
