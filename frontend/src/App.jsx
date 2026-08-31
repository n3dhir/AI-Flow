import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatHeader from './components/ChatHeader.jsx'
import Message from './components/Message.jsx'
import Composer from './components/Composer.jsx'
import EmptyState from './components/EmptyState.jsx'
import Toasts from './components/Toasts.jsx'
import Login from './components/Login.jsx'
import { listConversations, getMessages, deleteConversation, uploadDocument, streamChat, getModel, getToken, logout, getMe } from './lib/api.js'

const THREAD_KEY = 'aiflow.activeThread'

let toastSeq = 0

function HistorySkeleton() {
  return (
    <div className="max-w-[764px] mx-auto pt-10 px-5 pb-4 flex flex-col gap-3.5" aria-hidden="true">
      <div className="h-[15px] rounded-[7px] bg-gradient-to-r from-white/5 via-white/10 to-[length:240%_100%] animate-[shimmer_1.5s_linear_infinite] w-[60%]" />
      <div className="h-[15px] rounded-[7px] bg-gradient-to-r from-white/5 via-white/10 to-[length:240%_100%] animate-[shimmer_1.5s_linear_infinite] w-[40%]" />
      <div className="h-[15px] rounded-[7px] bg-gradient-to-r from-white/5 via-white/10 to-[length:240%_100%] animate-[shimmer_1.5s_linear_infinite] w-[72%]" />
    </div>
  )
}

