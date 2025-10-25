import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import NextImage from 'next/image'
import { SectionCard } from './SectionCard'

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
      <SectionCard className="flex flex-1 flex-col gap-8">
        <div className="text-center">
          <h2 className="mb-3 text-3xl font-bold">Choose Your Style</h2>
          <p className="text-lg text-[var(--foreground-subtle)]">
            Select the style that resonates with your vision ({currentSet + 1} of {styleOptions.length})
          </p>
        </div>

        <div className={`flex-1 grid grid-cols-3 gap-8 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {styleOptions[currentSet].map(style => (
            <button
              key={style.id}
              onClick={() => handleStyleSelect(style.id)}
              className="group relative overflow-hidden rounded-xl border-2 border-[var(--border)] bg-white p-2 transition-all hover:border-[var(--accent)] hover:shadow-xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                <div className="absolute inset-0 bg-black/15 opacity-0 transition-opacity group-hover:opacity-100" />
                <NextImage
                  src={style.image}
                  alt={style.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4 text-left">
                <h3 className="mb-1 text-xl font-semibold">{style.title}</h3>
                <p className="text-sm text-[var(--foreground-subtle)]">{style.description}</p>
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-white p-2 text-[var(--accent)] opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                <ChevronRight className="h-5 w-5" />
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          {styleOptions.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-10 rounded-full transition-colors ${
                index === currentSet ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
