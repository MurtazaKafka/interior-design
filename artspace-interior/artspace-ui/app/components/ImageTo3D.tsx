'use client'

import { useState } from 'react'
import NextImage from 'next/image'
import { Upload, Search, Loader2, Image as ImageIcon } from 'lucide-react'

type UnsplashImage = {
  id: string
  urls: {
    small: string
    regular: string
  }
  alt_description: string | null
  description: string | null
}

type UnsplashApiResponse = {
  results?: Array<{
    id: string
    urls?: {
      small?: string
      regular?: string
    }
    alt_description?: string | null
    description?: string | null
  }>
}

interface ImageTo3DProps {
  onGenerate: (imageUrl: string, description: string) => void
  isGenerating?: boolean
}

export const ImageTo3D = ({ onGenerate, isGenerating = false }: ImageTo3DProps) => {
  const [imageUrl, setImageUrl] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [unsplashResults, setUnsplashResults] = useState<UnsplashImage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'search'>('upload')

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setUploadedImage(base64)
        setImageUrl(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  // Search Unsplash for images
  const searchUnsplash = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      // Using Unsplash API (you'll need to add your access key)
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=9`,
        {
          headers: {
            Authorization: 'Client-ID YOUR_UNSPLASH_ACCESS_KEY' // Replace with actual key
          }
        }
      )
      
      if (response.ok) {
        const data = (await response.json()) as UnsplashApiResponse
        const mappedResults: UnsplashImage[] = (data.results ?? [])
          .map((item) => {
            if (!item?.id) return null
            return {
              id: item.id,
              urls: {
                small: item.urls?.small ?? '',
                regular: item.urls?.regular ?? '',
              },
              alt_description: item.alt_description ?? null,
              description: item.description ?? null,
            }
          })
          .filter((item): item is UnsplashImage => item !== null)
        setUnsplashResults(mappedResults)
      }
    } catch (error) {
      console.error('Error searching Unsplash:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleGenerate = () => {
    const finalUrl = uploadedImage || imageUrl
    if (finalUrl && description) {
      onGenerate(finalUrl, description)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Convert 2D Image to 3D Model</h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'upload'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Upload Image
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'url'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <ImageIcon className="w-4 h-4 inline mr-2" />
          Image URL
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 px-4 rounded-md transition-all ${
            activeTab === 'search'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Search className="w-4 h-4 inline mr-2" />
          Search Web
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload"
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</p>
            </label>
          </div>
          {uploadedImage && (
            <div className="mt-4">
              <NextImage
                src={uploadedImage}
                alt="Uploaded preview"
                width={800}
                height={384}
                className="w-full h-48 object-cover rounded-lg"
                unoptimized
              />
            </div>
          )}
        </div>
      )}

      {/* URL Tab */}
      {activeTab === 'url' && (
        <div className="space-y-4">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Enter image URL..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {imageUrl && !uploadedImage && (
            <div className="mt-4">
              <NextImage
                src={imageUrl}
                alt="Remote preview"
                width={800}
                height={384}
                className="w-full h-48 object-cover rounded-lg"
                unoptimized
              />
            </div>
          )}
        </div>
      )}

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUnsplash()}
              placeholder="Search for furniture images..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={searchUnsplash}
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </div>

          {/* Search Results Grid */}
          {unsplashResults.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-6">
              {unsplashResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => {
                    setImageUrl(result.urls.regular)
                    setDescription(result.alt_description || result.description || '')
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <NextImage
                    src={result.urls.small}
                    alt={result.alt_description ?? 'Search result'}
                    width={400}
                    height={256}
                    className="w-full h-32 object-cover rounded-lg"
                    unoptimized
                  />
                  <p className="text-xs text-gray-600 mt-1 truncate">
                    {result.alt_description || 'No description'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Description Input */}
      {(imageUrl || uploadedImage) && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe the furniture (helps with 3D generation)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="E.g., Modern king-size bed with upholstered headboard, wooden nightstands with gold accents..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!description || isGenerating}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating 3D Model...
              </span>
            ) : (
              'Generate 3D Model from Image'
            )}
          </button>
        </div>
      )}
    </div>
  )
}