'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import NextImage from 'next/image'

type StyleOption = {
  id: string
  image: string
  title: string
  description: string
}

type StyleQuizProps = {
  onComplete: (selectedStyles: string[]) => void
}

const styleOptions: StyleOption[][] = [
  [
    {
      id: 'modern-minimal',
      image: '/styles/modern-minimal.jpg',
      title: 'Modern Minimal',
      description: 'Clean lines, neutral colors, and uncluttered spaces'
    },
    {
      id: 'scandinavian',
      image: '/styles/scandinavian.jpg',
      title: 'Scandinavian',
      description: 'Light, airy spaces with natural materials'
    },
    {
      id: 'industrial',
      image: '/styles/industrial.jpg',
      title: 'Industrial',
      description: 'Raw materials, exposed elements, and urban edge'
    }
  ],
  [
    {
      id: 'mid-century',
      image: '/styles/mid-century.jpg',
      title: 'Mid-Century Modern',
      description: 'Retro-inspired with organic shapes and bold colors'
    },
    {
      id: 'contemporary',
      image: '/styles/contemporary.jpg',
      title: 'Contemporary',
      description: 'Current trends with sophisticated comfort'
    },
    {
      id: 'japanese',
      image: '/styles/japanese.jpg',
      title: 'Japanese Zen',
      description: 'Minimalist with natural harmony and balance'
    }
  ],
  [
    {
      id: 'bohemian',
      image: '/styles/bohemian.jpg',
      title: 'Bohemian',
      description: 'Eclectic mix of colors, patterns, and textures'
    },
    {
      id: 'coastal',
      image: '/styles/coastal.jpg',
      title: 'Coastal',
      description: 'Beach-inspired with light colors and natural textures'
    },
    {
      id: 'art-deco',
      image: '/styles/art-deco.jpg',
      title: 'Art Deco',
      description: 'Glamorous with geometric patterns and bold details'
    }
  ]
]

export const StyleQuiz = ({ onComplete }: StyleQuizProps) => {
  const [currentSet, setCurrentSet] = useState(0)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [isTransitioning, setIsTransitioning] = useState(false)

  const handleStyleSelect = (styleId: string) => {
    const newSelectedStyles = [...selectedStyles, styleId]
    setSelectedStyles(newSelectedStyles)

    if (currentSet < styleOptions.length - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentSet(prev => prev + 1)
        setIsTransitioning(false)
      }, 300)
    } else {
      onComplete(newSelectedStyles)
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="shadow-museum mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 rounded-lg bg-[var(--surface)] p-10">
        <div className="border-b border-[var(--border)] pb-6 text-center">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[var(--accent)]">Act II</p>
          <h2 className="serif mb-4 text-4xl leading-tight tracking-[-0.01em]">Direct Your Vision</h2>
          <p className="text-lg leading-relaxed text-[var(--foreground-subtle)]">
            Select visual references that orchestrate light, surface, and composition ({currentSet + 1} of {styleOptions.length})
          </p>
        </div>

        <div className={`grid flex-1 grid-cols-3 gap-6 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {styleOptions[currentSet].map(style => (
            <button
              key={style.id}
              onClick={() => handleStyleSelect(style.id)}
              className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-all hover:border-[var(--accent)] hover:shadow-museum"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <NextImage
                  src={style.image}
                  alt={style.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 400px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5 text-left">
                <h3 className="serif mb-2 text-xl leading-tight">{style.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--foreground-subtle)]">{style.description}</p>
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-[var(--surface)]/90 p-2 text-[var(--accent)] opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100">
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          {styleOptions.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === currentSet ? 'w-12 bg-[var(--accent)]' : 'w-8 bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
