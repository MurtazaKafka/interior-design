import { ChatComposer, ChatComposerProps } from './ChatComposer'
import { ChatTranscript } from './ChatTranscript'
import { ChatMessage } from '../types/chat'

export type StudioChatPanelProps = {
  history: ChatMessage[]
  composer: Pick<ChatComposerProps, 'value' | 'placeholder' | 'onChange' | 'onSubmit'>
}

export const StudioChatPanel = ({ history, composer }: StudioChatPanelProps) => (
  <div className="flex flex-col gap-3">
    <ChatTranscript history={history} />
    <ChatComposer {...composer} />
  </div>
)
