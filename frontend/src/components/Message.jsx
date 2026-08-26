import FlowMark from './FlowMark.jsx'
import { clockTime } from '../lib/time.js'
import Markdown from './Markdown.jsx'
import ToolTrail from './ToolTrail.jsx'

function Thinking() {
  return (
    <span className="thinking" aria-label="Assistant is thinking">
      <i /><i /><i />
    </span>
  )
}

export default function Message({ message, streaming }) {
  const { role, content, ts } = message

  if (role === 'user') {
    return (
      <div className="msg msg--user">
        <div className="msg__bubble">{content}</div>
        <div className="msg__meta msg__meta--user">{clockTime(ts)}</div>
      </div>
    )
  }

  const isEmpty = !content
  const showCaret = streaming && !isEmpty

  return (
    <div className="msg msg--assistant">
      <div className="msg__glyph">
        <FlowMark size={22} animated={streaming} />
      </div>
      <div className="msg__body">
        <ToolTrail tools={message.tools} />
        {isEmpty && streaming ? (
          <Thinking />
        ) : (
          <div className={`md${showCaret ? ' md--caret' : ''}`}>
            <Markdown text={content} />
            {showCaret && <span className="caret" />}
          </div>
        )}
        <div className="msg__meta">
          AI FLOW · {clockTime(ts)}
        </div>
      </div>
    </div>
  )
}
