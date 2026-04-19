import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { FounderType } from '../data/mockProfiles'
import { Avatar } from '../components/Avatar'

const TYPE_COLORS: Record<FounderType, string> = {
  Hacker:  'bg-blue-100 text-blue-700',
  Hustler: 'bg-emerald-100 text-emerald-700',
  Money:   'bg-amber-100 text-amber-700',
  Legal:   'bg-rose-100 text-rose-700',
}

const LINKEDIN_REGEX = /linkedin\.com\/in\//i

interface Props {
  myProfileId: string | null
  onBack: () => void
}

interface ProfileData {
  full_name: string
  founder_type: FounderType
  bio: string
  skills: { label: string; cat: string }[]
  seeking: string[]
  avatar_url: string | null
  github_username: string | null
  github_verified: boolean
  github_data: any
  linkedin_url: string | null
  linkedin_verified: string
}

export function MyProfileScreen({ myProfileId, onBack }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [linkedinInput, setLinkedinInput] = useState('')
  const [linkedinError, setLinkedinError] = useState<string | null>(null)
  const [savingLinkedin, setSavingLinkedin] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    if (!myProfileId) { setLoading(false); return }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', myProfileId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            full_name: data.full_name || 'Sin nombre',
            founder_type: data.founder_type || 'Hacker',
            bio: data.bio || '',
            skills: Array.isArray(data.skills) ? data.skills : [],
            seeking: Array.isArray(data.seeking) ? data.seeking : [],
            avatar_url: data.avatar_url || null,
            github_username: data.github_username || null,
            github_verified: !!data.github_verified,
            github_data: data.github_data || null,
            linkedin_url: data.linkedin_url || null,
            linkedin_verified: data.linkedin_verified || 'none',
          })
          setLinkedinInput(data.linkedin_url || '')
        }
        setLoading(false)
      })
  }, [myProfileId])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !myProfileId) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen debe pesar menos de 2MB')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${myProfileId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setUploading(false)
      showToast('Error al subir la imagen')
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${data.publicUrl}?t=${Date.now()}`

    await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', myProfileId)

    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev)
    setUploading(false)
    showToast('Foto actualizada')
  }

  const handleLinkGitHub = () => {
    supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/onboarding?github=linked' },
    })
  }

  const handleSaveLinkedin = async () => {
    if (!myProfileId) return
    const value = linkedinInput.trim()
    if (value && !LINKEDIN_REGEX.test(value)) {
      setLinkedinError('Introduce una URL de LinkedIn válida (ej: linkedin.com/in/tu-nombre)')
      return
    }
    setLinkedinError(null)
    setSavingLinkedin(true)
    const updates: any = { linkedin_url: value || null }
    updates.linkedin_verified = value ? 'url_provided' : 'none'
    await supabase.from('profiles').update(updates).eq('id', myProfileId)
    setProfile(prev => prev ? { ...prev, linkedin_url: value || null, linkedin_verified: updates.linkedin_verified } : prev)
    setSavingLinkedin(false)
    showToast(value ? 'LinkedIn guardado' : 'LinkedIn eliminado')
  }

  const typeColor = profile ? TYPE_COLORS[profile.founder_type] || TYPE_COLORS.Hacker : ''

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-zinc-900">Mi perfil</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 pb-20">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3"/>
            <p className="text-zinc-400 text-sm">Cargando perfil…</p>
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <p className="text-zinc-400">No se encontró tu perfil</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Avatar + Name */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 text-center">
              <div className="relative inline-block">
                <Avatar
                  name={profile.full_name}
                  founderType={profile.founder_type}
                  avatarUrl={profile.avatar_url}
                  size="lg"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center text-sm hover:bg-black transition-colors"
                >
                  {uploading ? '…' : '📷'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <h2 className="text-2xl font-bold text-zinc-900 mt-4">{profile.full_name}</h2>
              <span className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-medium ${typeColor}`}>
                {profile.founder_type}
              </span>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Bio</p>
              <p className="text-zinc-700 leading-relaxed">
                {profile.bio || 'Sin bio todavía'}
              </p>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Lo que aporto</p>
              {profile.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-700 text-sm rounded-full">
                      {s.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm">Sin especificar</p>
              )}
            </div>

            {/* Seeking */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Lo que busco</p>
              {profile.seeking.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.seeking.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-400 text-sm">Sin especificar</p>
              )}
            </div>

            {/* Verificación */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Verificación</p>

              {/* GitHub */}
              <div className="mb-4">
                <p className="text-xs text-zinc-400 mb-2">GitHub</p>
                {profile.github_verified && profile.github_data ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50">
                    <span className="text-base">🐙</span>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">✓ @{profile.github_username}</p>
                      <p className="text-xs text-emerald-600">
                        {profile.github_data.repos} repos · {profile.github_data.total_stars} ⭐ · desde {profile.github_data.account_created}
                      </p>
                    </div>
                  </div>
                ) : profile.github_username ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50">
                    <span className="text-base">🐙</span>
                    <p className="text-sm text-zinc-600">@{profile.github_username} (sin verificar)</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleLinkGitHub}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 transition-colors text-sm text-zinc-700 font-medium"
                  >
                    <span className="text-base">🐙</span>
                    <span>Verificar con GitHub →</span>
                  </button>
                )}
              </div>

              {/* LinkedIn */}
              <div>
                <p className="text-xs text-zinc-400 mb-2">LinkedIn</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkedinInput}
                    onChange={e => { setLinkedinInput(e.target.value); setLinkedinError(null) }}
                    placeholder="linkedin.com/in/tu-nombre"
                    className={`flex-1 px-3 py-2.5 rounded-xl border bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      linkedinError ? 'border-red-300 focus:ring-red-400' : 'border-zinc-200 focus:ring-zinc-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveLinkedin}
                    disabled={savingLinkedin}
                    className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-black disabled:opacity-40 transition-all"
                  >
                    {savingLinkedin ? '…' : 'Guardar'}
                  </button>
                </div>
                {linkedinError && (
                  <p className="text-xs text-red-500 mt-1">{linkedinError}</p>
                )}
                {profile.linkedin_verified === 'url_provided' && !linkedinError && (
                  <p className="text-xs text-emerald-600 mt-1">✓ URL válida guardada</p>
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm px-6 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
