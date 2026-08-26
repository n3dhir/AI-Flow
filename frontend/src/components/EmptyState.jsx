import { useEffect, useRef } from 'react'

const SUGGESTIONS = [
  { icon: '🌐', label: 'Search the web', prompt: "What's the latest news in AI research? Search the web." },
  { icon: '🧠', label: 'Use memory', prompt: 'Remember that I prefer concise answers with concrete examples.' },
  { icon: '📄', label: 'Ask your docs', prompt: 'Summarise the key points of my uploaded documents.' },
  { icon: '🧮', label: 'Precise math', prompt: 'What is sqrt(1764) * pi? Use the calculator.' },
]

export default function EmptyState({ onPick }) {
  const headlineRef = useRef(null)

  useEffect(() => {
    headlineRef.current?.classList.add('is-in')
  }, [])

  return (
    <div className="empty">
      <div className="empty__kicker">local · private · yours</div>
      <h1 className="empty__headline" ref={headlineRef}>
        What shall we<br />
        <em>flow</em> through today?
      </h1>
      <p className="empty__sub">
        Web search, document recall and long-term memory — running on your own machine.
      </p>
      <div className="empty__chips">
        {SUGGESTIONS.map((s, i) => (
          <button key={s.label} className="chip" style={{ animationDelay: `${140 + i * 70}ms` }} onClick={() => onPick(s.prompt)}>
            <span className="chip__icon" aria-hidden="true">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
