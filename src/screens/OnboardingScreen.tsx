import React, { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FounderType } from '../data/mockProfiles'
import { fetchGitHubData, GitHubData } from '../lib/github'
import { useAuth } from '../hooks/useAuth'

const TYPES: { value: FounderType; label: string; desc: string; color: string }[] = [
  { value: 'Hacker',  label: 'Hacker',  desc: 'Dev, diseño, producto',    color: 'border-blue-400 bg-blue-50' },
  { value: 'Hustler', label: 'Hustler', desc: 'Ventas, marketing, growth', color: 'border-emerald-400 bg-emerald-50' },
  { value: 'Money',   label: 'Money',   desc: 'Capital, red, financiación', color: 'border-amber-400 bg-amber-50' },
  { value: 'Legal',   label: 'Legal',   desc: 'Legal, contratos, cumplimiento', color: 'border-rose-400 bg-rose-50' },
]

const LINKEDIN_REGEX = /linkedin\.com\/in\//i

interface Props {
  userId: string | null
  isGithubRedirect?: boolean
  onComplete: (profileId: string | null, founderType: FounderType | null) => void
  onBackToLogin?: () => void
}

export function OnboardingScreen({ userId, isGithubRedirect, onComplete, onBackToLogin }: Props) {
  const isGuest = !userId
  const { signOut } = useAuth()

  const handleExit = async () => {
    if (!isGuest) {
      await signOut()
    }
    onBackToLogin?.()
  }

  const [fullName,      setFullName]      = useState('')
  const [founderType,   setFounderType]   = useState<FounderType | null>(null)
  const [bio,           setBio]           = useState('')
  const [aporta,        setAporta]        = useState('')
  const [busca,         setBusca]         = useState('')
  const [github,        setGithub]        = useState('')
  const [linkedin,      setLinkedin]      = useState('')
  const [linkedinError, setLinkedinError] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [githubData,    setGithubData]    = useState<GitHubData | null>(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [showExtras,    setShowExtras]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Capture provider_token immediately after GitHub OAuth redirect
  useEffect(() => {
    if (!isGithubRedirect || isGuest) return
    setGithubLoading(true)
    setShowExtras(true)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.provider_token) {
        const data = await fetchGitHubData(session.provider_token)
        if (data) setGithubData(data)
      }
      setGithubLoading(false)
    })
  }, [isGithubRedirect, isGuest])

  const trimmedName = fullName.trim()
  const trimmedBio = bio.trim()
  const nameValid = trimmedName.length >= 3
  const bioValid = trimmedBio.length >= 30
  const canSubmit = nameValid && founderType && bioValid

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('La imagen debe pesar menos de 2MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (profileId: string): Promise<string | null> => {
    if (!avatarFile) return null
    const ext = avatarFile.name.split('.').pop()
    const path = `${profileId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true })
    if (uploadError) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleLinkGitHub = () => {
    supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/onboarding?github=linked' },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    if (linkedin.trim() && !LINKEDIN_REGEX.test(linkedin)) {
      setLinkedinError('URL no válida. Ej: linkedin.com/in/tu-nombre')
      return
    }
    setLinkedinError(null)
    setLoading(true)
    setError(null)

    const row: any = {
      full_name:    fullName.trim(),
      founder_type: founderType,
      bio:          bio.trim(),
      seeking:      busca.trim() ? [busca.trim()] : [],
      skills:       aporta.trim() ? [{ label: aporta.trim(), cat: 'biz' }] : [],
    }
    if (userId) row.user_id = userId
    if (isGuest && github.trim()) row.github_username = github.trim()
    if (!isGuest && githubData) {
      row.github_username = githubData.username
      row.github_verified = true
      row.github_data = githubData
    }
    if (linkedin.trim()) {
      row.linkedin_url = linkedin.trim()
      row.linkedin_verified = 'url_provided'
    }

    const { data, error: err } = await supabase.from('profiles').insert(row).select('id').single()
    if (err) { setLoading(false); setError(err.message); return }

    if (data?.id && avatarFile) {
      const avatarUrl = await uploadAvatar(data.id)
      if (avatarUrl) await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', data.id)
    }

    setLoading(false)
    onComplete(data?.id ?? null, founderType)
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6 relative">
          {onBackToLogin && (
            <button
              type="button"
              onClick={handleExit}
              className="absolute left-0 top-0 text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              ← Volver
            </button>
          )}
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-1">equity</h1>
          <p className="text-zinc-500 text-sm">Cuéntanos quién eres · menos de 1 minuto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Avatar + Nombre — en una fila */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors overflow-hidden border-2 border-dashed border-zinc-300 shrink-0"
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                : <span className="text-2xl">📷</span>
              }
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">Nombre</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre y apellido"
                required
                autoFocus
                minLength={3}
                className={`w-full px-3 py-2 rounded-xl border bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                  trimmedName.length > 0 && !nameValid
                    ? 'border-amber-300 focus:ring-amber-400'
                    : 'border-zinc-200 focus:ring-zinc-900'
                }`}
              />
            </div>
          </div>

          {/* Tipo de founder */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-3">
              Soy principalmente…
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFounderType(t.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                    founderType === t.value ? t.color : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <p className="text-sm font-bold text-zinc-900">{t.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-2">
              ¿Qué has construido? <span className="text-zinc-400 font-normal normal-case">(tu prueba de trabajo)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="ej. Llevo 3 años construyendo SaaS B2B con 200 clientes activos. Busco socio comercial para escalar."
              rows={4}
              required
              minLength={30}
              className={`w-full px-3 py-2.5 rounded-xl border bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none ${
                trimmedBio.length > 0 && !bioValid
                  ? 'border-amber-300 focus:ring-amber-400'
                  : 'border-zinc-200 focus:ring-zinc-900'
              }`}
            />
            <div className="flex justify-between items-center mt-1.5">
              <span className={`text-xs ${bioValid ? 'text-emerald-600' : 'text-zinc-400'}`}>
                {bioValid ? '✓ Bio suficiente' : `Mínimo 30 caracteres (te faltan ${Math.max(0, 30 - trimmedBio.length)})`}
              </span>
              <span className="text-xs text-zinc-300">{trimmedBio.length}/500</span>
            </div>
          </div>

          {/* Detalles opcionales — colapsable */}
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExtras(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-zinc-50 transition-colors"
            >
              <div>
                <span className="text-sm font-semibold text-zinc-700">Añadir detalles</span>
                <span className="text-xs text-zinc-400 ml-2">skills, LinkedIn, GitHub (opcional)</span>
              </div>
              <span className={`text-zinc-400 transition-transform duration-200 ${showExtras ? 'rotate-180' : ''}`}>
                ↓
              </span>
            </button>

            {showExtras && (
              <div className="border-t border-zinc-100 p-4 space-y-3">
                {/* Aporta */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">¿Qué aportas?</label>
                  <input
                    type="text"
                    value={aporta}
                    onChange={e => setAporta(e.target.value)}
                    placeholder="ej. Código, red de inversores, ventas enterprise…"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>

                {/* Busca */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">¿Qué buscas en un socio?</label>
                  <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="ej. Dev fullstack, capital pre-seed, perfil legal…"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                  />
                </div>

                {/* GitHub */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">GitHub</label>
                  {isGuest ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base">🐙</span>
                      <input
                        type="text"
                        value={github}
                        onChange={e => setGithub(e.target.value)}
                        placeholder="Tu usuario de GitHub"
                        className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                      />
                    </div>
                  ) : githubLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50">
                      <span className="text-base">🐙</span>
                      <span className="text-sm text-zinc-400">Verificando…</span>
                      <div className="ml-auto w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                    </div>
                  ) : githubData ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50">
                      <span className="text-base">🐙</span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">✓ @{githubData.username}</p>
                        <p className="text-xs text-emerald-600">{githubData.repos} repos · {githubData.total_stars} ⭐ · desde {githubData.account_created}</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLinkGitHub}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors text-sm text-zinc-700 font-medium"
                    >
                      <span className="text-base">🐙</span>
                      <span>Verificar con GitHub →</span>
                    </button>
                  )}
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-1.5">LinkedIn</label>
                  <div className="flex items-center gap-2">
                    <span className="text-base">💼</span>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={e => { setLinkedin(e.target.value); setLinkedinError(null) }}
                      placeholder="linkedin.com/in/tu-nombre"
                      className={`flex-1 px-3 py-2 rounded-xl border bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        linkedinError ? 'border-red-300 focus:ring-red-400' : 'border-zinc-200 focus:ring-zinc-900'
                      }`}
                    />
                  </div>
                  {linkedinError && <p className="text-xs text-red-500 mt-1 pl-7">{linkedinError}</p>}
                </div>

                <p className="text-xs text-zinc-400">Los enlaces solo se muestran a conexiones aceptadas</p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando…
                </span>
              : 'Ir al feed →'
            }
          </button>

          <button
            type="button"
            onClick={() => onComplete(null, null)}
            className="w-full py-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Saltar y explorar como invitado →
          </button>

        </form>
      </div>
    </div>
  )
}
