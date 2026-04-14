import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Connection {
  id: string
  from_profile_id: string
  to_profile_id: string
  status: string
  created_at: string
  profile_name?: string
  profile_type?: string
  other_profile_id?: string
}

const TYPE_COLORS: Record<string, string> = {
  Hacker:  'bg-blue-100 text-blue-700',
  Hustler: 'bg-emerald-100 text-emerald-700',
  Money:   'bg-amber-100 text-amber-700',
  Legal:   'bg-rose-100 text-rose-700',
}

interface Props {
  myProfileId: string | null
  onBack: () => void
  onOpenChat: (connectionId: string, otherName: string, otherProfileId: string) => void
}

export function ConnectionsScreen({ myProfileId, onBack, onOpenChat }: Props) {
  const [received, setReceived] = useState<Connection[]>([])
  const [sent, setSent] = useState<Connection[]>([])
  const [accepted, setAccepted] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'received' | 'accepted' | 'sent'>('received')
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const loadConnections = async () => {
    if (!myProfileId) { setLoading(false); return }

    const { data: allConnections } = await supabase
      .from('connections')
      .select('*')
      .or(`from_profile_id.eq.${myProfileId},to_profile_id.eq.${myProfileId}`)

    if (!allConnections) { setLoading(false); return }

    const profileIds = new Set<string>()
    allConnections.forEach(c => {
      profileIds.add(c.from_profile_id)
      profileIds.add(c.to_profile_id)
    })
    profileIds.delete(myProfileId)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, founder_type')

    const profileMap: Record<string, { name: string; type: string }> = {}
    if (profiles) {
      profiles.forEach(p => {
        profileMap[p.id] = { name: p.full_name || 'Sin nombre', type: p.founder_type || 'Hacker' }
      })
    }

    const mockNames: Record<string, { name: string; type: string }> = {
      'luis-m':   { name: 'Luis M.', type: 'Hacker' },
      'amir-k':  { name: 'Amir K.', type: 'Money' },
      'mei-l':   { name: 'Mei L.', type: 'Hacker' },
      'sara-p':  { name: 'Sara P.', type: 'Hustler' },
      'marco-v': { name: 'Marco V.', type: 'Hacker' },
      'nadia-r': { name: 'Nadia R.', type: 'Money' },
      'pablo-c': { name: 'Pablo C.', type: 'Hustler' },
      'chen-w':  { name: 'Chen W.', type: 'Hacker' },
    }

    const getName = (id: string) => profileMap[id]?.name || mockNames[id]?.name || 'Usuario'
    const getType = (id: string) => profileMap[id]?.type || mockNames[id]?.type || 'Hacker'

    const enriched = allConnections.map(c => {
      const otherId = c.from_profile_id === myProfileId ? c.to_profile_id : c.from_profile_id
      return {
        ...c,
        profile_name: getName(otherId),
        profile_type: getType(otherId),
        other_profile_id: otherId,
      }
    })

    setReceived(enriched.filter(c => c.to_profile_id === myProfileId && c.status === 'pending'))
    setSent(enriched.filter(c => c.from_profile_id === myProfileId && c.status === 'pending'))
    setAccepted(enriched.filter(c => c.status === 'accepted'))
    setLoading(false)
  }

  useEffect(() => {
    loadConnections()
  }, [myProfileId])

  const handleAccept = async (connectionId: string, name: string) => {
    await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId)

    showToast(`¡Conexión con ${name} aceptada!`)
    loadConnections()
  }

  const handleReject = async (connectionId: string) => {
    await supabase
      .from('connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId)

    showToast('Solicitud rechazada')
    loadConnections()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'Ahora mismo'
    if (diffMin < 60) return `Hace ${diffMin}min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `Hace ${diffDays}d`
  }

  const tabs = [
    { key: 'received' as const, label: 'Recibidas', count: received.length },
    { key: 'accepted' as const, label: 'Aceptadas', count: accepted.length },
    { key: 'sent' as const, label: 'Enviadas', count: sent.length },
  ]

  const currentList = tab === 'received' ? received : tab === 'accepted' ? accepted : sent

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Mis conexiones</h1>
            <p className="text-xs text-zinc-500">Gestiona tus solicitudes y chats</p>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  tab === t.key ? 'bg-white/20' : 'bg-zinc-100'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-4 pb-20">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3"/>
            <p className="text-zinc-400 text-sm">Cargando conexiones…</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">
              {tab === 'received' ? '📥' : tab === 'accepted' ? '🤝' : '📤'}
            </p>
            <p className="text-zinc-400">
              {tab === 'received' && 'No tienes solicitudes pendientes'}
              {tab === 'accepted' && 'Aún no tienes conexiones aceptadas'}
              {tab === 'sent' && 'No has enviado solicitudes todavía'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map(conn => {
              const typeColor = TYPE_COLORS[conn.profile_type || 'Hacker'] || TYPE_COLORS.Hacker
              const initials = (conn.profile_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase()

              return (
                <div key={conn.id} className="bg-white rounded-2xl border border-zinc-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold ${typeColor}`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">{conn.profile_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
                          {conn.profile_type}
                        </span>
                        <span className="text-xs text-zinc-400">{formatDate(conn.created_at)}</span>
                      </div>
                    </div>

                    {tab === 'received' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(conn.id)}
                          className="px-3 py-2 text-sm border border-zinc-200 rounded-xl text-zinc-500 hover:bg-zinc-50"
                        >
                          ✕
                        </button>
                        <button
                          onClick={() => handleAccept(conn.id, conn.profile_name || 'Usuario')}
                          className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-xl font-medium hover:bg-black"
                        >
                          Aceptar
                        </button>
                      </div>
                    )}

                    {tab === 'accepted' && (
                      <button
                        onClick={() => onOpenChat(conn.id, conn.profile_name || 'Usuario', conn.other_profile_id || '')}
                        className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
                      >
                        Chat →
                      </button>
                    )}

                    {tab === 'sent' && (
                      <span className="px-3 py-1.5 text-xs bg-amber-50 text-amber-600 rounded-full font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
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
