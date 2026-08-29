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

  return (
    <div className="flex items-center justify-center min-h-full h-full bg-bg relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(92, 232, 197, 0.08), transparent), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(157, 184, 255, 0.05), transparent)',
      }}
    >
      <div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none animate-[orbFloat_8s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, rgba(92, 232, 197, 0.12), transparent 70%)', filter: 'blur(60px)' }}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-[400px] mx-4 p-10 rounded-2xl border border-hairline animate-[cardEnter_0.5s_cubic-bezier(0.22,0.9,0.3,1)]"
        style={{
          background: 'linear-gradient(180deg, rgba(18, 22, 30, 0.9), rgba(14, 18, 25, 0.95))',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 0 1px rgba(92, 232, 197, 0.05), 0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-accent border border-accent/20"
            style={{ background: 'linear-gradient(135deg, rgba(92, 232, 197, 0.15), rgba(92, 232, 197, 0.05))' }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M4 10c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M4 17c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
              <path d="M4 24c4-5 8 5 12 0s8 5 12 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.25" />
            </svg>
          </div>
          <span className="font-display text-[22px] text-text tracking-tight">AI Flow</span>
        </div>

        <div className="mb-7">
          <h1 className="text-2xl font-medium text-text tracking-tight mb-1.5">
            {mode === 'login' ? 'Welcome back' : 'Get started'}
          </h1>
          <p className="text-sm text-text-dim">
            {mode === 'login' ? 'Sign in to continue to your workspace' : 'Create your account to begin'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-dim uppercase tracking-wide">Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-elevated border border-hairline rounded-xl px-4 py-3.5 text-text text-[15px] outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(92,232,197,0.1)] placeholder:text-text-faint"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-dim uppercase tracking-wide">Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-elevated border border-hairline rounded-xl px-4 py-3.5 text-text text-[15px] outline-none transition-all focus:border-accent focus:shadow-[0_0_0_3px_rgba(92,232,197,0.1)] placeholder:text-text-faint"
            />
          </label>

          {error && (
            <div className="text-danger text-sm px-3.5 py-3 bg-danger/10 border border-danger/20 rounded-lg animate-[errorShake_0.4s_ease]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 py-3.5 rounded-xl font-semibold text-bg flex items-center justify-center min-h-[50px] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-8px_rgba(92,232,197,0.5)] active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-deep))' }}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-transparent border-t-bg rounded-full animate-spin" />
            ) : (
              mode === 'login' ? 'Sign in' : 'Create account'
            )}
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-hairline" />
          <span className="px-3 text-xs text-text-faint whitespace-nowrap">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <div className="flex-1 h-px bg-hairline" />
        </div>

        <button
          type="button"
          className="w-full py-3 rounded-xl text-text text-sm border border-hairline bg-elevated transition-all hover:bg-raise hover:border-hairline-strong"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
        >
          {mode === 'login' ? 'Create an account' : 'Sign in instead'}
        </button>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .auth-card-mobile {
            padding: 28px 20px;
            margin: 12px;
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          .auth-card-mobile input {
            border: none !important;
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
