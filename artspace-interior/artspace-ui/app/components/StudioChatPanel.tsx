import { ChatComposer, ChatComposerProps } from './ChatComposer'
import { ChatTranscript } from './ChatTranscript'
import { ChatMessage } from '../types/chat'

type StudioChatPanelProps = {
  history: ChatMessage[]
  composer: Pick<ChatComposerProps, 'value' | 'placeholder' | 'onChange' | 'onSubmit'>
}

const QUICK_PROMPTS = ['Tone down lighting', 'Introduce sculptural piece', 'Swap to warmer palette']

export const StudioChatPanel = ({ history, composer }: StudioChatPanelProps) => (
  <div className="flex flex-col gap-3">
    <ChatTranscript history={history} />
    <div className="rounded-[16px] border border-[var(--border-strong)] bg-[rgba(9,12,19,0.55)] px-4 py-3 backdrop-blur-xl">
      <p className="text-[0.55rem] uppercase tracking-[0.26em] text-[var(--foreground-subtle)]">Quick prompts</p>
      <div className="mt-2 flex flex-wrap gap-2 text-[0.55rem] uppercase tracking-[0.26em] text-[var(--foreground-subtle)]">
        {QUICK_PROMPTS.map(prompt => (
          <button
            key={prompt}
            type="button"
            onClick={() => composer.onChange(prompt)}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--foreground-subtle)] transition hover:border-[var(--highlight)] hover:text-[var(--accent)]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
    <ChatComposer {...composer} />
  </div>
)
