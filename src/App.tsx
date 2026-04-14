import React, { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { supabase } from './lib/supabase'
import { LoginScreen } from './screens/LoginScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { FeedScreen } from './screens/FeedScreen'
import { ConnectionsScreen } from './screens/ConnectionsScreen'
import { ChatScreen } from './screens/ChatScreen'
import { MyProfileScreen } from './screens/MyProfileScreen'
import { FounderType } from './data/mockProfiles'

type Screen = 'loading' | 'login' | 'onboarding' | 'feed' | 'connections' | 'chat' | 'myprofile'

export default function App() {
  const { user, loading } = useAuth()
  const [screen, setScreen] = useState<Screen>('loading')
  const [guest, setGuest]   = useState(false)
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [myFounderType, setMyFounderType] = useState<FounderType | null>(null)
  const [chatConnectionId, setChatConnectionId] = useState<string | null>(null)
  const [chatOtherName, setChatOtherName] = useState<string>('')
  const [chatOtherProfileId, setChatOtherProfileId] = useState<string>('')

  // Check for payment success on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const profileId = params.get('profile_id')
    if (params.get('payment') === 'success' && profileId) {
      supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', profileId)
        .then(() => {
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [])

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

  if (screen === 'myprofile') return (
    <MyProfileScreen
      myProfileId={myProfileId}
      onBack={() => setScreen('feed')}
    />
  )

  if (screen === 'connections') return (
    <ConnectionsScreen
      myProfileId={myProfileId}
      onBack={() => setScreen('feed')}
      onOpenChat={(connectionId, otherName, otherProfileId) => {
        setChatConnectionId(connectionId)
        setChatOtherName(otherName)
        setChatOtherProfileId(otherProfileId)
        setScreen('chat')
      }}
    />
  )

  if (screen === 'chat' && chatConnectionId) return (
    <ChatScreen
      connectionId={chatConnectionId}
      myProfileId={myProfileId}
      otherProfileId={chatOtherProfileId}
      otherName={chatOtherName}
      onBack={() => setScreen('connections')}
    />
  )

  return (
    <FeedScreen
      myProfileId={myProfileId}
      myFounderType={myFounderType}
      onSignOut={() => { setGuest(false); setMyProfileId(null); setMyFounderType(null); setScreen('login') }}
      onOpenConnections={() => setScreen('connections')}
      onOpenMyProfile={() => setScreen('myprofile')}
    />
  )
}
