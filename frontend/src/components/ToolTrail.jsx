export default function ToolTrail({ tools }) {
  if (!tools?.length) return null

  return (
    <div className="tool-trail">
      {tools.map((t, i) => (
        <div key={`${t.name}-${i}`} className={`tool-step tool-step--${t.status}`}>
          <span className="tool-step__dot" aria-hidden="true" />
          <span className="tool-step__name">{t.name}</span>
          <span className="tool-step__state">
            {t.status === 'running' && 'running…'}
            {t.status === 'done' && 'done'}
            {t.status === 'error' && 'failed'}
          </span>
          {t.preview && (
            <span className="tool-step__preview" title={t.preview}>
              {t.preview}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
