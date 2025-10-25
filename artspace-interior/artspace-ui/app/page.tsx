'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'

import { PageBanner } from './components/PageBanner'
import { SectionCard } from './components/SectionCard'
import { StepHeader } from './components/StepHeader'
import { FloorplanUploader } from './components/FloorplanUploader'
import { StyleQuiz } from './components/StyleQuiz'
import { ThreeDViewer } from './components/3DViewer'
import { PageTransition } from './components/PageTransition'

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [floorplan, setFloorplan] = useState<File | null>(null)
  const [floorplanPreview, setFloorplanPreview] = useState('')
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState('')

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
    setResult('')
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
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
                  >
                    Continue to Style Selection
                  </button>
                </SectionCard>
              </div>
            </PageTransition>

            <PageTransition isVisible={currentStep === 1}>
              <div className="flex-1">
                <StyleQuiz onComplete={handleStylesComplete} />
              </div>
            </PageTransition>

            <PageTransition isVisible={currentStep === 2}>
              <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
                <SectionCard className="flex flex-1 flex-col gap-6">
                  <StepHeader
                    step="Final Step"
                    title="Your 3D Room Visualization"
                    description="Here's your room transformed according to your style preferences."
                  />
                  <div className="flex-1">
                    <ThreeDViewer
                      floorplanImage={floorplanPreview}
                      selectedStyles={selectedStyles}
                    />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleReset} className="geometric-button">
                      Start Over
                    </button>
                    <button
                      onClick={() => setIsProcessing(true)}
                      disabled={isProcessing}
                      className="geometric-button flex-1"
                    >
                      {isProcessing ? 'Processing...' : 'Generate New Variation'}
                    </button>
                  </div>
                </SectionCard>
              </div>
            </PageTransition>
          </div>
        </div>
      </div>
    </main>
  )
}