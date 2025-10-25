import { ReactNode } from 'react'

type SectionCardProps = {
  children: ReactNode
  className?: string
}

export const SectionCard = ({ children, className = '' }: SectionCardProps) => (
  <section className={`section-card flex flex-col gap-4 ${className}`.trim()}>{children}</section>
)
