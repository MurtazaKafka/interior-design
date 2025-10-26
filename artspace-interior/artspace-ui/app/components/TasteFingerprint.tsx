'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import { SectionCard } from './SectionCard'

export interface Artwork {
  id: string
  title: string
  artist: string
  museum: string
  image_url: string
}

interface ChoicePair {
  a: Artwork
  b: Artwork
}

interface TasteState {
  vector: number[] | null
  comparisons: number
  loading: boolean
  error: string | null
  history: Array<{ win: string; lose: string }>
}

type TasteFingerprintProps = {
  onComplete: (tasteVector: number[]) => void
  userId: string
  artworks: Artwork[]
}

const TARGET_COMPARISONS = 12

function pickRandomPairs(artworks: Artwork[]): ChoicePair[] {
  const shuffled = [...artworks].sort(() => Math.random() - 0.5)
  const pairs: ChoicePair[] = []
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push({ a: shuffled[i], b: shuffled[i + 1] })
  }
  return pairs
}

function isRecentDuplicate(
  history: Array<{ win: string; lose: string }>,
  a: Artwork,
  b: Artwork
): boolean {
  const last = history[history.length - 1]
  if (!last) return false
  const pairIds = [a.id, b.id]
  const lastIds = [last.win, last.lose]
  return (
    (pairIds[0] === lastIds[0] && pairIds[1] === lastIds[1]) ||
    (pairIds[0] === lastIds[1] && pairIds[1] === lastIds[0])
  )
}

export const TasteFingerprint = ({ onComplete, userId, artworks }: TasteFingerprintProps) => {
  const [pairs, setPairs] = useState<ChoicePair[]>([])
  const [taste, setTaste] = useState<TasteState>({
    vector: null,
    comparisons: 0,
    loading: false,
    error: null,
    history: [],
  })

  const currentPair = useMemo(
    () => pairs[taste.comparisons] ?? null,
    [pairs, taste.comparisons]
  )
  const progress = useMemo(
    () => taste.comparisons / TARGET_COMPARISONS,
    [taste.comparisons]
  )
  const completed = taste.comparisons >= TARGET_COMPARISONS

  useEffect(() => {
    if (artworks.length >= 2) {
      setPairs(pickRandomPairs(artworks))
    }
  }, [artworks])

  const replenishPairs = useCallback(() => {
    setPairs((prevPairs) => {
      const next = pickRandomPairs(artworks)
      return [...prevPairs, ...next]
    })
  }, [artworks])

  const handleChoice = useCallback(
    async (win: Artwork, lose: Artwork) => {
      if (taste.loading || completed) return

      setTaste((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const response = await fetch('http://localhost:8000/taste/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            win_id: win.id,
            lose_id: lose.id,
          }),
        })

        if (!response.ok) {
          throw new Error(`Taste update failed: ${response.status}`)
        }

        const data = await response.json()

        setTaste((prev) => {
          const nextComparisons = prev.comparisons + 1
          const updatedHistory = [...prev.history, { win: win.id, lose: lose.id }]
          
          if (nextComparisons >= TARGET_COMPARISONS && data.vector) {
            // Call onComplete when we reach the target
            setTimeout(() => onComplete(data.vector), 300)
          }

          return {
            vector: data.vector,
            comparisons: nextComparisons,
            loading: false,
            error: null,
            history: updatedHistory,
          }
        })
      } catch (err) {
        console.error(err)
        setTaste((prev) => ({
          ...prev,
          loading: false,
          error: 'Could not record your choice. Try again.',
        }))
      }
    },
    [completed, taste.loading, userId, onComplete]
  )

  useEffect(() => {
    if (!currentPair && !completed && artworks.length >= 2) {
      replenishPairs()
    }
  }, [currentPair, completed, artworks.length, replenishPairs])

  const pairForRender = useMemo(() => {
    if (!currentPair) return null
    if (isRecentDuplicate(taste.history, currentPair.a, currentPair.b)) {
      replenishPairs()
      return null
    }
    return currentPair
  }, [currentPair, replenishPairs, taste.history])

  return (
    <div className="flex h-full w-full flex-col">
      <SectionCard className="flex flex-1 flex-col gap-8">
        <div className="text-center">
          <h2 className="mb-3 text-3xl font-bold">Discover Your Design Taste</h2>
          <p className="text-lg text-[var(--foreground-subtle)]">
            Pick the artwork you vibe with the most. We&apos;ll build your taste fingerprint in just {TARGET_COMPARISONS} quick choices.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-base font-semibold text-[var(--accent)]">
            {taste.comparisons}/{TARGET_COMPARISONS}
          </div>
          <div className="flex-1 h-3 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--highlight)] transition-all duration-300"
              style={{ width: `${Math.min(progress, 1) * 100}%` }}
            />
          </div>
        </div>

        {taste.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
            {taste.error}
          </div>
        )}

        {pairForRender ? (
          <div className="flex-1 grid grid-cols-2 gap-8">
            <ArtworkCard
              artwork={pairForRender.a}
              disabled={taste.loading}
              onSelect={() => handleChoice(pairForRender.a, pairForRender.b)}
            />
            <ArtworkCard
              artwork={pairForRender.b}
              disabled={taste.loading}
              onSelect={() => handleChoice(pairForRender.b, pairForRender.a)}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-lg text-[var(--foreground-subtle)]">
            Preparing artworks…
          </div>
        )}
      </SectionCard>
    </div>
  )
}

interface ArtworkCardProps {
  artwork: Artwork
  onSelect: () => void
  disabled?: boolean
}

function ArtworkCard({ artwork, onSelect, disabled }: ArtworkCardProps) {
  return (
    <button
      className="group relative overflow-hidden rounded-xl border-2 border-[var(--border)] bg-white p-2 transition-all hover:border-[var(--accent)] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onSelect}
      disabled={disabled}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg">
        <div className="absolute inset-0 bg-black/15 opacity-0 transition-opacity group-hover:opacity-100" />
        <NextImage
          src={artwork.image_url}
          alt={`${artwork.title} by ${artwork.artist}`}
          fill
          sizes="(max-width: 768px) 100vw, 45vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4 text-left">
        <h3 className="mb-1 text-xl font-semibold line-clamp-2">{artwork.title}</h3>
        <p className="text-sm text-[var(--foreground-subtle)] mb-1">{artwork.artist}</p>
        <span className="text-xs text-[var(--foreground-muted)]">{artwork.museum}</span>
      </div>
    </button>
  )
}
