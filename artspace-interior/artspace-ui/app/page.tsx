'use client'

import NextImage from 'next/image'
import { useState } from 'react'
import { Mic, MicOff, Send, Sparkles, Upload } from 'lucide-react'

const STYLE_PRESETS = [
  'Bauhaus Geometry',
  'Art Deco',
  'Mid-century Modern',
  'Minimal Brutalism',
  'Japanese Wabi-Sabi',
  'Parametric Flow'
]

type ChatMessage = {
  role: 'user' | 'assistant'
  message: string
}

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

  const handleFloorplanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFloorplan(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setFloorplanPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleInspirationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
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
    <main className="min-h-screen bg-[var(--background)] px-6 py-8 text-[var(--foreground)] md:px-12 md:py-12">
      <div className="page-shell mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-8 px-8 py-10">
        <header className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <span className="pillar-heading text-[var(--foreground-subtle)]">Art Direction Studio</span>
            <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">Artspace Interior</h1>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="supporting-copy max-w-2xl">
              Residences composed through museum-grade artwork and architectural linework. Upload a floorplan,
              define your influences, and iterate the composition through dialogue.
            </p>
            <div className="flex items-center gap-4 text-[0.65rem] uppercase tracking-[0.4em] text-[var(--foreground-subtle)]">
              <span className="text-[var(--accent)]">01 Upload</span>
              <span className="h-px w-10 bg-[var(--border-strong)]" />
              <span>02 Curate</span>
              <span className="h-px w-10 bg-[var(--border-strong)]" />
              <span>03 Iterate</span>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[1.3fr_1fr]">
          <section className="section-card flex min-h-[520px] flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-strong)] pb-3">
              <div>
                <p className="pillar-heading">Step 03</p>
                <h2 className="text-2xl font-semibold tracking-tight">Conversational studio</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsListening(prev => !prev)}
                className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)] transition hover:border-[var(--highlight)] hover:text-[var(--accent)]"
              >
                {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                <span>{isListening ? 'Listening' : 'Tap to record'}</span>
              </button>
            </div>

            <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col gap-4">
                <div className="flex-1 overflow-hidden rounded-[16px] border border-[var(--border-strong)] bg-[var(--surface)]">
                  <ul className="divide-y divide-[var(--border-strong)]">
                    {chatHistory.map((message, idx) => (
                      <li key={`${message.role}-${idx}`} className="px-4 py-4">
                        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                          {message.role === 'assistant' ? 'Artspace' : 'You'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{message.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-end gap-3">
                  <textarea
                    value={chatPrompt}
                    onChange={e => setChatPrompt(e.target.value)}
                    placeholder="Describe adjustments—e.g. add a charcoal sofa with walnut legs."
                    className="h-28 flex-1 rounded-[16px] bg-[var(--surface)] px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSendPrompt}
                    className="geometric-button flex h-28 w-16 items-center justify-center rounded-[16px]"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                  <span className="rounded-full border border-[var(--border)] px-3 py-1">Medium sofa</span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1">Stone table</span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1">Diffuse lighting</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-[16px] border border-[var(--border-strong)] bg-[var(--surface)] p-4">
                <div className="relative h-52 w-full overflow-hidden rounded-[12px] bg-[var(--muted)]">
                  {result ? (
                    <NextImage
                      src={result}
                      alt="Generated concept"
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(min-width: 1024px) 300px, 70vw"
                    />
                  ) : floorplanPreview ? (
                    <NextImage
                      src={floorplanPreview}
                      alt="Floorplan reference"
                      fill
                      unoptimized
                      className="object-contain opacity-70"
                      sizes="(min-width: 1024px) 300px, 70vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                      Awaiting assets
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-3 border border-[var(--border-strong)]" />
                </div>

                <div className="space-y-3 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[var(--accent)]">Influences</span>
                    {selectedStyles.length === 0 && !artistInput ? (
                      <span className="opacity-60">Pending selections</span>
                    ) : (
                      <>
                        {selectedStyles.map(style => (
                          <span
                            key={style}
                            className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--accent)]"
                          >
                            {style}
                          </span>
                        ))}
                        {artistInput && (
                          <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--accent)]">
                            {artistInput}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {inspirationPreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span>Reference wall</span>
                      {inspirationPreviews.slice(0, 3).map((preview, idx) => (
                        <span
                          key={idx}
                          className="relative h-10 w-10 overflow-hidden rounded-[10px] border border-[var(--border)]"
                        >
                          <NextImage
                            src={preview}
                            alt={`Reference ${idx + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="40px"
                          />
                        </span>
                      ))}
                      {inspirationPreviews.length > 3 && (
                        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[var(--border-strong)]">
                          +{inspirationPreviews.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[0.55rem] uppercase tracking-[0.28em]">
                    <span>Stone + metal</span>
                    <span>Soft textiles</span>
                    <span>Ambient lighting</span>
                    <span>Custom millwork</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-strong)] pt-4">
              <div className="text-sm text-[var(--foreground-subtle)]">
                <p className="text-[0.7rem] uppercase tracking-[0.3em]">Concept status</p>
                <p className="text-xs text-[var(--foreground)]">{conceptStatus}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isProcessing}
                  className="geometric-button flex items-center gap-2 rounded-full px-6 py-3 text-[0.65rem] uppercase tracking-[0.3em]"
                >
                  {isProcessing ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                      Processing
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Render concept
                    </>
                  )}
                </button>

                {hasBrief && (
                  <button
                    onClick={resetAll}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)] transition hover:border-[var(--highlight)] hover:text-[var(--accent)]"
                  >
                    Reset briefing
                  </button>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <div className="section-card flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="pillar-heading">Step 01</p>
                  <h2 className="text-xl font-semibold tracking-tight">Floorplan canvas</h2>
                </div>
                {floorplan && (
                  <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--accent)]">Ready</span>
                )}
              </div>

              <p className="text-sm text-[var(--foreground-subtle)]">
                Drop a scaled plan or browse from your files. Accepted: PDF, PNG, JPG.
              </p>

              <label
                className="upload-zone group relative flex h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border border-dashed"
                onDragOver={e => {
                  e.preventDefault()
                  e.currentTarget.classList.add('active')
                }}
                onDragLeave={e => {
                  e.currentTarget.classList.remove('active')
                }}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('active')
                  const file = e.dataTransfer.files[0]
                  if (!file) return
                  setFloorplan(file)
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    setFloorplanPreview(reader.result as string)
                  }
                  reader.readAsDataURL(file)
                }}
              >
                <input type="file" className="hidden" accept="image/*" onChange={handleFloorplanUpload} />
                {floorplanPreview ? (
                  <NextImage
                    src={floorplanPreview}
                    alt="Floorplan preview"
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="(min-width: 1024px) 420px, 100vw"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-[var(--foreground-subtle)]">
                    <Upload className="h-6 w-6" />
                    <p className="text-sm">Drop a plan or browse</p>
                    <p className="text-[0.6rem] uppercase tracking-[0.35em]">PDF · PNG · JPG</p>
                  </div>
                )}
              </label>
            </div>

            <div className="section-card flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="pillar-heading">Step 02</p>
                  <h2 className="text-xl font-semibold tracking-tight">Curate the narrative</h2>
                </div>
                {(inspiration.length > 0 || selectedStyles.length > 0 || artistInput.trim().length > 0) && (
                  <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--accent)]">Enriched</span>
                )}
              </div>

              <p className="text-sm text-[var(--foreground-subtle)]">
                Layer references, artists, and material language to steer the concept.
              </p>

              <label
                className="upload-zone group relative flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border border-dashed"
                onDragOver={e => {
                  e.preventDefault()
                  e.currentTarget.classList.add('active')
                }}
                onDragLeave={e => {
                  e.currentTarget.classList.remove('active')
                }}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('active')
                  const files = Array.from(e.dataTransfer.files)
                  if (!files.length) return
                  setInspiration(prev => [...prev, ...files])
                  files.forEach(file => {
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setInspirationPreviews(prev => [...prev, reader.result as string])
                    }
                    reader.readAsDataURL(file)
                  })
                }}
              >
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleInspirationUpload}
                />
                {inspirationPreviews.length ? (
                  <div className="grid h-full w-full grid-cols-4 gap-2 p-3">
                    {inspirationPreviews.slice(0, 8).map((preview, idx) => (
                      <div key={idx} className="relative h-14 w-full">
                        <NextImage
                          src={preview}
                          alt={`Inspiration ${idx + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(min-width: 1024px) 120px, 25vw"
                        />
                      </div>
                    ))}
                    {inspirationPreviews.length > 8 && (
                      <div className="flex h-14 items-center justify-center rounded-[12px] border border-[var(--border-strong)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                        +{inspirationPreviews.length - 8}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-center text-[var(--foreground-subtle)]">
                    <Upload className="h-6 w-6" />
                    <p className="text-sm">Drop references</p>
                    <p className="text-[0.6rem] uppercase tracking-[0.35em]">Multiple files</p>
                  </div>
                )}
              </label>

              <div className="grid gap-4">
                <div className="flex flex-col gap-3">
                  <label className="pillar-heading">Artists · materials</label>
                  <input
                    type="text"
                    value={artistInput}
                    onChange={e => setArtistInput(e.target.value)}
                    placeholder="Eg. Zaha Hadid, Tadao Ando, Carrara marble"
                    className="rounded-[12px] bg-[var(--surface)] px-3 py-3 text-sm"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <p className="pillar-heading">Architecture modes</p>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_PRESETS.map(style => {
                      const active = selectedStyles.includes(style)
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => toggleStyle(style)}
                          className={`rounded-full px-3 py-2 text-[0.58rem] uppercase tracking-[0.28em] transition ${
                            active
                              ? 'bg-[var(--accent)] text-[#05060a]'
                              : 'border border-[var(--border)] text-[var(--foreground-subtle)] hover:border-[var(--highlight)] hover:text-[var(--accent)]'
                          }`}
                        >
                          {style}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}