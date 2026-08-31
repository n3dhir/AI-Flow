import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

function Markdown({ text }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        a: (props) => <a {...props} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 hover:text-accent-deep" />,
        p: (props) => <p {...props} className="mb-3 leading-relaxed text-[14.5px]" />,
        h1: (props) => <h1 {...props} className="text-xl font-semibold mt-5 mb-3" />,
        h2: (props) => <h2 {...props} className="text-lg font-semibold mt-4 mb-2" />,
        h3: (props) => <h3 {...props} className="text-base font-semibold mt-3 mb-2" />,
        h4: (props) => <h4 {...props} className="text-sm font-semibold mt-2 mb-1" />,
        ul: (props) => <ul {...props} className="list-disc pl-6 mb-3 space-y-1 text-[14.5px]" />,
        ol: (props) => <ol {...props} className="list-decimal pl-6 mb-3 space-y-1 text-[14.5px]" />,
        li: (props) => <li {...props} className="leading-relaxed" />,
        table: (props) => (
          <div className="overflow-x-auto mb-3">
            <table {...props} className="min-w-full border-collapse text-[14px]" />
          </div>
        ),
        thead: (props) => <thead {...props} className="bg-white/5" />,
        th: (props) => <th {...props} className="border border-hairline px-3 py-2 text-left font-semibold" />,
        td: (props) => <td {...props} className="border border-hairline px-3 py-2" />,
        tr: (props) => <tr {...props} className="even:bg-white/[0.02]" />,
        blockquote: (props) => <blockquote {...props} className="border-l-2 border-accent pl-4 my-3 text-text-dim italic" />,
        code: ({ node, inline, className, children, ...props }) => {
          if (inline) {
            return <code {...props} className="bg-white/8 text-accent-deep px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>
          }
          return <code {...props} className={`block bg-[#0d1117] rounded-lg p-4 mb-3 text-[13px] font-mono overflow-x-auto ${className || ''}`}>{children}</code>
        },
        pre: (props) => <pre {...props} className="bg-transparent p-0 m-0" />,
        hr: (props) => <hr {...props} className="my-4 border-hairline" />,
        strong: (props) => <strong {...props} className="font-semibold text-text" />,
        em: (props) => <em {...props} className="italic" />,
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

export default memo(Markdown)
