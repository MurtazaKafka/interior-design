'use client'

import { useState } from 'react'
import { Upload, Image, Home, Sparkles } from 'lucide-react'

export default function HomePage() {
  const [floorplan, setFloorplan] = useState<File | null>(null)
  const [inspiration, setInspiration] = useState<File[]>([])
  const [floorplanPreview, setFloorplanPreview] = useState<string>('')
  const [inspirationPreviews, setInspirationPreviews] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<string>('')

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
    setInspiration(prev => [...prev, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setInspirationPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleGenerate = async () => {
    if (!floorplan || inspiration.length === 0) return
    
    setIsProcessing(true)
    // Simulate processing - in real app, this would call your AI backend
    setTimeout(() => {
      setResult('/api/placeholder-result.jpg')
      setIsProcessing(false)
    }, 3000)
  }

  const resetAll = () => {
    setFloorplan(null)
    setInspiration([])
    setFloorplanPreview('')
    setInspirationPreviews([])
    setResult('')
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-16">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold tracking-tighter">ARTSPACE</h1>
            <div className="w-12 h-12 bg-black"></div>
          </div>
          <p className="text-gray-600 text-sm uppercase tracking-wider">
            Transform your space with artistic inspiration
          </p>
        </header>

        {!result ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Floorplan Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-5 h-5" />
                <h2 className="text-sm uppercase tracking-wider font-semibold">Floorplan</h2>
              </div>
              
              <label 
                className="upload-zone block w-full h-64 cursor-pointer flex items-center justify-center"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('active')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('active')
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('active')
                  const file = e.dataTransfer.files[0]
                  if (file) {
                    setFloorplan(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setFloorplanPreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFloorplanUpload}
                />
                {floorplanPreview ? (
                  <img 
                    src={floorplanPreview} 
                    alt="Floorplan preview" 
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Drop your floorplan here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                  </div>
                )}
              </label>
            </div>

            {/* Inspiration Upload */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Image className="w-5 h-5" />
                <h2 className="text-sm uppercase tracking-wider font-semibold">Artistic Inspiration</h2>
              </div>
              
              <label 
                className="upload-zone block w-full h-64 cursor-pointer flex items-center justify-center"
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.add('active')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('active')
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('active')
                  const files = Array.from(e.dataTransfer.files)
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
                {inspirationPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 p-4 w-full h-full overflow-auto">
                    {inspirationPreviews.map((preview, idx) => (
                      <img 
                        key={idx}
                        src={preview} 
                        alt={`Inspiration ${idx + 1}`} 
                        className="w-full h-28 object-cover border-2 border-gray-200"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Drop artwork or architecture images</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse (multiple)</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="geometric-border p-8">
              <h2 className="text-sm uppercase tracking-wider font-semibold mb-4">
                Your Designed Space
              </h2>
              <div className="bg-gray-100 h-[600px] flex items-center justify-center">
                <p className="text-gray-400">Generated design will appear here</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-12 flex items-center justify-center gap-4">
          {!result ? (
            <>
              <button
                onClick={handleGenerate}
                disabled={!floorplan || inspiration.length === 0 || isProcessing}
                className="geometric-button px-8 py-3 text-sm uppercase tracking-wider font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Processing
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Design
                  </>
                )}
              </button>
              
              {(floorplan || inspiration.length > 0) && (
                <button
                  onClick={resetAll}
                  className="px-8 py-3 text-sm uppercase tracking-wider text-gray-600 hover:text-black transition-colors"
                >
                  Clear All
                </button>
              )}
            </>
          ) : (
            <button
              onClick={resetAll}
              className="geometric-button px-8 py-3 text-sm uppercase tracking-wider font-semibold"
            >
              Start New Design
            </button>
          )}
        </div>
      </div>
    </div>
  )
}