import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MockProfile, FounderType } from '../data/mockProfiles'
import { calculateMatchScore } from '../lib/matchScore'
import { Avatar } from './Avatar'

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  Hacker:  { bg: 'bg-blue-50', text: 'text-blue-700' },
  Hustler: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Money:   { bg: 'bg-amber-50', text: 'text-amber-700' },
  Legal:   { bg: 'bg-rose-50', text: 'text-rose-700' },
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
  profile: MockProfile | null
  myProfileId: string | null
  myProfile: MyProfile | null
  onClose: () => void
}

export function ProfileDetail({ profile, myProfileId, myProfile, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [alreadySent, setAlreadySent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (profile) {
      requestAnimationFrame(() => setVisible(true))
      if (myProfileId) {
        supabase
          .from('connections')
          .select('id')
          .eq('from_profile_id', myProfileId)
          .eq('to_profile_id', profile.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setAlreadySent(true)
          })
      }
    } else {
      setVisible(false)
      setAlreadySent(false)
    }
  }, [profile, myProfileId])

  if (!profile) return null

  const p = profile
  const typeStyle = TYPE_COLORS[p.founder_type] || TYPE_COLORS.Hacker

  const defaultMyProfile: MyProfile = {
    founder_type: 'Legal',
    full_name: 'Tú',
    bio: '',
    skills: [],
    seeking: [],
    location: 'Málaga',
  }
  const me = myProfile || defaultMyProfile
  const match = calculateMatchScore(me, p)
  const scoreColor = match.score >= 80 ? '#10b981' : match.score >= 65 ? '#f59e0b' : '#ef4444'

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  const handleConnect = async () => {
    if (alreadySent || sending) return
    setSending(true)
    if (myProfileId) {
      await supabase.from('connections').insert({
        from_profile_id: myProfileId,
        to_profile_id: p.id,
        status: 'pending',
      })
    }
    setSending(false)
    setAlreadySent(true)
    setShowConnectModal(true)
  }

  const closeConnectModal = () => {
    setShowConnectModal(false)
    handleClose()
  }

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      <div className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto transition-transform duration-300 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>

        <div className="sticky top-0 bg-white z-10 flex justify-center pt-3 pb-2 border-b border-zinc-100">
          <div className="w-11 h-1 bg-zinc-300 rounded-full" />
        </div>

        <div className="px-5 pb-10">

          <div className="flex items-start justify-between gap-4 pt-6">
            <div className="flex items-center gap-4">
              <Avatar
                name={p.full_name}
                founderType={p.founder_type}
                avatarUrl={(p as any).avatar_url}
                size="lg"
              />
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{p.full_name}</h2>
                <p className="text-zinc-500">{p.role} · {p.location}</p>
                <div className={`inline-flex mt-2 px-4 py-1 rounded-full text-sm font-medium border ${typeStyle.bg} ${typeStyle.text}`}>
                  {p.founder_type}
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="mt-7 mb-8 p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-zinc-700 leading-relaxed">{p.bio}</p>
          </div>

          <div className="mb-8 bg-white border border-zinc-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-6xl font-black tracking-tighter" style={{ color: scoreColor }}>
                  {match.score}
                </p>
                <p className="text-sm text-zinc-500 -mt-1">MATCH</p>
              </div>
              <div className="text-right text-xs text-zinc-400">
                Basado en reglas de<br />complementariedad
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>Oposición de tipo (HHM)</span>
                  <span className="font-medium">{match.score_hhm}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${match.score_hhm}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>Cobertura de skills</span>
                  <span className="font-medium">{match.score_skills}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${match.score_skills}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>Alineación de visión</span>
                  <span className="font-medium">{match.score_vision}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${match.score_vision}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 p-6 bg-amber-50 border border-amber-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">✦</span>
              <p className="font-semibold text-amber-800">Por qué la IA os sugiere</p>
            </div>
            <p className="text-amber-700 leading-relaxed">{match.explanation}</p>
          </div>

          {(p.github_stars || p.stripe_mrr) && (
            <div className="mb-9">
              <p className="uppercase text-xs font-semibold text-zinc-400 tracking-widest mb-4">Métricas verificadas</p>
              <div className="grid grid-cols-2 gap-3">
                {p.github_stars && (
                  <div className="bg-white border border-zinc-100 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold text-zinc-900">{p.github_stars}</p>
                    <p className="text-xs text-zinc-500 mt-1">GitHub stars</p>
                  </div>
                )}
                {p.stripe_mrr && (
                  <div className="bg-white border border-zinc-100 rounded-2xl p-5 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{p.stripe_mrr} €</p>
                    <p className="text-xs text-zinc-500 mt-1">MRR mensual</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={alreadySent || sending}
            className={`w-full py-4 font-semibold rounded-2xl transition-all active:scale-[0.985] text-lg ${
              alreadySent
                ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                : 'bg-zinc-900 hover:bg-black text-white'
            }`}
          >
            {sending ? 'Enviando…' : alreadySent ? '✓ Solicitud enviada' : `Conectar con ${p.full_name.split(' ')[0]} →`}
          </button>
          <p className="text-center text-xs text-zinc-400 mt-4">
            El chat se desbloqueará cuando ambos aceptéis
          </p>
        </div>
      </div>

      {showConnectModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">✉️</span>
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 mb-2">¡Solicitud enviada!</h3>
            <p className="text-zinc-600 mb-8">
              Se ha enviado una solicitud de conexión a <span className="font-semibold">{p.full_name}</span>.<br />
              Te avisaremos cuando acepte.
            </p>
            <button
              onClick={closeConnectModal}
              className="w-full py-4 bg-zinc-900 text-white font-semibold rounded-2xl hover:bg-black transition-all"
            >
              Volver al feed
            </button>
            <p className="text-xs text-zinc-400 mt-6">
              El chat se desbloqueará cuando ambos aceptéis la conexión
            </p>
          </div>
        </div>
      )}
    </>
  )
}
