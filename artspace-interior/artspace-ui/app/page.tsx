'use client'

import NextImage from 'next/image'
import { useState, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Upload
} from 'lucide-react'
import {
  uploadImages,
  startTraining,
  getTrainingStatus,
  type TrainingStatus
} from '@/lib/nerf-api'
import MeshPreview from './components/MeshPreview'
import { getMeshDownloadUrl } from '@/lib/nerf-api'

// Component to display rendered frames from 3D reconstruction
function RenderFramesViewer({ sessionId }: { sessionId: string }) {
  const [frames, setFrames] = useState<string[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  
  const apiUrl = process.env.NEXT_PUBLIC_NERF_API_URL
  
  useEffect(() => {
    async function fetchFrames() {
      try {
        const response = await fetch(`${apiUrl}/api/renders/${sessionId}`)
        const data = await response.json()
        if (data.frames && data.frames.length > 0) {
          setFrames(data.frames)
        }
      } catch (error) {
        console.error('Error fetching renders:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchFrames()
  }, [sessionId, apiUrl])
  
  useEffect(() => {
    if (playing && frames.length > 0) {
      const interval = setInterval(() => {
        setCurrentFrame((prev) => (prev + 1) % frames.length)
      }, 100) // 10 FPS
      return () => clearInterval(interval)
    }
  }, [playing, frames.length])
  
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--foreground-subtle)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        Loading renders...
      </div>
    )
  }
  
  if (frames.length === 0) {
    return (
      <p className="text-sm text-[var(--foreground-subtle)]">
        No preview frames available yet
      </p>
    )
  }
  
  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--surface)]">
        <img
          src={`${apiUrl}/api/render/${sessionId}/${frames[currentFrame]}`}
          alt={`Frame ${currentFrame + 1}`}
          className="h-full w-full object-contain"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying(!playing)}
          className="rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-xs uppercase tracking-wider transition-colors hover:bg-[var(--surface)]"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={frames.length - 1}
            value={currentFrame}
            onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        
        <span className="text-xs text-[var(--foreground-subtle)]">
          {currentFrame + 1} / {frames.length}
        </span>
      </div>
    </div>
  )
}

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
  const [floorplanPreview, setFloorplanPreview] = useState<string>('')
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
  const [result, setResult] = useState<string>('')

  // NeRF integration state
  const [nerfSessionId, setNerfSessionId] = useState<string>('')
  const [nerfJobId, setNerfJobId] = useState<string>('')
  const [nerfStatus, setNerfStatus] = useState<TrainingStatus | null>(null)
  const [nerfError, setNerfError] = useState<string>('')
  const [isUploadingToNerf, setIsUploadingToNerf] = useState(false)

  // Poll for training status
  useEffect(() => {
    if (!nerfJobId) return

    const pollInterval = setInterval(async () => {
      try {
        const status = await getTrainingStatus(nerfJobId)
        setNerfStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval)
          setIsProcessing(false)

          if (status.status === 'completed') {
            setChatHistory(prev => [
              ...prev,
              {
                role: 'assistant',
                message: 'NeRF training completed! Your 3D scene is ready.'
              }
            ])
          } else if (status.status === 'failed') {
            setNerfError(status.error || 'Training failed')
            setChatHistory(prev => [
              ...prev,
              {
                role: 'assistant',
                message: `Training failed: ${status.error || 'Unknown error'}`
              }
            ])
          }
        }
      } catch (error) {
        console.error('Error polling training status:', error)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [nerfJobId])

  const handleFloorplanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFloorplan(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFloorplanPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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

  const handleGenerate = async () => {
    console.log('🎨 handleGenerate called')
    console.log('Floorplan:', floorplan)
    console.log('Inspiration count:', inspiration.length)
    console.log('Selected styles:', selectedStyles)
    console.log('Artist input:', artistInput)
    
    if (!floorplan) {
      console.warn('⚠️ No floorplan uploaded')
      return
    }

    setIsProcessing(true)
    setNerfError('')
    console.log('✅ Processing started')

    try {
      // If we have inspiration images (room photos), use NeRF
      if (inspiration.length >= 10) {
        console.log('🚀 Starting NeRF workflow with', inspiration.length, 'images')
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            message: `Uploading ${inspiration.length} images to NeRF for 3D reconstruction...`
          }
        ])

        setIsUploadingToNerf(true)

        // Upload images to NeRF
        console.log('📤 Uploading images to:', process.env.NEXT_PUBLIC_NERF_API_URL || 'http://localhost:5000')
        const uploadResponse = await uploadImages(inspiration)
        console.log('✅ Upload response:', uploadResponse)
        setNerfSessionId(uploadResponse.session_id)

        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            message: `Successfully uploaded ${uploadResponse.uploaded_count} images. Starting NeRF training...`
          }
        ])

        // Start training
        console.log('🎓 Starting training for session:', uploadResponse.session_id)
        const trainingResponse = await startTraining(uploadResponse.session_id)
        console.log('✅ Training started:', trainingResponse)
        setNerfJobId(trainingResponse.job_id)
        setIsUploadingToNerf(false)

        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            message: 'NeRF training started. This will take several hours. You can monitor progress below.'
          }
        ])
      } else if (inspiration.length > 0 && inspiration.length < 10) {
        // Not enough images for NeRF
        console.log('⚠️ Not enough images for Instant-NGP:', inspiration.length, '(need 10+)')
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            message: `You need at least 10 room photos for Instant-NGP 3D reconstruction. You have ${inspiration.length}. For now, generating a preview concept...`
          }
        ])

        // Use mock generation for preview
        setTimeout(() => {
          const influenceSummary =
            selectedStyles.length > 0
              ? selectedStyles.join(' · ')
              : artistInput || 'Custom curation'
          setResult(floorplanPreview || '/window.svg')
          setChatHistory(prev => [
            ...prev,
            {
              role: 'assistant',
              message: `Concept locked. Rendering with ${influenceSummary.toLowerCase()}.`
            }
          ])
          setIsProcessing(false)
        }, 1600)
      } else {
        // No images, use style-based generation (mock for now)
        console.log('🎨 Style-based generation (no images)')
        console.log('📊 Current state:', {
          inspirationCount: inspiration.length,
          selectedStyles,
          artistInput,
          hasFloorplan: !!floorplan
        })
        
        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            message: '⚠️ Note: This is a preview mode. For full 3D NeRF reconstruction, please upload at least 10 room photos in Step 02.'
          }
        ])
        
        setTimeout(() => {
          const influenceSummary =
            selectedStyles.length > 0
              ? selectedStyles.join(' · ')
              : artistInput || 'Custom curation'
          setResult(floorplanPreview || '/window.svg')
          console.log('✅ Result set to:', floorplanPreview || '/window.svg')
          setChatHistory(prev => [
            ...prev,
            {
              role: 'assistant',
              message: `Concept locked. Rendering with ${influenceSummary.toLowerCase()}. (Preview mode - upload 10+ photos for 3D reconstruction)`
            }
          ])
          setIsProcessing(false)
        }, 1600)
      }
    } catch (error) {
      console.error('❌ Error in handleGenerate:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setNerfError(errorMessage)
      setChatHistory(prev => [
        ...prev,
        {
          role: 'assistant',
          message: `Error: ${errorMessage}`
        }
      ])
      setIsProcessing(false)
      setIsUploadingToNerf(false)
    }
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
    // Reset NeRF state
    setNerfSessionId('')
    setNerfJobId('')
    setNerfStatus(null)
    setNerfError('')
    setIsUploadingToNerf(false)
  }

  const canGenerate =
    !!floorplan &&
    (inspiration.length > 0 || selectedStyles.length > 0 || artistInput.length > 0)

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="page-shell mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12 md:px-12 md:py-16">
        <header className="space-y-8">
          <div className="space-y-6">
            <span className="pillar-heading text-[var(--foreground-subtle)]">Art Direction Studio</span>
            <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">Artspace Interior</h1>
            <p className="supporting-copy max-w-2xl">
              Residences composed through museum-grade artwork and architectural linework. Upload your
              floorplan, define your influences, and iterate the composition through dialogue.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[0.65rem] uppercase tracking-[0.4em] text-[var(--foreground-subtle)]">
            <span className="text-[var(--accent)]">01 Upload</span>
            <span className="h-px w-12 bg-[var(--border-strong)]" />
            <span>02 Curate</span>
            <span className="h-px w-12 bg-[var(--border-strong)]" />
            <span>03 Render</span>
          </div>
        </header>

        {/* Instant-NGP Info Banner */}
        {inspiration.length > 0 && inspiration.length < 10 && (
          <div className="rounded-[16px] border border-yellow-500/30 bg-yellow-500/10 px-6 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-yellow-300">
                  Need {10 - inspiration.length} more {10 - inspiration.length === 1 ? 'photo' : 'photos'} for Instant-NGP 3D Reconstruction
                </p>
                <p className="text-sm text-yellow-200/80">
                  You have {inspiration.length} room {inspiration.length === 1 ? 'photo' : 'photos'}. Upload at least 10 photos from different angles to enable full 3D scene reconstruction with Instant-NGP (fast NeRF training in 5-10 minutes).
                </p>
              </div>
            </div>
          </div>
        )}

        {inspiration.length >= 10 && (
          <div className="rounded-[16px] border border-green-500/30 bg-green-500/10 px-6 py-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-green-300">
                  Ready for Instant-NGP 3D Reconstruction!
                </p>
                <p className="text-sm text-green-200/80">
                  {inspiration.length} photos uploaded. Click "Render Concept" to start training with Instant-NGP (NVIDIA's fast NeRF). This will create a full 3D reconstruction of your space. Training takes 5-10 minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-12 lg:grid-cols-[1.45fr_1fr]">
          <section className="flex flex-col gap-10">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="section-card h-full">
                <div className="mb-6 space-y-2">
                  <p className="pillar-heading">Step 01</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Floorplan canvas</h2>
                </div>

                <label
                  className="upload-zone group relative flex h-44 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[16px] border border-dashed"
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
                      sizes="(min-width: 1024px) 520px, 100vw"
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

              <div className="section-card h-full">
                <div className="mb-6 space-y-2">
                  <p className="pillar-heading">Step 02</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Curate the narrative</h2>
                </div>

                <p className="supporting-copy mb-6">
                  Reference artists, movements, and materials you gravitate toward. Upload imagery or select
                  architectural attitudes to anchor the palette.
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
                        <div key={idx} className="relative h-16 w-full">
                          <NextImage
                            src={preview}
                            alt={`Inspiration ${idx + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(min-width: 1024px) 140px, 25vw"
                          />
                        </div>
                      ))}
                      {inspirationPreviews.length > 8 && (
                        <div className="flex h-16 items-center justify-center rounded-[12px] border border-[var(--border-strong)] text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
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

                <div className="mt-8 grid gap-6">
                  <div className="flex flex-col gap-3">
                    <label className="pillar-heading">Artists · materials</label>
                    <input
                      type="text"
                      value={artistInput}
                      onChange={e => setArtistInput(e.target.value)}
                      placeholder="Eg. Zaha Hadid, Tadao Ando, Carrara marble"
                      className="rounded-[12px] bg-[var(--surface)] px-4 py-3 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <p className="pillar-heading">Architecture modes</p>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_PRESETS.map(style => {
                        const active = selectedStyles.includes(style)
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => toggleStyle(style)}
                            className={`rounded-full px-4 py-2 text-[0.6rem] uppercase tracking-[0.3em] transition ${
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

            <div className="section-card">
              <div className="mb-6 space-y-2">
                <p className="pillar-heading">Step 03</p>
                <h2 className="text-2xl font-semibold tracking-tight">Iterate by dialogue</h2>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">Voice channel</p>
                  <button
                    type="button"
                    onClick={() => setIsListening(prev => !prev)}
                    className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)] transition hover:text-[var(--accent)]"
                  >
                    {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {isListening ? 'Listening' : 'Tap to record'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="max-h-48 overflow-hidden rounded-[14px] border border-[var(--border-strong)] bg-[var(--surface)]">
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
                      className="h-24 flex-1 rounded-[14px] bg-[var(--surface)] px-4 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSendPrompt}
                      className="geometric-button flex h-24 w-16 items-center justify-center rounded-[14px]"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                  <span className="rounded-full border border-[var(--border)] px-3 py-1">Medium sofa</span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1">Stone table</span>
                  <span className="rounded-full border border-[var(--border)] px-3 py-1">Diffuse lighting</span>
                </div>
              </div>
            </div>

            {/* Instant-NGP Training Status */}
            {(nerfSessionId || nerfStatus || nerfError) && (
              <div className="section-card">
                <div className="mb-4 space-y-2">
                  <p className="pillar-heading">Instant-NGP 3D Reconstruction</p>
                  <h3 className="text-xl font-semibold tracking-tight">Training Status</h3>
                </div>

                <div className="space-y-4">
                  {nerfError && (
                    <div className="rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3">
                      <p className="text-sm text-red-400">{nerfError}</p>
                    </div>
                  )}

                  {nerfSessionId && (
                    <div className="space-y-2">
                      <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                        Session ID
                      </p>
                      <p className="font-mono text-xs text-[var(--accent)]">{nerfSessionId}</p>
                    </div>
                  )}

                  {nerfStatus && (
                    <>
                      <div className="space-y-2">
                        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                          Status
                        </p>
                        <div className="flex items-center gap-2">
                          {nerfStatus.status === 'running' && (
                            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                          )}
                          {nerfStatus.status === 'completed' && (
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          )}
                          {nerfStatus.status === 'failed' && (
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                          )}
                          <span className="text-sm capitalize text-[var(--foreground)]">
                            {nerfStatus.status}
                          </span>
                        </div>
                      </div>

                      {nerfStatus.progress > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                              Progress
                            </p>
                            <p className="text-sm text-[var(--accent)]">{nerfStatus.progress}%</p>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
                            <div
                              className="h-full bg-[var(--highlight)] transition-all duration-500"
                              style={{ width: `${nerfStatus.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {nerfStatus.start_time && (
                        <div className="space-y-1">
                          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                            Started
                          </p>
                          <p className="text-xs text-[var(--foreground)]">
                            {new Date(nerfStatus.start_time * 1000).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* Show rendered frames when completed */}
                      {nerfStatus.status === 'completed' && nerfSessionId && (
                        <div className="space-y-3 pt-4 border-t border-[var(--border)]">
                          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                            3D Reconstruction Preview
                          </p>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <RenderFramesViewer sessionId={nerfSessionId} />
                            </div>
                            <div>
                              <MeshPreview sessionId={nerfSessionId} />
                              <div className="mt-3 flex items-center gap-3">
                                <a
                                  href={getMeshDownloadUrl(nerfSessionId)}
                                  className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white hover:opacity-90"
                                >
                                  📥 Download 3D Model (.obj)
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {isUploadingToNerf && (
                    <div className="flex items-center gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                      <span className="text-sm text-[var(--foreground-subtle)]">
                        Uploading images to NeRF server...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => {
                  console.log('🖱️ Button clicked!', { canGenerate, isProcessing })
                  handleGenerate()
                }}
                disabled={!canGenerate || isProcessing}
                className="geometric-button flex items-center gap-3 rounded-full px-7 py-3 text-[0.65rem] uppercase tracking-[0.35em]"
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

              {(floorplan || inspiration.length > 0 || selectedStyles.length > 0 || artistInput) && (
                <button
                  onClick={resetAll}
                  className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)] transition hover:text-[var(--accent)]"
                >
                  Reset briefing
                </button>
              )}
            </div>
          </section>

          <aside className="sticky top-20 flex h-fit flex-col gap-6 rounded-[24px] border border-[var(--border-strong)] bg-[var(--surface-soft)] px-6 py-8">
            <div className="space-y-2">
              <p className="pillar-heading">Step 04</p>
              <span className="text-xl font-semibold tracking-tight">Concept board</span>
            </div>
            <div className="relative h-[420px] w-full overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)]">
              {result ? (
                <NextImage
                  src={result}
                  alt="Generated concept"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 1024px) 320px, 80vw"
                />
              ) : floorplanPreview ? (
                <NextImage
                  src={floorplanPreview}
                  alt="Floorplan reference"
                  fill
                  unoptimized
                  className="object-contain opacity-70"
                  sizes="(min-width: 1024px) 320px, 80vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
                  Awaiting assets
                </div>
              )}
              <div className="pointer-events-none absolute inset-4 border border-[var(--border-strong)]" />
            </div>

            <div className="space-y-5 text-sm text-[var(--foreground-subtle)]">
              <div className="space-y-2">
                <p className="pillar-heading">Influences</p>
                <div className="flex flex-wrap gap-2">
                  {selectedStyles.length === 0 && !artistInput ? (
                    <span className="text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)] opacity-60">
                      Pending selections
                    </span>
                  ) : (
                    <>
                      {selectedStyles.map(style => (
                        <span
                          key={style}
                          className="rounded-full border border-[var(--border)] px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--accent)]"
                        >
                          {style}
                        </span>
                      ))}
                      {artistInput && (
                        <span className="rounded-full border border-[var(--border)] px-3 py-1 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--accent)]">
                          {artistInput}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="pillar-heading">Materials queue</p>
                <div className="grid grid-cols-2 gap-2 text-[0.6rem] uppercase tracking-[0.3em]">
                  <span>Stone + metal</span>
                  <span>Soft textiles</span>
                  <span>Ambient lighting</span>
                  <span>Custom millwork</span>
                </div>
              </div>

              {inspirationPreviews.length > 0 && (
                <div className="space-y-2">
                  <p className="pillar-heading">Reference wall</p>
                  <div className="grid grid-cols-3 gap-2">
                    {inspirationPreviews.slice(0, 3).map((preview, idx) => (
                      <div key={idx} className="relative h-16 w-full overflow-hidden rounded-[12px] border border-[var(--border)]">
                        <NextImage
                          src={preview}
                          alt={`Reference ${idx + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(min-width: 1024px) 110px, 33vw"
                        />
                      </div>
                    ))}
                    {inspirationPreviews.length > 3 && (
                      <div className="flex h-16 items-center justify-center rounded-[12px] border border-[var(--border-strong)] text-[0.6rem] uppercase tracking-[0.3em]">
                        +{inspirationPreviews.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {result ? (
              <button
                onClick={() => setResult('')}
                className="geometric-button rounded-full px-5 py-2 text-[0.6rem] uppercase tracking-[0.3em]"
              >
                Iterate again
              </button>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  )
}