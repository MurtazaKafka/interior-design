import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { STYLE_PRESETS } from '../constants'
import { StylePresetGrid } from './StylePresetGrid'

export type CurationFormProps = {
  artistInput: string
  onArtistChange: (value: string) => void
  selectedStyles: string[]
  onToggleStyle: (style: string) => void
}

export const CurationForm = ({ artistInput, onArtistChange, selectedStyles, onToggleStyle }: CurationFormProps) => {
  const [draft, setDraft] = useState('')
  const chips = artistInput
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)

  const commitDraft = () => {
    const next = draft.trim()
    if (!next) return
    const entries = chips.concat(next)
    onArtistChange(entries.join(', '))
    setDraft('')
  }

  const removeChip = (chip: string) => {
    const entries = chips.filter(entry => entry !== chip)
    onArtistChange(entries.join(', '))
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2">
        <p className="pillar-heading">Influence attachments</p>
        <div
          className="attachment-input"
          onClick={() => {
            const input = document.getElementById('attachment-entry') as HTMLInputElement | null
            input?.focus()
          }}
        >
          <Plus className="h-4 w-4 text-[var(--foreground-subtle)]" />
          {chips.length === 0 && (
            <span className="text-xs text-[var(--foreground-subtle)] opacity-70">
              Drop names, materials, or moods — press enter to attach
            </span>
          )}
          {chips.map(chip => (
            <span key={chip} className="attachment-tag">
              {chip}
              <button type="button" aria-label={`Remove ${chip}`} onClick={() => removeChip(chip)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="attachment-entry"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitDraft()
              } else if (event.key === 'Backspace' && !draft && chips.length) {
                removeChip(chips[chips.length - 1])
              }
            }}
            placeholder={chips.length ? '' : undefined}
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="pillar-heading">Architecture modes</p>
        <StylePresetGrid presets={STYLE_PRESETS} selected={selectedStyles} onToggle={onToggleStyle} />
      </div>
    </div>
  )
}
