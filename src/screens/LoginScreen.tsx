import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  onGuest: () => void
}

export function LoginScreen({ onGuest }: Props) {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [sent, setSent]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error: err } = await signIn(email.trim().toLowerCase())
    setLoading(false)
    if (err) { setError(err); return }
    setSent(true)
  }

  if (sent) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
          </svg>
        </div>
        <h1 className="text-2xl font-black text-zinc-900 mb-2">Revisa tu email</h1>
        <p className="text-zinc-500 text-sm leading-relaxed mb-6">
          Hemos enviado un enlace de acceso a{' '}
          <span className="font-semibold text-zinc-700">{email}</span>.
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="text-sm text-zinc-400 hover:text-zinc-600 underline"
        >
          Usar otro email
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-1">equity</h1>
          <p className="text-zinc-500 text-sm">matching para co-founders</p>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-1">Accede o regístrate</h2>
          <p className="text-sm text-zinc-500 mb-5">Sin contraseña. Te enviamos un enlace mágico.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Enviando…
                  </span>
                : 'Continuar con email →'
              }
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-zinc-100"/>
            <span className="text-xs text-zinc-400">o</span>
            <div className="flex-1 h-px bg-zinc-100"/>
          </div>

          <button
            onClick={onGuest}
            className="w-full py-3.5 rounded-xl border border-zinc-200 text-zinc-600 font-semibold text-sm hover:bg-zinc-50 active:scale-[.99] transition-all"
          >
            Entrar como invitado →
          </button>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-4">
          Al continuar aceptas los Términos de Uso y Política de Privacidad.
        </p>
      </div>
    </div>
  )
}
