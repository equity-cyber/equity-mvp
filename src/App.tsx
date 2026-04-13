import React, { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { FeedScreen } from './screens/FeedScreen'
import { FounderType } from './data/mockProfiles'

type Screen = 'loading' | 'login' | 'onboarding' | 'feed'

export default function App() {
  const { user, loading } = useAuth()
  const [screen, setScreen] = useState<Screen>('loading')
  const [guest, setGuest]   = useState(false)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [myFounderType, setMyFounderType] = useState<FounderType | null>(null)

  useEffect(() => {
    if (loading) return
    if (guest) { setScreen('onboarding'); return }
    if (!user)   { setScreen('login'); return }

    supabase
      .from('profiles')
      .select('id, founder_type')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMyProfileId(data.id)
          setMyFounderType(data.founder_type)
          setScreen('feed')
        } else {
          setScreen('onboarding')
        }
      })
  }, [user, loading, guest])

  if (screen === 'loading') return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"/>
        <p className="text-xs text-zinc-400">Cargando…</p>
      </div>
    </div>
  )

  if (screen === 'login') return (
    <LoginScreen
      onGuest={() => setGuest(true)}
    />
  )

  if (screen === 'onboarding') return (
    <OnboardingScreen
      userId={user?.id ?? null}
      onComplete={(profileId, founderType) => {
        setMyProfileId(profileId)
        setMyFounderType(founderType)
        setScreen('feed')
      }}
    />
  )

  return (
    <FeedScreen
      myProfileId={myProfileId}
      myFounderType={myFounderType}
      onSignOut={() => { setGuest(false); setMyProfileId(null); setMyFounderType(null); setScreen('login') }}
    />
  )
}
