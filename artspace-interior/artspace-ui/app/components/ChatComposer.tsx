import { Send } from 'lucide-react'
import { textareaResize } from '../utils/textareaResize'

export type ChatComposerProps = {
  value: string
  placeholder: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export const ChatComposer = ({ value, placeholder, onChange, onSubmit }: ChatComposerProps) => (
  <div className="flex items-end gap-3">
    <textarea
      value={value}
      onChange={event => {
        textareaResize(event.currentTarget)
        onChange(event.currentTarget.value)
      }}
      placeholder={placeholder}
      className="min-h-[6rem] flex-1 rounded-[16px] bg-[var(--surface)] px-4 py-3 text-sm"
    />
    <button
      type="button"
      onClick={onSubmit}
      className="geometric-button flex h-[6rem] w-16 items-center justify-center rounded-[16px]"
    >
      <Send className="h-4 w-4" />
    </button>
  </div>
)
