import FlowMark from './FlowMark.jsx'
import { clockTime } from '../lib/time.js'
import Markdown from './Markdown.jsx'
import ToolTrail from './ToolTrail.jsx'

function Thinking() {
  return (
    <span className="inline-flex gap-[5px] py-1.5" aria-label="Assistant is thinking">
      <i className="w-1.5 h-1.5 rounded-full bg-accent animate-[dotPulse_1.2s_ease-in-out_infinite]" />
      <i className="w-1.5 h-1.5 rounded-full bg-accent animate-[dotPulse_1.2s_ease-in-out_0.15s_infinite]" />
      <i className="w-1.5 h-1.5 rounded-full bg-accent animate-[dotPulse_1.2s_ease-in-out_0.3s_infinite]" />
    </span>
  )
}

export default function Message({ message, streaming }) {
  const { role, content, ts } = message

  if (role === 'user') {
    return (
      <div className="flex justify-end flex-col items-end animate-[msgIn_0.32s_cubic-bezier(0.22,0.9,0.3,1)_both]">
        <div className="max-w-[78%] py-[11px] px-[15px] bg-gradient-to-br from-raise to-[#131824] border border-hairline-strong rounded-2xl rounded-br-[5px] text-[14.5px] leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </div>
        <div className="font-mono text-[9.5px] tracking-[0.12em] text-text-faint mt-[7px] mr-1">{clockTime(ts)}</div>
      </div>
    )
  }

  const isEmpty = !content
  const showCaret = streaming && !isEmpty

  return (
    <div className="flex gap-[15px] animate-[msgIn_0.32s_cubic-bezier(0.22,0.9,0.3,1)_both]">
      <div className="shrink-0 w-[30px] pt-[3px]">
        <FlowMark size={22} animated={streaming} />
      </div>
      <div className="min-w-0 flex-1">
        <ToolTrail tools={message.tools} />
        {isEmpty && streaming ? (
          <Thinking />
        ) : (
          <div className="relative">
            <Markdown text={content} />
            {showCaret && (
              <span className="inline-block w-2 h-[1.05em] ml-[3px] align-text-bottom rounded-[1.5px] bg-accent animate-[caretBlink_1s_steps(2,start)_infinite]" />
            )}
          </div>
        )}
        <div className="font-mono text-[9.5px] tracking-[0.12em] text-text-faint mt-[7px]">
          AI FLOW · {clockTime(ts)}
        </div>
      </div>
    </div>
  )
}
