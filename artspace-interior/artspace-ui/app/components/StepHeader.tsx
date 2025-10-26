import { ReactNode } from 'react'

type StepHeaderProps = {
  step: string
  title: string
  meta?: ReactNode
  description?: string
}

export const StepHeader = ({ step, title, meta, description }: StepHeaderProps) => (
  <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6">
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--accent)]">{step}</p>
        <h2 className="serif text-3xl leading-tight tracking-[-0.01em]">{title}</h2>
      </div>
      {meta}
    </div>
    {description && <p className="text-base leading-relaxed text-[var(--foreground-subtle)]">{description}</p>}
  </div>
)
