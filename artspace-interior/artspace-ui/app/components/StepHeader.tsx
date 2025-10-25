import { ReactNode } from 'react'

type StepHeaderProps = {
  step: string
  title: string
  meta?: ReactNode
  description?: string
}

export const StepHeader = ({ step, title, meta, description }: StepHeaderProps) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="pillar-heading">{step}</p>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {meta}
    </div>
    {description && <p className="text-[0.85rem] text-[var(--foreground-subtle)]">{description}</p>}
  </div>
)
