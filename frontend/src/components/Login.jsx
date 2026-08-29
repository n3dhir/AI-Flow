import { useState } from 'react'
import { login, register } from '../lib/api.js'

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      onAuth()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  return (
    <div className="flex min-h-full h-full bg-bg">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-12 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(14, 18, 25, 1) 0%, rgba(10, 13, 18, 1) 100%)',
        }}
      >
        {/* Large watermark logo */}
        <div className="absolute -left-20 -bottom-32 opacity-[0.04]">
          <svg width="500" height="500" viewBox="0 0 32 32" fill="none">
            <path d="M4 10c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent" />
            <path d="M4 17c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent" />
            <path d="M4 24c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-accent" />
          </svg>
        </div>

        {/* Top brand */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-accent border border-accent/20"
              style={{ background: 'linear-gradient(135deg, rgba(92, 232, 197, 0.1), rgba(92, 232, 197, 0.03))' }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M4 10c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 17c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
                <path d="M4 24c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
              </svg>
            </div>
            <span className="font-display text-xl text-text tracking-tight">AI Flow</span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative -mt-20">
          <h2 className="text-[42px] font-display font-normal text-text leading-[1.1] tracking-tight mb-6">
            Your thoughts,<br />
            <span className="italic text-accent">amplified.</span>
          </h2>
          <p className="text-text-dim text-lg leading-relaxed max-w-[380px]">
            Web search, document recall, and long-term memory — running privately on your machine.
          </p>
        </div>

        {/* Bottom features */}
        <div className="relative flex gap-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]" />
            <span className="text-sm text-text-dim">Private by design</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue" />
            <span className="text-sm text-text-dim">Local-first</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-deep" />
            <span className="text-sm text-text-dim">Always available</span>
          </div>
        </div>

        {/* Decorative line */}
        <div className="absolute left-0 bottom-0 w-full h-px bg-gradient-to-r from-accent/30 via-transparent to-blue/20" />
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-accent border border-accent/20"
              style={{ background: 'linear-gradient(135deg, rgba(92, 232, 197, 0.1), rgba(92, 232, 197, 0.03))' }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M4 10c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 17c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
                <path d="M4 24c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
              </svg>
            </div>
            <span className="font-display text-xl text-text tracking-tight">AI Flow</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[32px] font-medium text-text tracking-tight leading-tight mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-text-dim">
              {mode === 'login'
                ? 'Sign in to continue to your workspace'
                : 'Get started with your personal AI assistant'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-dim uppercase tracking-wider">Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-elevated border border-hairline rounded-xl px-4 py-3 text-text text-[15px] outline-none transition-all focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(92,232,197,0.08)] placeholder:text-text-faint"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-dim uppercase tracking-wider">Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-elevated border border-hairline rounded-xl px-4 py-3 text-text text-[15px] outline-none transition-all focus:border-accent/60 focus:shadow-[0_0_0_3px_rgba(92,232,197,0.08)] placeholder:text-text-faint"
              />
            </label>

            {error && (
              <div className="text-danger text-sm px-4 py-3 bg-danger/10 border border-danger/20 rounded-xl animate-[errorShake_0.4s_ease]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3.5 rounded-xl font-semibold text-bg text-[15px] flex items-center justify-center min-h-[48px] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(92,232,197,0.4)] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
              style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-deep))' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-transparent border-t-bg rounded-full animate-spin" />
              ) : (
                mode === 'login' ? 'Sign in' : 'Create account'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-hairline" />
            <span className="text-xs text-text-faint">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <div className="flex-1 h-px bg-hairline" />
          </div>

          {/* Switch mode */}
          <button
            type="button"
            className="w-full py-3 rounded-xl text-text text-sm font-medium border border-hairline bg-elevated/50 transition-all hover:bg-raise hover:border-hairline-strong"
            onClick={switchMode}
          >
            {mode === 'login' ? 'Create an account' : 'Sign in instead'}
          </button>
        </div>
      </div>
    </div>
  )
}
