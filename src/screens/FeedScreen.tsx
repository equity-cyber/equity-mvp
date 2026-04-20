import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { MOCK_PROFILES, MockProfile, FounderType } from '../data/mockProfiles'
import { ProfileCard } from '../components/ProfileCard'
import { ProfileDetail } from '../components/ProfileDetail'
import { calculateMatchScore } from '../lib/matchScore'

type Filter = 'Todos' | FounderType
const FILTERS: Filter[] = ['Todos', 'Hacker', 'Hustler', 'Money', 'Legal']

const TYPE_TAG_STYLES: Record<FounderType, string> = {
  Hacker:  'bg-blue-100 text-blue-700',
  Hustler: 'bg-emerald-100 text-emerald-700',
  Money:   'bg-amber-100 text-amber-700',
  Legal:   'bg-rose-100 text-rose-700',
}

interface MyProfile {
  founder_type: FounderType
  full_name: string
  bio: string
  skills: { label: string; cat: string }[]
  seeking: string[]
  location?: string
}

interface Props {
  myProfileId: string | null
  myFounderType: FounderType | null
  onSignOut?: () => void
  onOpenConnections: () => void
  onOpenMyProfile: () => void
}

// Lista negra de nombres claramente de prueba
const BLACKLIST_NAMES = new Set([
  'aa', 'aaa', 'aaaa', 'hh', 'dd', 'ff', 'gg', 'xx', 'zz',
  'loco', 'prueba', 'test', 'testing', 'asdf', 'qwer', 'pepe lopez',
  'amazon undertaker',
])

function isValidProfile(row: any): boolean {
  const name = (row.full_name || '').trim().toLowerCase()
  if (!name || name.length < 3) return false
  if (BLACKLIST_NAMES.has(name)) return false
  if (/^(.)\1+$/.test(name.replace(/\s/g, ''))) return false
  const bio = (row.bio || '').trim()
  if (bio.length < 30) return false
  return true
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
    score_hhm: 0,
    score_skills: 0,
    score_vision: 0,
    skills: Array.isArray(row.skills) ? row.skills : [],
    seeking: Array.isArray(row.seeking) ? row.seeking : [],
    ai_explain: '',
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

export function FeedScreen({ myProfileId, myFounderType, onSignOut, onOpenConnections, onOpenMyProfile }: Props) {
  const { signOut } = useAuth()
  const [passed, setPassed] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('Todos')
  const [detail, setDetail] = useState<MockProfile | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [allProfiles, setAllProfiles] = useState<MockProfile[]>(MOCK_PROFILES)
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!myProfileId) {
      if (myFounderType) {
        setMyProfile({
          founder_type: myFounderType,
          full_name: 'Tú',
          bio: '',
          skills: [],
          seeking: [],
          location: '',
        })
      }
      return
    }

    supabase
      .from('profiles')
      .select('*')
      .eq('id', myProfileId)
      .single()
      .then(({ data }) => {
        if (data) {
          setMyProfile({
            founder_type: data.founder_type || myFounderType || 'Legal',
            full_name: data.full_name || 'Tú',
            bio: data.bio || '',
            skills: Array.isArray(data.skills) ? data.skills : [],
            seeking: Array.isArray(data.seeking) ? data.seeking : [],
            location: data.location || '',
          })
        }
      })
  }, [myProfileId, myFounderType])

  useEffect(() => {
    if (!myProfileId) return

    supabase
      .from('connections')
      .select('id')
      .eq('to_profile_id', myProfileId)
      .eq('status', 'pending')
      .then(({ data }) => {
        setPendingCount(data?.length || 0)
      })
  }, [myProfileId])

  useEffect(() => {
    const loadRealProfiles = async () => {
      const [{ data, error }, blocksRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        myProfileId
          ? supabase.from('profile_blocks').select('blocked_id').eq('blocker_id', myProfileId)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const blocked = new Set((blocksRes.data || []).map((b: any) => b.blocked_id))

      if (!error && data) {
        const mockIds = new Set(MOCK_PROFILES.map(p => p.id))
        const realProfiles = data
          .filter(row => row.id !== myProfileId)
          .filter(row => !mockIds.has(row.id))
          .filter(row => !blocked.has(row.id))
          .filter(isValidProfile)
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

  const matchResults = useMemo(() => {
    const defaultProfile: MyProfile = {
      founder_type: myFounderType || 'Legal',
      full_name: 'Tú',
      bio: '',
      skills: [],
      seeking: [],
      location: 'Málaga',
    }
    const me = myProfile || defaultProfile

    const results: Record<string, { score: number; explanation: string }> = {}
    for (const p of allProfiles) {
      const match = calculateMatchScore(me, p)
      results[p.id] = { score: match.score, explanation: match.explanation }
    }
    return results
  }, [allProfiles, myProfile, myFounderType])

  const sortedVisible = useMemo(() => {
    return [...visible].sort((a, b) => {
      const scoreA = matchResults[a.id]?.score || 0
      const scoreB = matchResults[b.id]?.score || 0
      return scoreB - scoreA
    })
  }, [visible, matchResults])

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
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-zinc-900 leading-tight">equity</h1>
              <p className="text-xs text-zinc-400 leading-tight">co-founder matching</p>
            </div>
            {myFounderType && (
              <span className={`hidden sm:inline-flex px-3 py-1 text-xs font-semibold rounded-full ${tagStyle}`}>
                {myFounderType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenMyProfile}
              className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
              title="Mi perfil"
            >
              <span className="text-base">👤</span>
            </button>
            <button
              onClick={onOpenConnections}
              className="relative w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
              title="Conexiones"
            >
              <span className="text-base">💬</span>
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={handleSignOut}
              className="text-xs text-zinc-400 hover:text-zinc-600 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors ml-1"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
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
        {myFounderType && (
          <div className="mb-5 px-1">
            <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-1.5 border border-zinc-100 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${tagStyle.split(' ')[0]}`} />
              <span className="text-xs text-zinc-500">
                Viendo perfiles complementarios a <span className="font-semibold text-zinc-700">{myFounderType}</span>
              </span>
            </div>
          </div>
        )}

        {loadingProfiles ? (
          <div className="space-y-4">
            {[0,1,2].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-zinc-100 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-100 rounded w-2/3" />
                    <div className="h-3 bg-zinc-100 rounded w-1/2" />
                    <div className="h-3 bg-zinc-100 rounded w-1/4" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-zinc-100" />
                </div>
                <div className="mt-5 h-16 bg-zinc-50 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : sortedVisible.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 mx-auto mb-4 bg-zinc-100 rounded-2xl flex items-center justify-center text-3xl">🔍</div>
            <p className="text-zinc-700 font-semibold">Has visto todos los perfiles</p>
            <p className="text-zinc-400 text-sm mt-1 mb-5">Vuelve pronto, se añaden nuevos fundadores cada semana</p>
            <button
              onClick={() => setPassed(new Set())}
              className="px-5 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-2xl hover:bg-black transition-colors"
            >
              Ver perfiles descartados de nuevo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedVisible.map(profile => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                matchScore={matchResults[profile.id]?.score || 0}
                matchExplanation={matchResults[profile.id]?.explanation || ''}
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
        myProfile={myProfile}
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
