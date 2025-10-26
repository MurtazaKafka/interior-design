'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'

import { ZoomScene } from './components/ZoomScene'
import { PageBanner } from './components/PageBanner'
import { SectionCard } from './components/SectionCard'
import { StepHeader } from './components/StepHeader'
import { FloorplanUploader } from './components/FloorplanUploader'
import { TasteFingerprint } from './components/TasteFingerprint'
import { PageTransition } from './components/PageTransition'
import { ImageTo3D } from './components/ImageTo3D'
import { CompleteRoomGenerator } from './components/CompleteRoomGenerator'
import { fetchArtworks, type Artwork } from '@/lib/taste-api'

export default function HomePage() {
  const { scrollYProgress } = useScroll()
  const [hasStarted, setHasStarted] = useState(false)

  // Hero section fades out
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, -50])

  // Canvas scroll progress (for camera zoom) - maps 15% to 75% scroll to 0-1
  const canvasScrollProgress = useTransform(scrollYProgress, [0.15, 0.75], [0, 1])

  // Act overlays inside the frame - extended visibility with hold periods
  const act1Opacity = useTransform(scrollYProgress, [0.2, 0.28, 0.38, 0.45], [0, 1, 1, 0])
  const act1Y = useTransform(scrollYProgress, [0.2, 0.28], [20, 0])
  const act2Opacity = useTransform(scrollYProgress, [0.42, 0.5, 0.6, 0.67], [0, 1, 1, 0])
  const act2Y = useTransform(scrollYProgress, [0.42, 0.5], [20, 0])
  const act3Opacity = useTransform(scrollYProgress, [0.64, 0.72, 0.82, 0.88], [0, 1, 1, 0])
  const act3Y = useTransform(scrollYProgress, [0.64, 0.72], [20, 0])

  // Canvas and final section crossfade (seamless transition)
  const canvasOpacity = useTransform(scrollYProgress, [0.08, 0.15, 0.85, 0.92], [0, 1, 1, 0])
  const finalOpacity = useTransform(scrollYProgress, [0.88, 0.95], [0, 1])
  const finalY = useTransform(scrollYProgress, [0.88, 0.95], [20, 0])

  // Convert scroll progress to 0-1 for ZoomScene
  const [zoomProgress, setZoomProgress] = useState(0)
  useEffect(() => {
    if (hasStarted) return
    const unsubscribe = canvasScrollProgress.on('change', (value) => {
      setZoomProgress(Math.max(0, Math.min(1, value)))
    })
    return () => unsubscribe()
  }, [canvasScrollProgress, hasStarted])

  const handleBeginScroll = () => {
    setHasStarted(true)
    const target = document.getElementById('studio')
    requestAnimationFrame(() => {
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === '#studio') {
      setHasStarted(true)
    }
  }, [])

  useEffect(() => {
    if (hasStarted) return
    const unsubscribe = scrollYProgress.on('change', (value) => {
      if (value > 0.94) {
        setHasStarted(true)
      }
    })
    return () => unsubscribe()
  }, [scrollYProgress, hasStarted])

  const [currentStep, setCurrentStep] = useState(0)
  const [floorplan, setFloorplan] = useState<File | null>(null)
  const [floorplanPreview, setFloorplanPreview] = useState('')
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [isGeneratingFromImage, setIsGeneratingFromImage] = useState(false)
  const [showImageTo3D, setShowImageTo3D] = useState(false)
  const [userId] = useState<string>(
    () => `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  )

  useEffect(() => {
    fetchArtworks()
      .then(setArtworks)
      .catch((error) => {
        console.error('Failed to load artworks:', error)
      })
  }, [])

  const handleFloorplanUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setFloorplan(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setFloorplanPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFloorplanDrop = (files: FileList) => {
    const file = files[0]
    if (!file) return

    setFloorplan(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setFloorplanPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFloorplanComplete = () => {
    setCurrentStep(1)
  }

  const handleTasteComplete = async (vector: number[]) => {
    console.info('Taste vector captured', vector.length)
    setCurrentStep(2)
  }

  const handleImageTo3D = async (imageUrl: string, description: string) => {
    setIsGeneratingFromImage(true)
    try {
      const response = await fetch('http://localhost:8000/api/image-to-3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          description,
          enhance_with_ai: true,
        }),
      })

      if (response.ok) {
        await response.json()
        setShowImageTo3D(false)
      }
    } catch (error) {
      console.error('Error generating 3D from image:', error)
    } finally {
      setIsGeneratingFromImage(false)
    }
  }

  return (
    <main className="relative bg-[var(--background)] text-[var(--foreground)]">
      {!hasStarted && (
        <>
          <section className="relative flex min-h-screen items-center justify-center">
            <motion.div 
              className="relative z-10 mx-auto flex max-w-[800px] flex-col items-center gap-10 px-8 text-center"
              style={{ opacity: heroOpacity, y: heroY }}
            >
              <motion.p 
                className="text-xs uppercase tracking-[0.35em] text-[var(--accent)]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 1.2 }}
              >
                Architecture as Interface
              </motion.p>
              
              <motion.h1 
                className="serif text-engraved text-balance text-[3.5rem] leading-[1.05] tracking-[-0.01em] md:text-[5rem] lg:text-[6rem]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 1.4 }}
              >
                Compose spaces through{' '}
                <span className="italic text-[var(--accent)]">intention</span>
              </motion.h1>
              
              <motion.p 
                className="max-w-[560px] text-base leading-relaxed text-[var(--foreground-subtle)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3, duration: 1.2 }}
              >
                Upload a plan. Define the atmosphere. Walk through rendered reality — 
                where precision meets artistic vision.
              </motion.p>
              
              <motion.p 
                className="text-xs tracking-[0.2em] uppercase text-[var(--foreground-subtle)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.7, duration: 1 }}
              >
                Scroll to enter
              </motion.p>
            </motion.div>

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(250,249,247,0.3)_70%)]" />
          </section>

          <section className="relative">
            <div className="h-[300vh]" />
            
            <motion.div 
              className="fixed top-0 left-0 right-0 h-screen w-full pointer-events-none"
              style={{ opacity: canvasOpacity }}
            >
              <div className="absolute inset-0">
                <ZoomScene scrollProgress={zoomProgress} />
              </div>

              <motion.div 
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ opacity: act1Opacity, y: act1Y }}
              >
                <div className="max-w-[600px] space-y-6 px-8 text-center">
                  <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-md px-10 py-8 rounded-2xl shadow-2xl">
                    <div className="space-y-4">
                      <p className="text-xs tracking-[0.35em] uppercase text-[#c7a564] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        Act I
                      </p>
                      <div className="serif text-[5rem] leading-none text-[#c7a564]/50" style={{ textShadow: '0 4px 12px rgba(199,165,100,0.3)' }}>
                        I
                      </div>
                      <h2 className="serif text-4xl md:text-5xl text-[#f7f3eb] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        Import
                      </h2>
                    </div>
                    <p className="mt-6 text-lg leading-relaxed text-[#f5f0e6]/95" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      Upload scaled architectural plans. Every dimension honored. 
                      Floorplans become spatial truth, translated with architectural fidelity.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ opacity: act2Opacity, y: act2Y }}
              >
                <div className="max-w-[600px] space-y-6 px-8 text-center">
                  <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-md px-10 py-8 rounded-2xl shadow-2xl">
                    <div className="space-y-4">
                      <p className="text-xs tracking-[0.35em] uppercase text-[#c7a564] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        Act II
                      </p>
                      <div className="serif text-[5rem] leading-none text-[#c7a564]/50" style={{ textShadow: '0 4px 12px rgba(199,165,100,0.3)' }}>
                        II
                      </div>
                      <h2 className="serif text-4xl md:text-5xl text-[#f7f3eb] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        Direct
                      </h2>
                    </div>
                    <p className="mt-6 text-lg leading-relaxed text-[#f5f0e6]/95" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      Select visual references. Your selections orchestrate light, surface, 
                      and composition. The system interprets material and compositional language.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ opacity: act3Opacity, y: act3Y }}
              >
                <div className="max-w-[600px] space-y-6 px-8 text-center">
                  <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-md px-10 py-8 rounded-2xl shadow-2xl">
                    <div className="space-y-4">
                      <p className="text-xs tracking-[0.35em] uppercase text-[#c7a564] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        Act III
                      </p>
                      <div className="serif text-[5rem] leading-none text-[#c7a564]/50" style={{ textShadow: '0 4px 12px rgba(199,165,100,0.3)' }}>
                        III
                      </div>
                      <h2 className="serif text-4xl md:text-5xl text-[#f7f3eb] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                        Inhabit
                      </h2>
                    </div>
                    <p className="mt-6 text-lg leading-relaxed text-[#f5f0e6]/95" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      Navigate the rendered space in real-time. Iterate with minimal gestures 
                      until atmosphere aligns with intent. Your spatial narrative comes alive.
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(250,249,247,0.2)_100%)]" />
            </motion.div>

            <motion.div 
              className="fixed top-0 left-0 right-0 h-screen flex items-center justify-center px-8 pointer-events-none"
              style={{ opacity: finalOpacity, y: finalY }}
            >
              <div className="mx-auto max-w-[700px] -translate-y-10 space-y-8 text-center">
                <div className="space-y-5">
                  <h2 className="serif text-4xl leading-tight md:text-5xl lg:text-6xl">
                    From sketch to spatial clarity
                  </h2>
                  <p className="text-lg leading-relaxed text-[var(--foreground-subtle)] md:text-xl">
                    A studio built for speed and intent — less fiddling, more composing. 
                    Minimal UI, maximal results.
                  </p>
                </div>

                <div className="mt-40">
                  <div className="group inline-block pointer-events-auto">
                    <div className="relative">
                      <div className="absolute -inset-3 bg-gradient-to-r from-[#c9a56a]/40 via-[#d4b87a]/40 to-[#c9a56a]/40 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700"></div>
                      <div className="absolute -inset-[4px] border border-[#c9a56a]/20 group-hover:border-[#c9a56a]/40 transition-all duration-500"></div>
                      <button
                        onClick={handleBeginScroll}
                        className="relative px-28 py-7 bg-[var(--background)] border-[3px] border-[#c9a56a] text-[#c9a56a] font-semibold text-3xl tracking-[0.2em] uppercase overflow-hidden transition-all duration-500 group-hover:border-[#d4b87a] group-hover:shadow-[0_12px_40px_rgba(201,165,106,0.3)]"
                        type="button"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-in-out"></span>
                        <span className="absolute inset-0 bg-gradient-to-br from-[#c9a56a] via-[#d4b87a] to-[#b8945a] translate-y-full group-hover:translate-y-0 transition-transform duration-600 ease-out"></span>
                        <span className="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                        <span className="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                        <span className="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                        <span className="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                        <span className="relative z-10 flex items-center justify-center gap-5 group-hover:text-white transition-colors duration-400">
                          <span>Begin</span>
                          <svg className="h-8 w-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        </>
      )}

      {/* SECTION 3: Interactive Studio Workflow */}
      <section
        id="studio"
        className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]"
      >
        <div className="flex-1 px-6 py-8 md:px-10 md:py-10">
          <div className="page-shell mx-auto flex h-full w-full max-w-[1180px] flex-col gap-8 px-9 py-9">
            <PageBanner />

            <div className="flex flex-1 flex-col">
              <PageTransition isVisible={currentStep === 0}>
                <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
                  <SectionCard className="flex flex-1 flex-col gap-6">
                    <StepHeader
                      step="Step 1"
                      title="Upload Your Floorplan"
                      description="Start by uploading your room's floorplan. We'll use this to create your 3D visualization."
                    />
                    <div className="flex-1">
                      <FloorplanUploader
                        floorplanPreview={floorplanPreview}
                        onUpload={handleFloorplanUpload}
                        onDrop={handleFloorplanDrop}
                      />
                    </div>
                    <button
                      onClick={handleFloorplanComplete}
                      disabled={!floorplan}
                      className="geometric-button w-full"
                      type="button"
                    >
                      Continue to Style Selection
                    </button>
                  </SectionCard>
                </div>
              </PageTransition>

              <PageTransition isVisible={currentStep === 1}>
                <div className="flex-1">
                  <TasteFingerprint onComplete={handleTasteComplete} userId={userId} artworks={artworks} />
                </div>
              </PageTransition>

              <PageTransition isVisible={currentStep === 2}>
                <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
                  <CompleteRoomGenerator />
                </div>
              </PageTransition>

              {showImageTo3D && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-8">
                  <div className="max-h-[90vh] overflow-y-auto rounded-xl bg-white">
                    <div className="flex items-center justify-between border-b p-4">
                      <h2 className="text-xl font-semibold">Generate 3D Model from Image</h2>
                      <button
                        onClick={() => setShowImageTo3D(false)}
                        className="text-gray-500 hover:text-gray-700"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                    <ImageTo3D onGenerate={handleImageTo3D} isGenerating={isGeneratingFromImage} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
