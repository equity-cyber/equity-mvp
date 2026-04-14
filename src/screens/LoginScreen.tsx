import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  onGuest: () => void
}

export function LoginScreen({ onGuest }: Props) {
  const { signIn, signUp, resetPassword } = useAuth()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [isSignUp, setIsSignUp]   = useState(false)
  const [isReset, setIsReset]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (isReset) {
      if (!email.trim()) return
      setLoading(true)
      const { error: err } = await resetPassword(email.trim().toLowerCase())
      setLoading(false)
      if (err) { setError(err); return }
      setSuccess('Te hemos enviado un enlace para restablecer tu contraseña. Revisa tu email.')
      return
    }

    if (!email.trim() || !password.trim()) return
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }

    setLoading(true)

    if (isSignUp) {
      const { error: err } = await signUp(email.trim().toLowerCase(), password)
      setLoading(false)
      if (err) {
        if (err.includes('already registered')) {
          setError('Este email ya está registrado. Inicia sesión.')
        } else {
          setError(err)
        }
        return
      }
      setSuccess('¡Cuenta creada! Ya puedes iniciar sesión.')
      setIsSignUp(false)
      setPassword('')
    } else {
      const { error: err } = await signIn(email.trim().toLowerCase(), password)
      setLoading(false)
      if (err) {
        if (err.includes('Invalid login')) {
          setError('Email o contraseña incorrectos')
        } else {
          setError(err)
        }
        return
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-zinc-900 tracking-tight mb-1">equity</h1>
          <p className="text-zinc-500 text-sm">matching para co-founders</p>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900 mb-1">
            {isReset ? 'Recuperar contraseña' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="text-sm text-zinc-500 mb-5">
            {isReset
              ? 'Te enviaremos un enlace para restablecer tu contraseña'
              : isSignUp ? 'Regístrate con email y contraseña' : 'Accede con tu cuenta'
            }
          </p>

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

            {!isReset && (
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-3 py-2 border border-emerald-100">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || (!isReset && !password.trim())}
              className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    {isReset ? 'Enviando…' : isSignUp ? 'Creando cuenta…' : 'Entrando…'}
                  </span>
                : isReset ? 'Enviar enlace →' : isSignUp ? 'Crear cuenta →' : 'Entrar →'
              }
            </button>
          </form>

          {!isReset && !isSignUp && (
            <button
              onClick={() => { setIsReset(true); setError(null); setSuccess(null) }}
              className="w-full text-center text-sm text-zinc-400 hover:text-zinc-600 mt-3"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            onClick={() => {
              if (isReset) { setIsReset(false) }
              else { setIsSignUp(!isSignUp) }
              setError(null)
              setSuccess(null)
            }}
            className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700 mt-3"
          >
            {isReset
              ? '← Volver al inicio de sesión'
              : isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'
            }
          </button>

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
