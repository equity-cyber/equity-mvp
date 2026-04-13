import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FounderType } from '../data/mockProfiles'

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
}

export function MyProfileScreen({ myProfileId, onBack }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

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
          })
        }
        setLoading(false)
      })
  }, [myProfileId])

  const typeColor = profile ? TYPE_COLORS[profile.founder_type] || TYPE_COLORS.Hacker : ''
  const initials = profile
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?'

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
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto mb-4 ${typeColor}`}>
                {initials}
              </div>
              <h2 className="text-2xl font-bold text-zinc-900">{profile.full_name}</h2>
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

            {/* Profile ID (for debugging, can remove later) */}
            <div className="text-center">
              <p className="text-xs text-zinc-300">ID: {myProfileId}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
