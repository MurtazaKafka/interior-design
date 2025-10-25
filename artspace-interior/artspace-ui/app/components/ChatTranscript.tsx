import { ChatMessage } from '../types/chat'

type ChatTranscriptProps = {
  history: ChatMessage[]
  className?: string
}

export const ChatTranscript = ({ history, className = '' }: ChatTranscriptProps) => (
  <div
    className={`max-h-56 overflow-y-auto rounded-[16px] border border-[var(--border-strong)] bg-[var(--surface)] ${className}`.trim()}
  >
    <ul className="divide-y divide-[var(--border-strong)]">
      {history.map((message, index) => (
        <li key={`${message.role}-${index}`} className="px-4 py-3">
          <p className="text-[0.55rem] uppercase tracking-[0.28em] text-[var(--foreground-subtle)]">
            {message.role === 'assistant' ? 'Artspace' : 'You'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">{message.message}</p>
        </li>
      ))}
    </ul>
  </div>
)