export default function App() {
  const [booted, setBooted] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [threads, setThreads] = useState([])
  const [activeId, setActiveId] = useState(() => localStorage.getItem(THREAD_KEY) || null)
  const [messages, setMessages] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [status, setStatus] = useState('connecting')
  const [streaming, setStreaming] = useState(false)
  const [upload, setUpload] = useState(null)
  const [toasts, setToasts] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [draft, setDraft] = useState('')
  const [modelName, setModelName] = useState('')
  const hostLabel = modelName.includes('gemini') ? 'google ai' : modelName ? 'frellmapi' : ''

  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const stickRef = useRef(true)
  const composerRef = useRef(null)
  const lastMsg = messages[messages.length - 1]
  const [canRetry, setCanRetry] = useState(false)

  useEffect(() => {
    if (streaming) return
    const isEmpty = lastMsg?.role === 'assistant' && !lastMsg.content.trim()
    const hasToolError = lastMsg?.tools?.some((t) => t.status === 'error')
    setCanRetry(isEmpty || hasToolError)
  }, [messages, streaming, lastMsg])

  const handleAuth = useCallback(() => {
    setAuthenticated(true)
    setAuthChecking(false)
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    setAuthenticated(false)
    setThreads([])
    setMessages([])
    setActiveId(null)
    localStorage.removeItem(THREAD_KEY)
  }, [])

  useEffect(() => {
    if (getToken()) {
      getMe()
        .then(() => setAuthenticated(true))
        .catch(() => {
          logout()
          setAuthenticated(false)
        })
        .finally(() => setAuthChecking(false))
    } else {
      setAuthChecking(false)
    }
  }, [])

  const toast = useCallback((message, kind = 'info', ttl = 4500) => {
    const id = ++toastSeq
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl)
  }, [])

  const refreshThreads = useCallback(async () => {
    try {
      const data = await listConversations()
      setThreads(Array.isArray(data) ? data : [])
      setStatus('online')
      return data
    } catch {
      setStatus('offline')
      return []
    }
  }, [])

  const loadHistory = useCallback(async (id) => {
    if (!id) {
      setMessages([])
      return
    }
    setHistoryLoading(true)
    try {
      const data = await getMessages(id)
      const clean = data
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m, i) => ({ id: `${m.created_at}-${i}`, role: m.role, content: m.content, tools: m.tools || [], ts: m.created_at }))
      setMessages(clean)
      stickRef.current = true
    } catch {
      setMessages([])
      toast('Could not load conversation history.', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setBooted(true))
    refreshThreads().then((data) => {
      const stored = localStorage.getItem(THREAD_KEY)
      if (stored && data.some((t) => t.thread_id === stored)) {
        loadHistory(stored)
      } else if (stored) {
        localStorage.removeItem(THREAD_KEY)
        setActiveId(null)
      }
    })
    getModel().then((d) => setModelName(d.model)).catch(() => {})
    return () => raf && cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (authenticated) {
      refreshThreads()
    }
  }, [authenticated])

  useEffect(() => {
    const el = scrollRef.current
    if (el && stickRef.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140
  }

  const selectThread = (id) => {
    if (id === activeId) {
      return
    }
    setActiveId(id)
    localStorage.setItem(THREAD_KEY, id)
    loadHistory(id)
  }

  const startNew = () => {
    abortRef.current?.abort()
    setActiveId(null)
    localStorage.removeItem(THREAD_KEY)
    setMessages([])
    setDraft('')
    if (window.innerWidth < 768) setSidebarOpen(false)
    composerRef.current?.focus()
  }

  const removeThread = async (id) => {
    setThreads((t) => t.filter((x) => x.thread_id !== id))
    if (id === activeId) startNew()
    try {
      await deleteConversation(id)
      toast('Conversation deleted.')
    } catch {
      toast('Delete failed on server.', 'error')
    }
  }

  const ensureThreadId = () => {
    let tid = activeId
    if (!tid) {
      tid = crypto.randomUUID()
      setActiveId(tid)
      localStorage.setItem(THREAD_KEY, tid)
    }
    return tid
  }

  const send = async (text) => {
    if (streaming) return
    const tid = ensureThreadId()
    const stamp = Date.now()
    const userMsg = { id: `u-${stamp}`, role: 'user', content: text, ts: new Date().toISOString() }
    const botMsg = { id: `a-${stamp}`, role: 'assistant', content: '', ts: new Date().toISOString(), tools: [] }

    setMessages((m) => [...m, userMsg, botMsg])
    stickRef.current = true
    setStreaming(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    const patchBot = (fn) =>
      setMessages((prev) => prev.map((msg) => (msg.id === botMsg.id ? fn(msg) : msg)))

    const append = (delta) => patchBot((msg) => ({ ...msg, content: msg.content + delta }))

    const onEvent = (evt) => {
      if (evt.type === 'tool_start') {
        patchBot((msg) => ({
          ...msg,
          tools: [...(msg.tools || []), { name: evt.name, status: 'running' }],
        }))
      } else if (evt.type === 'tool_end') {
        patchBot((msg) => {
          const tools = [...(msg.tools || [])]
          const idx = tools.findIndex((t) => t.status === 'running')
          if (idx >= 0) tools[idx] = { ...tools[idx], status: evt.ok ? 'done' : 'error', preview: evt.preview }
          return { ...msg, tools }
        })
      }
    }

    try {
      await streamChat({ threadId: tid, message: text, signal: ctrl.signal, onDelta: append, onEvent })
    } catch (e) {
      if (e.name === 'AbortError') {
        append('\n\n_(stopped)_')
      } else {
        const failed = e.status ? `${e.message}` : `Cannot reach backend — ${e.message}`
        setMessages((prev) =>
          prev.map((msg) => (msg.id === botMsg.id && !msg.content.trim() ? { ...msg, content: `⚠️ ${failed}` } : msg))
        )
        toast(failed, 'error')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
      setMessages((prev) =>
        prev.map((msg) => (msg.id === botMsg.id && !msg.content.trim() ? { ...msg, content: '_No response._' } : msg))
      )
      refreshThreads()
    }
  }

  const retry = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMsg) {
      send(lastUserMsg.content)
    }
  }

  const stop = () => abortRef.current?.abort()

  const pickFile = async (file) => {
    if (upload?.state === 'uploading') return
    const tid = ensureThreadId()
    setUpload({ name: file.name, state: 'uploading' })
    try {
      const res = await uploadDocument(tid, file)
      setUpload({ name: file.name, state: 'done', chunks: res.chunks })
      toast(`Indexed "${res.filename}" · ${res.chunks} chunks`, 'success')
      setTimeout(() => setUpload(null), 4000)
      refreshThreads()
    } catch (e) {
      setUpload({ name: file.name, state: 'error' })
      toast(e.message || 'Upload failed.', 'error')
      setTimeout(() => setUpload(null), 3200)
    }
  }

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-full h-full bg-bg">
        <div className="font-display text-2xl text-accent">AI Flow</div>
      </div>
    )
  }

  if (!authenticated) {
    return <Login onAuth={handleAuth} />
  }

  return (
    <div className="relative flex h-dvh">
      {/* Shared gradient defs - always in DOM */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="flowgrad" x1="0" y1="0" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5ce8c5" />
            <stop offset="1" stopColor="#9db8ff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute top-0 left-0 right-0 h-[2px] z-[60] bg-gradient-to-r from-transparent via-accent/70 to-[length:220%_100%] animate-flow" aria-hidden="true" />

      <Sidebar
        threads={threads}
        activeId={activeId}
        status={status}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={selectThread}
        onNew={startNew}
        onDelete={removeThread}
        onLogout={handleLogout}
        hostName={hostLabel}
      />

      <main className="relative flex-1 min-w-0 flex flex-col bg-bg">
        <ChatHeader threadId={activeId} status={status} modelName={modelName} hostName={hostLabel} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

        <div className="relative flex-1 overflow-y-auto" ref={scrollRef} onScroll={onScroll}>
          {historyLoading ? (
            <HistorySkeleton />
          ) : messages.length === 0 ? (
            <EmptyState
              onPick={(prompt) => {
                setDraft(prompt)
                composerRef.current?.focus()
              }}
            />
          ) : (
            <div className="max-w-[764px] mx-auto py-[34px] px-5.5 flex flex-col gap-[26px]">
              {messages.map((m) => (
                <Message
                  key={m.id}
                  message={m}
                  streaming={streaming && m.role === 'assistant' && m === messages[messages.length - 1]}
                  canRetry={canRetry && m === messages[messages.length - 1]}
                  onRetry={retry}
                />
              ))}
            </div>
          )}
        </div>

        <Composer
          ref={composerRef}
          value={draft}
          onValueChange={setDraft}
          streaming={streaming}
          upload={upload}
          onSend={send}
          onStop={stop}
          onPickFile={pickFile}
        />
      </main>

      <Toasts toasts={toasts} />
    </div>
  )
}
