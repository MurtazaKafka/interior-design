import NextImage from 'next/image'

export type ConceptPreviewCardProps = {
  result: string
  fallback: string
  floorplanPreview?: string
  influences: string[]
  artistInput: string
  inspirationPreviews: string[]
}

export const ConceptPreviewCard = ({
  result,
  fallback,
  floorplanPreview,
  influences,
  artistInput,
  inspirationPreviews
}: ConceptPreviewCardProps) => {
  const articulation = influences.concat(artistInput ? [artistInput] : [])
  const hasInfluence = articulation.length > 0
  const previewSource = result || floorplanPreview || fallback
  const showingFallback = !result && !floorplanPreview
  const referencePreviews = inspirationPreviews.slice(0, 3)

  return (
    <aside className="flex flex-col gap-3 rounded-[16px] border border-[var(--border-strong)] bg-[var(--surface)] p-4">
      <div className="relative h-48 w-full overflow-hidden rounded-[12px] bg-[var(--muted)]">
        <NextImage
          src={previewSource}
          alt="Concept preview"
          fill
          unoptimized
          className={showingFallback ? 'object-contain opacity-70' : 'object-cover'}
          sizes="(min-width: 1024px) 320px, 70vw"
        />
        <div className="pointer-events-none absolute inset-3 border border-[var(--border-strong)]" />
      </div>

      <div className="space-y-2 text-[0.55rem] uppercase tracking-[0.28em] text-[var(--foreground-subtle)]">
        {hasInfluence ? (
          <div className="flex flex-wrap gap-2">
            {articulation.map(item => (
              <span key={item} className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--accent)]">
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[0.52rem] uppercase tracking-[0.25em] opacity-60">Add influences to tailor the palette.</p>
        )}

        {referencePreviews.length > 0 && (
          <div className="flex items-center gap-2">
            {referencePreviews.map((preview, index) => (
              <span key={index} className="relative h-9 w-9 overflow-hidden rounded-[10px] border border-[var(--border)]">
                <NextImage src={preview} alt={`Reference ${index + 1}`} fill unoptimized className="object-cover" sizes="36px" />
              </span>
            ))}
            {inspirationPreviews.length > 3 && (
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[var(--border-strong)]">
                +{inspirationPreviews.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
