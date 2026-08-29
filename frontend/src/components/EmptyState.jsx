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
    <div className="h-full flex flex-col items-center justify-center text-center py-8 px-6">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-accent-deep animate-rise">local · private · yours</div>
      <h1 ref={headlineRef} className="mt-[18px] font-display font-normal text-[clamp(38px,5.4vw,58px)] leading-[1.08] tracking-tight animate-rise" style={{ animationDelay: '0.25s' }}>
        What shall we<br />
        <em className="italic text-accent">flow</em> through today?
      </h1>
      <p className="mt-[18px] max-w-[430px] text-[14.5px] leading-relaxed text-text-dim animate-rise" style={{ animationDelay: '0.35s' }}>
        Web search, document recall and long-term memory — running on your own machine.
      </p>
      <div className="flex flex-wrap justify-center gap-2.5 mt-[34px]">
        {SUGGESTIONS.map((s, i) => (
          <button
            key={s.label}
            className="flex items-center gap-2 py-2.5 px-[15px] border border-hairline-rounded-full text-[13px] text-text-dim bg-white/[0.025] transition-all hover:border-accent-glow hover:text-text hover:bg-accent-dim hover:-translate-y-0.5 animate-rise rounded-full"
            style={{ animationDelay: `${0.4 + i * 0.07}s` }}
            onClick={() => onPick(s.prompt)}
          >
            <span aria-hidden="true">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
