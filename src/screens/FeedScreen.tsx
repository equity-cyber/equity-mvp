import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { MOCK_PROFILES, MockProfile, FounderType } from '../data/mockProfiles'
import { ProfileCard } from '../components/ProfileCard'
import { ProfileDetail } from '../components/ProfileDetail'

type Filter = 'Todos' | FounderType
const FILTERS: Filter[] = ['Todos', 'Hacker', 'Hustler', 'Money', 'Legal']

const TYPE_TAG_STYLES: Record<FounderType, string> = {
  Hacker:  'bg-blue-100 text-blue-700',
  Hustler: 'bg-emerald-100 text-emerald-700',
  Money:   'bg-amber-100 text-amber-700',
  Legal:   'bg-rose-100 text-rose-700',
}

interface Props {
  myProfileId: string | null
  myFounderType: FounderType | null
  onSignOut?: () => void
}

function toMockProfile(row: any): MockProfile {
  const founderType: FounderType = ['Hacker', 'Hustler', 'Money', 'Legal'].includes(row.founder_type)
    ? row.founder_type
    : 'Hacker'

  return {
    id: row.id,
    full_name: row.full_name || 'Sin nombre',
    founder_type: founderType,
    role: row.role || founderType,
    location: row.location || 'Sin especificar',
    bio: row.bio || '',
    pow_score: 65,
    top_pow: 'Perfil nuevo',
    top_pow_metric: 'Pendiente de verificación',
    top_pow_source: 'doc',
    score_hhm: 70,
    score_skills: 60,
    score_vision: 65,
    skills: Array.isArray(row.skills) ? row.skills : [],
    seeking: Array.isArray(row.seeking) ? row.seeking : [],
    ai_explain: 'Perfil recién creado. La IA todavía está calculando la compatibilidad completa.',
    avatar_bg: founderType === 'Hacker' ? 'bg-blue-100'
      : founderType === 'Hustler' ? 'bg-emerald-100'
      : founderType === 'Money' ? 'bg-amber-100'
      : 'bg-rose-100',
    avatar_text: founderType === 'Hacker' ? 'text-blue-800'
      : founderType === 'Hustler' ? 'text-emerald-800'
      : founderType === 'Money' ? 'text-amber-800'
      : 'text-rose-800',
  }
}

export function FeedScreen({ myProfileId, myFounderType, onSignOut }: Props) {
  const { signOut } = useAuth()
  const [passed, setPassed] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('Todos')
  const [detail, setDetail] = useState<MockProfile | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [allProfiles, setAllProfiles] = useState<MockProfile[]>(MOCK_PROFILES)
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  useEffect(() => {
    const loadRealProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')

      if (!error && data) {
        const mockIds = new Set(MOCK_PROFILES.map(p => p.id))
        const realProfiles = data
          .filter(row => row.id !== myProfileId)
          .filter(row => !mockIds.has(row.id))
          .map(toMockProfile)

        setAllProfiles([...MOCK_PROFILES, ...realProfiles])
      }
      setLoadingProfiles(false)
    }

    loadRealProfiles()
  }, [myProfileId])

  const visible = allProfiles.filter(p =>
    !passed.has(p.id) && (filter === 'Todos' || p.founder_type === filter)
  )

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const handlePass = (id: string) => {
    setPassed(prev => new Set([...prev, id]))
    showToast('Perfil descartado')
  }

  const handleSignOut = async () => {
    await signOut()
    onSignOut?.()
  }

  const tagStyle = myFounderType ? TYPE_TAG_STYLES[myFounderType] : 'bg-zinc-100 text-zinc-500'

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-zinc-900">equity</h1>
            <p className="text-xs text-zinc-500 -mt-1">matching para co-founders</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              IA activa
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-zinc-400 hover:text-zinc-600 px-3 py-1 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="max-w-lg mx-auto px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f 
                  ? 'bg-zinc-900 text-white shadow-sm' 
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4">
        <div className="mb-6 px-1">
          <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1 border border-zinc-100">
            <span className="text-xs text-zinc-500">Tu perfil:</span>
            <span className={`px-3 py-0.5 text-xs font-semibold rounded-full ${tagStyle}`}>
              {myFounderType ?? 'Sin definir'}
            </span>
            <span className="text-xs text-zinc-400">→ viendo complementarios</span>
          </div>
        </div>

        {loadingProfiles ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3"/>
            <p className="text-zinc-400 text-sm">Cargando perfiles…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400">Has visto todos los perfiles por ahora.</p>
            <button 
              onClick={() => setPassed(new Set())}
              className="mt-4 text-sm underline text-zinc-500 hover:text-zinc-700"
            >
              Ver perfiles descartados de nuevo
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {visible.map(profile => (
              <ProfileCard 
                key={profile.id} 
                profile={profile} 
                onOpen={setDetail} 
                onPass={handlePass} 
              />
            ))}
          </div>
        )}
      </main>

      <ProfileDetail 
        profile={detail} 
        myProfileId={myProfileId}
        onClose={() => setDetail(null)} 
      />

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm px-6 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
