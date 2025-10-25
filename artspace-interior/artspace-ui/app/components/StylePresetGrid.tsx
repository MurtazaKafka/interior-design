type StylePresetGridProps = {
  presets: string[]
  selected: string[]
  onToggle: (preset: string) => void
}

export const StylePresetGrid = ({ presets, selected, onToggle }: StylePresetGridProps) => (
  <div className="grid grid-cols-2 gap-2">
    {presets.map(preset => {
      const active = selected.includes(preset)
      return (
        <button
          key={preset}
          type="button"
          onClick={() => onToggle(preset)}
          className={`rounded-full px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.26em] transition ${
            active
              ? 'bg-[var(--accent)] text-[#05060a]'
              : 'border border-[var(--border)] text-[var(--foreground-subtle)] hover:border-[var(--highlight)] hover:text-[var(--accent)]'
          }`}
        >
          {preset}
        </button>
      )
    })}
  </div>
)
