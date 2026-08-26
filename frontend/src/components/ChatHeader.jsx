import FlowMark from './FlowMark.jsx'
import { shortId } from '../lib/time.js'

export default function ChatHeader({ threadId, status, modelName, hostName, onToggleSidebar }) {
  const displayModel = modelName
    ? modelName.includes('/')
      ? modelName.split('/').pop()
      : modelName
    : '…'

  return (
    <header className="chat-header">
      <button className="menu-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1.5 3h13M1.5 8h13M1.5 13h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <div className="model-chip">
        <FlowMark size={16} animated={false} />
        <span className="model-chip__name">{displayModel}</span>
        <span className="model-chip__sep">/</span>
        <span className="model-chip__host">{hostName || 'llm'}</span>
      </div>

      <div className="header-spacer" />

      <div className="thread-chip" title="Current thread id">
        <span className={`conn-dot conn-dot--${status}`} />
        thread&nbsp;<code>{threadId ? shortId(threadId) : '——'}</code>
      </div>
    </header>
  )
}
