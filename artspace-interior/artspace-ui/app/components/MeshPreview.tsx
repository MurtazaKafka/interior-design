"use client"

import React, { useEffect, useRef } from 'react'
import type { PerspectiveCamera, Scene, WebGLRenderer, Vector3, Box3, Object3D, Mesh } from 'three'
import type { OrbitControls as OrbitControlsType } from 'three/examples/jsm/controls/OrbitControls'

type Props = { sessionId: string }

export default function MeshPreview({ sessionId }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let mounted = true
    let renderer: WebGLRenderer | null = null
    let scene: Scene | null = null
    let camera: PerspectiveCamera | null = null
    let controls: OrbitControlsType | null = null
    let animationId: number | null = null
    let loadingEl: HTMLDivElement | null = null

    const init = async () => {
  const THREE = await import('three')
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls')

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

      loadingEl = document.createElement('div')
      loadingEl.textContent = 'Loading 3D model...'
      loadingEl.style.position = 'absolute'
      loadingEl.style.top = '8px'
      loadingEl.style.left = '8px'
      loadingEl.style.color = '#666'
      loadingEl.style.fontSize = '13px'
      containerRef.current.appendChild(loadingEl)

      loader.load(
        meshUrl,
        (obj: Object3D) => {
          if (!mounted || !scene) return

          const box: Box3 = new THREE.Box3().setFromObject(obj)
          const size: Vector3 = box.getSize(new THREE.Vector3())
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = maxDim > 0 ? 2.0 / maxDim : 1.0
          obj.scale.setScalar(scale)
          box.setFromObject(obj)
          const center: Vector3 = box.getCenter(new THREE.Vector3())
          obj.position.sub(center)

          scene.add(obj)
          if (loadingEl?.parentNode) loadingEl.parentNode.removeChild(loadingEl)
        },
        () => {
          // progress handler optional
        },
        (err: ErrorEvent | Error) => {
          console.error('OBJ load error', err)
          if (loadingEl?.parentNode) loadingEl.parentNode.removeChild(loadingEl)
        }
      )

      const animate = () => {
        animationId = requestAnimationFrame(animate)
        controls?.update()
        if (scene && camera && renderer) {
          renderer.render(scene, camera)
        }
      }

      animate()

      const onResize = () => {
        if (!containerRef.current || !camera || !renderer) return
        const w = containerRef.current.clientWidth
        const h = containerRef.current.clientHeight
        camera.aspect = w / Math.max(h, 1)
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }

      window.addEventListener('resize', onResize)

      return () => {
        window.removeEventListener('resize', onResize)
      }
    }

    let teardown: (() => void) | void
    void init().then((maybeCleanup) => {
      teardown = maybeCleanup
    })

    return () => {
      mounted = false
      if (animationId) cancelAnimationFrame(animationId)
      teardown?.()

      if (controls) {
        controls.dispose()
      }

      if (renderer) {
        renderer.dispose()
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement)
        }
      }

      if (scene) {
        scene.traverse((obj) => {
          const candidate = obj as Mesh
          if ('isMesh' in candidate && candidate.isMesh) {
            const mesh = candidate
            mesh.geometry?.dispose()
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((mat) => mat.dispose())
            } else if (mesh.material) {
              mesh.material.dispose()
            }
          }
        })
      }

      if (loadingEl?.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl)
      }
    }
  }, [sessionId])

  return <div ref={containerRef} className="relative h-96 w-full rounded-lg bg-[var(--surface)]" />
}
