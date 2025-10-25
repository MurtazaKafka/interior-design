import { Sparkles } from 'lucide-react'

type StudioStatusBarProps = {
  status: string
  onGenerate: () => void
  onReset: () => void
  canGenerate: boolean
  isProcessing: boolean
  showReset: boolean
}

export const StudioStatusBar = ({
  status,
  onGenerate,
  onReset,
  canGenerate,
  isProcessing,
  showReset
}: StudioStatusBarProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-strong)] pt-3">
    <div className="text-xs text-[var(--foreground-subtle)]">
      <p className="text-[0.58rem] uppercase tracking-[0.28em]">Concept status</p>
      <p className="text-[0.7rem] text-[var(--foreground)]">{status}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isProcessing}
        className="geometric-button flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.58rem] uppercase tracking-[0.28em]"
      >
        {isProcessing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
            Processing
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Render concept
          </>
        )}
      </button>

      {showReset && (
        <button
          onClick={onReset}
          className="rounded-full border border-[var(--border)] px-3.5 py-1.5 text-[0.55rem] uppercase tracking-[0.28em] text-[var(--foreground-subtle)] transition hover:border-[var(--highlight)] hover:text-[var(--accent)]"
        >
          Reset briefing
        </button>
      )}
    </div>
  </div>
)
