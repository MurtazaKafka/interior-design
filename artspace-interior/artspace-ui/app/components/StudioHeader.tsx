import { Mic, MicOff } from 'lucide-react'

export type StudioHeaderProps = {
  isListening: boolean
  onToggleListening: () => void
}

export const StudioHeader = ({ isListening, onToggleListening }: StudioHeaderProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-strong)] pb-2">
    <div>
      <p className="pillar-heading">Step 03</p>
      <h2 className="text-xl font-semibold tracking-tight">Conversational studio</h2>
    </div>
    <button
      type="button"
      onClick={onToggleListening}
      className="flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-[0.6rem] uppercase tracking-[0.3em] text-[var(--foreground-subtle)] transition hover:border-[var(--highlight)] hover:text-[var(--accent)]"
    >
      {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      <span>{isListening ? 'Listening' : 'Tap to record'}</span>
    </button>
  </div>
)
