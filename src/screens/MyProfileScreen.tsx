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
}

export function MyProfileScreen({ myProfileId, onBack }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
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
          })
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

            <div className="text-center">
              <p className="text-xs text-zinc-300">ID: {myProfileId}</p>
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
