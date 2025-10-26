'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ZoomScene } from './components/ZoomScene'
import { useState, useEffect } from 'react'

export default function Home() {
  const { scrollYProgress } = useScroll()
  const [scrollY, setScrollY] = useState(0)
  
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Hero section fades out
  const heroOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.12], [0, -50])
  
  // Canvas scroll progress (for camera zoom) - maps 15% to 75% scroll to 0-1
  const canvasScrollProgress = useTransform(scrollYProgress, [0.15, 0.75], [0, 1])
  
  // Act overlays inside the frame - extended visibility with hold periods
  // Act I: Fade in → Hold → Fade out
  const act1Opacity = useTransform(scrollYProgress, [0.20, 0.28, 0.38, 0.45], [0, 1, 1, 0])
  const act1Y = useTransform(scrollYProgress, [0.20, 0.28], [20, 0])
  
  // Act II: Fade in → Hold → Fade out
  const act2Opacity = useTransform(scrollYProgress, [0.42, 0.50, 0.60, 0.67], [0, 1, 1, 0])
  const act2Y = useTransform(scrollYProgress, [0.42, 0.50], [20, 0])
  
  // Act III: Fade in → Hold → Fade out
  const act3Opacity = useTransform(scrollYProgress, [0.64, 0.72, 0.82, 0.88], [0, 1, 1, 0])
  const act3Y = useTransform(scrollYProgress, [0.64, 0.72], [20, 0])
  
  // Canvas and final section crossfade (seamless transition)
  const canvasOpacity = useTransform(scrollYProgress, [0.08, 0.15, 0.85, 0.92], [0, 1, 1, 0])
  const finalOpacity = useTransform(scrollYProgress, [0.88, 0.95], [0, 1])
  const finalY = useTransform(scrollYProgress, [0.88, 0.95], [20, 0])
  
  // Convert scroll progress to 0-1 for ZoomScene
  const [zoomProgress, setZoomProgress] = useState(0)
  useEffect(() => {
    const unsubscribe = canvasScrollProgress.on('change', (v) => setZoomProgress(Math.max(0, Math.min(1, v))))
    return () => unsubscribe()
  }, [canvasScrollProgress])

  return (
    <main className="relative bg-[var(--background)] text-[var(--foreground)]">
      {/* SECTION 1: Hero - Static Typography */}
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
            Design spaces from{' '}
            <span className="italic text-[var(--accent)]">art</span>
          </motion.h1>
          
          <motion.p 
            className="max-w-[560px] text-base leading-relaxed text-[var(--foreground-subtle)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 1.2 }}
          >
            Select artwork that inspires you. We'll analyze the colors, mood, and style 
            to generate a 3D room layout with furniture that captures the same artistic essence.
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

        {/* Soft vignette */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(250,249,247,0.3)_70%)]" />
      </section>

      {/* SECTION 2: The Frame Journey - Scroll-driven 3D */}
      <section className="relative">
        {/* Scroll spacer - only exists during canvas animation */}
        <div className="h-[300vh]" />
        
        {/* Fixed Three.js Canvas that fades in/out */}
        <motion.div 
          className="fixed top-0 left-0 right-0 h-screen w-full pointer-events-none"
          style={{ opacity: canvasOpacity }}
        >
          {/* Three.js Scene */}
          <div className="absolute inset-0">
            <ZoomScene scrollProgress={zoomProgress} />
            </div>

          {/* Act I: Import - HTML Overlay */}
          <motion.div 
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: act1Opacity, y: act1Y }}
          >
            <div className="max-w-[600px] space-y-6 px-8 text-center">
              <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-md px-10 py-8 rounded-2xl shadow-2xl">
                <div className="space-y-4">
                  <div className="serif text-[5rem] leading-none text-[#c7a564]/50" style={{ textShadow: '0 4px 12px rgba(199,165,100,0.3)' }}>
                    I
                  </div>
                  <h2 className="serif text-4xl md:text-5xl text-[#f7f3eb] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    Import
                  </h2>
                </div>
                <p className="mt-6 text-lg leading-relaxed text-[#f5f0e6]/95" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  Upload scaled architectural plans. Import floorplan files to begin the design process. 
                  Every dimension will be honored with architectural fidelity.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Act II: Direct - HTML Overlay */}
          <motion.div 
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: act2Opacity, y: act2Y }}
          >
            <div className="max-w-[600px] space-y-6 px-8 text-center">
              <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-md px-10 py-8 rounded-2xl shadow-2xl">
                <div className="space-y-4">
                  <div className="serif text-[5rem] leading-none text-[#c7a564]/50" style={{ textShadow: '0 4px 12px rgba(199,165,100,0.3)' }}>
                    II
                  </div>
                  <h2 className="serif text-4xl md:text-5xl text-[#f7f3eb] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    Choose
                  </h2>
                </div>
                <p className="mt-6 text-lg leading-relaxed text-[#f5f0e6]/95" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  Choose styles that resonate with your selected artwork. The system analyzes 
                  colors, mood, and artistic essence to refine the design direction.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Act III: Inhabit - HTML Overlay */}
          <motion.div 
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ opacity: act3Opacity, y: act3Y }}
          >
            <div className="max-w-[600px] space-y-6 px-8 text-center">
              <div className="bg-[rgba(0,0,0,0.3)] backdrop-blur-md px-10 py-8 rounded-2xl shadow-2xl">
                <div className="space-y-4">
                  <div className="serif text-[5rem] leading-none text-[#c7a564]/50" style={{ textShadow: '0 4px 12px rgba(199,165,100,0.3)' }}>
                    III
                  </div>
                  <h2 className="serif text-4xl md:text-5xl text-[#f7f3eb] font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    Generate
                  </h2>
                </div>
                <p className="mt-6 text-lg leading-relaxed text-[#f5f0e6]/95" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                  Explore your personalized 3D room layout. Furniture and decor are carefully 
                  selected to match the artistic essence of your chosen paintings.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Subtle vignette overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(250,249,247,0.2)_100%)]" />
        </motion.div>

        {/* Final section positioned in viewport center */}
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

            {/* Redesigned BEGIN button */}
            <div className="mt-40">
              <Link 
                href="/studio" 
                className="group inline-block pointer-events-auto"
              >
                <div className="relative">
                  {/* Animated glow effect */}
                  <div className="absolute -inset-3 bg-gradient-to-r from-[#c9a56a]/40 via-[#d4b87a]/40 to-[#c9a56a]/40 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-700"></div>
                  
                  {/* Outer decorative border */}
                  <div className="absolute -inset-[4px] border border-[#c9a56a]/20 group-hover:border-[#c9a56a]/40 transition-all duration-500"></div>
                  
                  {/* Button */}
                  <button className="relative px-28 py-7 bg-[var(--background)] border-[3px] border-[#c9a56a] text-[#c9a56a] font-semibold text-3xl tracking-[0.2em] uppercase overflow-hidden transition-all duration-500 group-hover:border-[#d4b87a] group-hover:shadow-[0_12px_40px_rgba(201,165,106,0.3)]">
                    {/* Shine effect on hover */}
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1200 ease-in-out"></span>
                    
                    {/* Fill animation */}
                    <span className="absolute inset-0 bg-gradient-to-br from-[#c9a56a] via-[#d4b87a] to-[#b8945a] translate-y-full group-hover:translate-y-0 transition-transform duration-600 ease-out"></span>
                    
                    {/* Corner accents */}
                    <span className="absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                    <span className="absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                    <span className="absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                    <span className="absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] border-[#c9a56a] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                    
                    {/* Text */}
                    <span className="relative z-10 flex items-center justify-center gap-5 group-hover:text-white transition-colors duration-400">
                      <span>Begin</span>
                      <svg className="w-8 h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
          </div>
              </Link>
        </div>
      </div>
        </motion.div>
      </section>
    </main>
  )
}
