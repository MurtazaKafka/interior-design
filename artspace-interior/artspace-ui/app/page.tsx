'use client'

import { useState } from 'react'
import type { ChangeEvent } from 'react'

import { PageBanner } from './components/PageBanner'
import { SectionCard } from './components/SectionCard'
import { StepHeader } from './components/StepHeader'
import { FloorplanUploader } from './components/FloorplanUploader'
import { InspirationUploader } from './components/InspirationUploader'
import { CurationForm } from './components/CurationForm'
import { StudioHeader } from './components/StudioHeader'
import { StudioChatPanel } from './components/StudioChatPanel'
import { ConceptPreviewCard } from './components/ConceptPreviewCard'
import { StudioStatusBar } from './components/StudioStatusBar'
import { ChatMessage } from './types/chat'

export default function HomePage() {
  const [floorplan, setFloorplan] = useState<File | null>(null)
  const [floorplanPreview, setFloorplanPreview] = useState('')
  const [inspiration, setInspiration] = useState<File[]>([])
  const [inspirationPreviews, setInspirationPreviews] = useState<string[]>([])
  const [artistInput, setArtistInput] = useState('')
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [chatPrompt, setChatPrompt] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      message: 'Describe how you want to feel when you enter this room.'
    }
  ])
  const [isListening, setIsListening] = useState(false)
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

  const handleInspirationUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setInspiration(prev => [...prev, ...files])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setInspirationPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleInspirationDrop = (files: FileList) => {
    const batch = Array.from(files)
    if (!batch.length) return

    setInspiration(prev => [...prev, ...batch])
    batch.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setInspirationPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style) ? prev.filter(item => item !== style) : [...prev, style]
    )
  }

  const handleSendPrompt = () => {
    const trimmed = chatPrompt.trim()
    if (!trimmed) return

    setChatHistory(prev => [
      ...prev,
      { role: 'user', message: trimmed },
      {
        role: 'assistant',
        message: "Noted. I'll weave that into the palette and spatial proportions."
      }
    ])
    setChatPrompt('')
  }

  const handleGenerate = () => {
    if (!floorplan) return

    setIsProcessing(true)
    setTimeout(() => {
      const influenceSummary =
        selectedStyles.length > 0
          ? selectedStyles.join(' · ')
          : artistInput
          ? artistInput
          : 'Custom curation'

      setResult(floorplanPreview || '/window.svg')
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          message: `Concept locked. Rendering with ${influenceSummary.toLowerCase()}.`
        }
      ])
      setIsProcessing(false)
    }, 1400)
  }

  const resetAll = () => {
    setFloorplan(null)
    setFloorplanPreview('')
    setInspiration([])
    setInspirationPreviews([])
    setArtistInput('')
    setSelectedStyles([])
    setChatPrompt('')
    setChatHistory([
      {
        role: 'assistant',
        message: 'Describe how you want to feel when you enter this room.'
      }
    ])
    setIsListening(false)
    setResult('')
  }

  const canGenerate =
    !!floorplan &&
    (inspiration.length > 0 || selectedStyles.length > 0 || artistInput.trim().length > 0)

  const hasBrief =
    !!floorplan || inspiration.length > 0 || selectedStyles.length > 0 || artistInput.trim().length > 0

  const conceptStatus = result
    ? 'Preview ready — adjust inputs to iterate again.'
    : canGenerate
    ? 'Brief locked. Ready when you are.'
    : 'Upload a plan and curation to unlock rendering.'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-8 text-[var(--foreground)] md:px-10 md:py-10">
      <div className="page-shell flex w-full max-w-[1180px] flex-col gap-8 px-9 py-9">
        <PageBanner />

        <div className="grid flex-1 gap-6 xl:grid-cols-[1.2fr_0.9fr]">
          <SectionCard className="gap-5">
            <StudioHeader isListening={isListening} onToggleListening={() => setIsListening(prev => !prev)} />

            <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <StudioChatPanel
                history={chatHistory}
                composer={{
                  value: chatPrompt,
                  placeholder: 'Describe adjustments—e.g. add a charcoal sofa with walnut legs.',
                  onChange: setChatPrompt,
                  onSubmit: handleSendPrompt
                }}
              />

              <ConceptPreviewCard
                result={result}
                fallback="/window.svg"
                floorplanPreview={floorplanPreview}
                influences={selectedStyles}
                artistInput={artistInput}
                inspirationPreviews={inspirationPreviews}
              />
            </div>

            <StudioStatusBar
              status={conceptStatus}
              onGenerate={handleGenerate}
              onReset={resetAll}
              canGenerate={canGenerate}
              isProcessing={isProcessing}
              showReset={hasBrief}
            />
          </SectionCard>

          <div className="flex flex-col gap-5">
              <SectionCard className="gap-3">
              <StepHeader
                step="Step 01"
                title="Floorplan canvas"
                description="Drop a scaled plan or browse from your files. Accepted: PDF, PNG, JPG."
                meta={
                  floorplan ? (
                    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--accent)]">Ready</span>
                  ) : null
                }
              />

              <FloorplanUploader
                floorplanPreview={floorplanPreview}
                onUpload={handleFloorplanUpload}
                onDrop={handleFloorplanDrop}
              />
            </SectionCard>

            <SectionCard className="gap-4">
              <StepHeader
                step="Step 02"
                title="Curate the narrative"
                description="Layer references, artists, and material language to steer the concept."
                meta={
                  inspiration.length > 0 || selectedStyles.length > 0 || artistInput.trim().length > 0 ? (
                    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--accent)]">Enriched</span>
                  ) : null
                }
              />

              <InspirationUploader
                previews={inspirationPreviews}
                onUpload={handleInspirationUpload}
                onDrop={handleInspirationDrop}
              />

              <CurationForm
                artistInput={artistInput}
                onArtistChange={setArtistInput}
                selectedStyles={selectedStyles}
                onToggleStyle={toggleStyle}
              />
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  )
}