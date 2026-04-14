import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { FounderType } from '../data/mockProfiles'

const TYPES: { value: FounderType; label: string; desc: string }[] = [
  { value: 'Hacker',  label: 'Hacker',  desc: 'Construyo · Dev, diseño, producto' },
  { value: 'Hustler', label: 'Hustler', desc: 'Vendo · Ventas, marketing, growth' },
  { value: 'Money',   label: 'Money',   desc: 'Invierto · Capital, red, financiación' },
  { value: 'Legal',   label: 'Legal',   desc: 'Asesoro · Legal, cumplimiento, contratos' },
]

const TYPE_STYLES: Record<FounderType, string> = {
  Hacker:  'border-blue-400 bg-blue-50',
  Hustler: 'border-emerald-400 bg-emerald-50',
  Money:   'border-amber-400 bg-amber-50',
  Legal:   'border-rose-400 bg-rose-50',
}

interface Props {
  userId: string | null
  onComplete: (profileId: string | null, founderType: FounderType | null) => void
}

export function OnboardingScreen({ userId, onComplete }: Props) {
  const [fullName,     setFullName]     = useState('')
  const [founderType,  setFounderType]  = useState<FounderType | null>(null)
  const [bio,          setBio]          = useState('')
  const [aporta,       setAporta]       = useState('')
  const [busca,        setBusca]        = useState('')
  const [github,       setGithub]       = useState('')
  const [linkedin,     setLinkedin]     = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [avatarFile,   setAvatarFile]   = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSubmit = fullName.trim() && founderType && bio.trim()

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen debe pesar menos de 2MB')
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const uploadAvatar = async (profileId: string): Promise<string | null> => {
    if (!avatarFile) return null
    const ext = avatarFile.name.split('.').pop()
    const path = `${profileId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true })

    if (uploadError) return null

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
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
    if (github.trim()) row.github_username = github.trim()
    if (linkedin.trim()) row.linkedin_url = linkedin.trim()

    const { data, error: err } = await supabase
      .from('profiles')
      .insert(row)
      .select('id')
      .single()

    if (err) { setLoading(false); setError(err.message); return }

    if (data?.id && avatarFile) {
      const avatarUrl = await uploadAvatar(data.id)
      if (avatarUrl) {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', data.id)
      }
    }

    setLoading(false)
    onComplete(data?.id ?? null, founderType)
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-1">equity</h1>
          <p className="text-zinc-500 text-sm">Cuéntanos quién eres · 1 minuto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Avatar */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col items-center">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-3 self-start">
              Foto de perfil
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-3xl bg-zinc-100 flex items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors overflow-hidden border-2 border-dashed border-zinc-300"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <span className="text-3xl">📷</span>
                  <p className="text-xs text-zinc-400 mt-1">Subir</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-zinc-400 mt-2">Opcional · Máx 2MB</p>
          </div>

          {/* Nombre */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-2">
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Tu nombre y apellido"
              required
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            />
          </div>

          {/* Tipo de founder */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-3">
              Soy principalmente un…
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setFounderType(t.value)}
                  className={`
                    p-3 rounded-xl border-2 text-left transition-all duration-150
                    ${founderType === t.value
                      ? TYPE_STYLES[t.value]
                      : 'border-zinc-200 bg-zinc-50 hover:bg-zinc-100'
                    }
                  `}
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
              Tu prueba de trabajo · ¿qué has construido?
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="ej. Llevo 3 años construyendo SaaS B2B. Tengo un producto con 200 clientes activos y busco socio comercial."
              rows={3}
              required
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Aporta */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-2">
              ¿Qué aportas al proyecto?
            </label>
            <input
              type="text"
              value={aporta}
              onChange={e => setAporta(e.target.value)}
              placeholder="ej. Código, producto, red de inversores, ventas enterprise…"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            />
          </div>

          {/* Busca */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-2">
              ¿Qué buscas en un socio?
            </label>
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="ej. Dev fullstack, capital pre-seed, perfil legal, ventas B2B…"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
            />
          </div>

          {/* GitHub & LinkedIn */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide block mb-3">
              Verificación (opcional)
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🐙</span>
                <input
                  type="text"
                  value={github}
                  onChange={e => setGithub(e.target.value)}
                  placeholder="Tu usuario de GitHub"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">💼</span>
                <input
                  type="text"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  placeholder="URL de tu perfil de LinkedIn"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-xs text-zinc-400">Los enlaces solo se mostrarán a tus conexiones aceptadas</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full py-3.5 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 active:scale-[.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
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
            Saltar por ahora
          </button>

        </form>
      </div>
    </div>
  )
}
