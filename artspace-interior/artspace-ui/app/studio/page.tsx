'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

import { StepHeader } from '../components/StepHeader'
import { FloorplanUploader } from '../components/FloorplanUploader'
import { StyleQuiz } from '../components/StyleQuiz'
import { ThreeDViewer } from '../components/3DViewer'
import { PageTransition } from '../components/PageTransition'

export default function StudioPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [floorplan, setFloorplan] = useState<File | null>(null)
  const [floorplanPreview, setFloorplanPreview] = useState('')
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

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

  const handleStylesComplete = (styles: string[]) => {
    setSelectedStyles(styles)
    setCurrentStep(2)
  }

  const handleReset = () => {
    setCurrentStep(0)
    setFloorplan(null)
    setFloorplanPreview('')
    setSelectedStyles([])
  }

  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <main className="relative overflow-hidden bg-gradient-to-b from-[#f9f7f3] to-[#fefdfc] text-[var(--foreground)]">
      {/* Hero Section */}
      <motion.section 
        className="relative flex items-start justify-center px-6 pt-16 pb-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center text-center">
          <motion.h1 
            className="serif text-6xl font-semibold leading-[1.1] tracking-[0.02em] text-[#1a1a1a] md:text-7xl mb-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            Compose Your Interior
          </motion.h1>
          
              {/* Small spacer */}
              <div className="h-4 w-full"></div>
              
              <motion.p 
                className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600 opacity-85 mb-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ delay: 0.8, duration: 1 }}
              >
                Upload architectural plans. Define atmosphere through visual references. 
                Walk through rendered reality — where precision meets artistic vision.
              </motion.p>

          {/* Scroll Indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="text-xl text-[var(--accent)]"
          >
            ↓
          </motion.div>
        </div>
      </motion.section>

      {/* Small spacer */}
      <div className="h-4 w-full"></div>
      
      {/* Animated Divider */}
      <motion.div 
        className="mx-auto h-[1px] w-full max-w-6xl bg-gradient-to-r from-transparent via-[#d9c6a1] to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        viewport={{ once: true }}
      />

      {/* Main Content */}
      <div className="mx-auto flex w-full flex-col items-center justify-start py-32">
        <PageTransition isVisible={currentStep === 0}>
          <motion.section
            ref={sectionRef}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            viewport={{ once: true }}
            className="flex w-full max-w-3xl flex-col items-center justify-center px-6 text-center pt-32"
          >
            {/* Spacer to push text down */}
            <div className="h-16 w-full"></div>
            
            {/* Section Header */}
            <h2 className="serif text-2xl font-semibold text-[#1a1a1a] mb-8">Import Your Plan</h2>
            
            <p className="mx-auto max-w-lg leading-relaxed text-gray-600 mb-32">
              Upload scaled architectural plans. Every dimension honored. Floorplans become spatial truth.
            </p>

            {/* Spacer to push upload card down */}
            <div className="h-12 w-full"></div>

            {/* Upload Card */}
            <motion.div 
              className="flex w-full max-w-lg flex-col items-center gap-8 rounded-xl border border-[#e6e2da] bg-white p-10 shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 mt-56"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex w-full flex-col items-center justify-center mb-8">
                <FloorplanUploader
                  floorplanPreview={floorplanPreview}
                  onUpload={handleFloorplanUpload}
                  onDrop={handleFloorplanDrop}
                />
              </div>
              
              <div className="flex w-full items-center justify-center mt-auto mb-auto pt-8">
                <motion.button
                  onClick={handleFloorplanComplete}
                  disabled={!floorplan}
                  className="rounded-lg bg-[#c7a564] border-2 border-[#b89050] px-12 py-4 text-white font-medium text-lg shadow-lg hover:bg-[#b89050] hover:border-[#a67d40] hover:shadow-xl transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#c7a564] disabled:hover:border-[#b89050] disabled:hover:shadow-lg"
                  style={{ marginTop: '-16px', marginBottom: '16px' }}
                  whileHover={floorplan ? { scale: 1.05 } : {}}
                  whileTap={floorplan ? { scale: 0.95 } : {}}
                >
                  Continue to Visual Direction →
                </motion.button>
              </div>
            </motion.div>
          </motion.section>
        </PageTransition>

          <PageTransition isVisible={currentStep === 1}>
            <div className="flex-1">
              <StyleQuiz onComplete={handleStylesComplete} />
            </div>
          </PageTransition>

          <PageTransition isVisible={currentStep === 2}>
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center"
            >
              <motion.div 
                className="flex w-full flex-col gap-8 rounded-2xl border border-[#e6e2da] bg-white p-10 shadow-[0_4px_25px_rgba(0,0,0,0.05)]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <StepHeader
                  step=""
                  title="Inhabit Your Space"
                  description="Navigate the rendered space in real-time. Iterate with minimal gestures until atmosphere aligns with intent."
                />
                <div className="flex-1">
                  <ThreeDViewer
                    floorplanImage={floorplanPreview}
                    selectedStyles={selectedStyles}
                  />
                </div>
                <div className="flex gap-4">
                  <motion.button 
                    onClick={handleReset} 
                    className="border-2 border-[var(--border-strong)] bg-transparent px-8 py-4 text-base font-semibold tracking-wide text-[var(--foreground)] transition-all duration-300 hover:border-[var(--foreground)] hover:bg-[var(--foreground)] hover:text-[var(--background)]"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Reset Studio
                  </motion.button>
                  <motion.button
                    onClick={() => setIsProcessing(true)}
                    disabled={isProcessing}
                    className="flex-1 border-2 border-[var(--accent)] bg-transparent px-8 py-4 text-base font-semibold tracking-wide text-[var(--accent)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--accent)]"
                    whileHover={!isProcessing ? { scale: 1.02 } : {}}
                    whileTap={!isProcessing ? { scale: 0.98 } : {}}
                  >
                    {isProcessing ? 'Composing...' : 'Refine Composition'}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </PageTransition>
      </div>
    </main>
  )
}
