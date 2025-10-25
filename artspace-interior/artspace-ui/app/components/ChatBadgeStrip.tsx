type ChatBadgeStripProps = {
  badges: string[]
}

export const ChatBadgeStrip = ({ badges }: ChatBadgeStripProps) => {
  if (!badges.length) return null

  return (
    <div className="flex flex-wrap gap-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)]">
      {badges.map(badge => (
        <span key={badge} className="rounded-full border border-[var(--border)] px-3 py-1">
          {badge}
        </span>
      ))}
    </div>
  )
}
