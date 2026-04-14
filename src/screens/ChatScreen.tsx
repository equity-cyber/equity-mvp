import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Message {
  id: string
  from_profile_id: string
  content: string
  created_at: string
}

const FREE_MESSAGE_LIMIT = 3

const PLANS = [
  {
    id: 'single',
    name: 'Single Match',
    price: '4,99€',
    desc: 'Chat ilimitado con 1 match',
    priceId: 'price_1TMOBHU8xknUjRYeCsgbwze',
    badge: 'Compra única',
  },
  {
    id: 'pack3',
    name: 'Pack 3 Matches',
    price: '12,99€',
    desc: 'Chat ilimitado con 3 matches',
    priceId: 'price_1TMBOrHU8xknUjRYb97ATzmD',
    badge: 'Más popular',
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: '16,99€/mes',
    desc: 'Chat ilimitado con todos tus matches',
    priceId: 'price_1TMBPTHU8xknUjRYUNwtvgTm',
    badge: 'Ilimitado',
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: '149€/año',
    desc: 'Todo ilimitado — ahorra 27%',
    priceId: 'price_1TMBQCHU8xknUjRYcA3FnSYQ',
    badge: 'Mejor precio',
  },
]

const SUPABASE_FUNCTION_URL = 'https://eocfuhidteqlatkxhrac.supabase.co/functions/v1/clever-handler'
const SUPABASE_ANON_KEY = 'sb_publishable_NOfzEoKGisEUEOAwSMbRMA_O2Gdjb8d'

interface Props {
  connectionId: string
  myProfileId: string | null
  otherProfileId: string
  otherName: string
  onBack: () => void
}

export function ChatScreen({ connectionId, myProfileId, otherProfileId, otherName, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [blockedByOther, setBlockedByOther] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [totalSentByMe, setTotalSentByMe] = useState(0)
  const [isPremium, setIsPremium] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
    setLoading(false)
  }

  const loadTotalSent = async () => {
    if (!myProfileId) return
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('from_profile_id', myProfileId)

    setTotalSentByMe(count ?? 0)
  }

  const checkPremium = async () => {
    if (!myProfileId) return
    const { data } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', myProfileId)
      .single()

    if (data?.is_premium) setIsPremium(true)
  }

  // Check if payment=success in URL (returning from Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success' && myProfileId) {
      supabase
        .from('profiles')
        .update({ is_premium: true })
        .eq('id', myProfileId)
        .then(() => {
          setIsPremium(true)
          showToast('¡Pago completado! Chat ilimitado desbloqueado.')
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname)
        })
    }
  }, [myProfileId])

  useEffect(() => {
    supabase
      .from('connections')
      .select('status')
      .eq('id', connectionId)
      .single()
      .then(({ data }) => {
        if (data?.status === 'blocked') {
          setBlocked(true)
          setBlockedByOther(true)
        }
      })
  }, [connectionId])

  useEffect(() => {
    loadMessages()
    loadTotalSent()
    checkPremium()
    const interval = setInterval(() => {
      loadMessages()
      loadTotalSent()
    }, 3000)
    return () => clearInterval(interval)
  }, [connectionId, myProfileId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const isOverLimit = !isPremium && totalSentByMe >= FREE_MESSAGE_LIMIT
  const remainingMessages = Math.max(0, FREE_MESSAGE_LIMIT - totalSentByMe)

  const handleSend = async () => {
    if (!input.trim() || !myProfileId || sending || blocked || blockedByOther) return

    if (isOverLimit) {
      setShowPaywall(true)
      return
    }

    setSending(true)

    const { error } = await supabase.from('messages').insert({
      connection_id: connectionId,
      from_profile_id: myProfileId,
      to_profile_id: otherProfileId,
      content: input.trim(),
    })

    if (!error) {
      setInput('')
      setTotalSentByMe(prev => prev + 1)
      await loadMessages()
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleBlock = async () => {
    await supabase
      .from('connections')
      .update({ status: 'blocked' })
      .eq('id', connectionId)

    setBlocked(true)
    setShowMenu(false)
    showToast('Usuario bloqueado')
  }

  const handleReport = async () => {
    if (!reportReason.trim() || !myProfileId) return

    await supabase.from('reports').insert({
      reporter_profile_id: myProfileId,
      reported_profile_id: otherProfileId,
      connection_id: connectionId,
      reason: reportReason.trim(),
    })

    setReportSent(true)
    setTimeout(() => {
      setShowReportModal(false)
      setReportReason('')
      setReportSent(false)
      showToast('Reporte enviado. Lo revisaremos pronto.')
    }, 1500)
  }

  const handleCheckout = async (priceId: string) => {
    setLoadingCheckout(true)
    try {
      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          priceId,
          profileId: myProfileId,
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        showToast('Error al crear el pago. Inténtalo de nuevo.')
      }
    } catch (err) {
      showToast('Error de conexión. Inténtalo de nuevo.')
    }
    setLoadingCheckout(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              ←
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                {otherName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-zinc-900">{otherName}</p>
                <p className={`text-xs ${blocked || blockedByOther ? 'text-red-500' : 'text-emerald-600'}`}>
                  {blocked || blockedByOther ? 'Chat bloqueado' : isPremium ? '💎 Premium' : 'Conectados'}
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              ⋯
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-12 z-20 bg-white rounded-2xl border border-zinc-200 shadow-lg w-52 overflow-hidden">
                  {!blocked && !blockedByOther && (
                    <button
                      onClick={handleBlock}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-b border-zinc-100"
                    >
                      🚫 Bloquear usuario
                    </button>
                  )}
                  <button
                    onClick={() => { setShowMenu(false); setShowReportModal(true) }}
                    className="w-full px-4 py-3 text-left text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    ⚠️ Reportar usuario
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Blocked banner */}
      {(blocked || blockedByOther) && (
        <div className="bg-red-50 border-b border-red-100 px-4 py-3">
          <p className="text-sm text-red-600 text-center max-w-lg mx-auto">
            🚫 Este chat ha sido bloqueado. Ya no se pueden enviar ni recibir mensajes.
          </p>
        </div>
      )}

      {/* Free messages counter */}
      {!blocked && !blockedByOther && !loading && !isPremium && !isOverLimit && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2">
          <p className="text-xs text-amber-700 text-center max-w-lg mx-auto">
            💬 Te quedan <span className="font-bold">{remainingMessages}</span> mensaje{remainingMessages !== 1 ? 's' : ''} gratis en toda la app
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3"/>
            <p className="text-zinc-400 text-sm">Cargando mensajes…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">👋</p>
            <p className="text-zinc-500 font-medium">¡Conexión aceptada!</p>
            <p className="text-zinc-400 text-sm mt-1">Envía el primer mensaje a {otherName}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => {
              const isMe = msg.from_profile_id === myProfileId
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-zinc-900 text-white rounded-br-md'
                      : 'bg-white border border-zinc-200 text-zinc-900 rounded-bl-md'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? 'text-zinc-400' : 'text-zinc-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-2">
          {blocked || blockedByOther ? (
            <p className="flex-1 text-center text-sm text-red-400 py-3">
              🚫 Este chat ha sido bloqueado
            </p>
          ) : isOverLimit ? (
            <button
              onClick={() => setShowPaywall(true)}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all"
            >
              🔓 Desbloquear chat ilimitado
            </button>
          ) : (
            <>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Mensaje a ${otherName}…`}
                className="flex-1 px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="px-5 py-3 bg-zinc-900 text-white rounded-2xl font-medium text-sm hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {sending ? '…' : '→'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Paywall Modal with real Stripe plans */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">💎</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Desbloquea el chat</h3>
              <p className="text-sm text-zinc-500 mt-1">
                Has usado tus {FREE_MESSAGE_LIMIT} mensajes gratuitos
              </p>
            </div>

            <div className="space-y-3 mb-5">
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => handleCheckout(plan.priceId)}
                  disabled={loadingCheckout}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md disabled:opacity-60 ${
                    plan.id === 'pack3'
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-zinc-900">{plan.name}</p>
                        {plan.id === 'pack3' && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                            ⭐ Popular
                          </span>
                        )}
                        {plan.id === 'yearly' && (
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500 text-white">
                            -27%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{plan.desc}</p>
                    </div>
                    <p className="text-lg font-black text-zinc-900">{plan.price}</p>
                  </div>
                </button>
              ))}
            </div>

            {loadingCheckout && (
              <div className="text-center py-2 mb-3">
                <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto"/>
                <p className="text-xs text-zinc-400 mt-2">Preparando pago seguro…</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowPaywall(false)}
                className="text-sm text-zinc-400 hover:text-zinc-600"
              >
                Ahora no
              </button>
              <p className="text-xs text-zinc-300 mt-3">
                Pago seguro con Stripe 🔒
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6">
            {reportSent ? (
              <div className="text-center py-6">
                <p className="text-4xl mb-3">✅</p>
                <p className="font-bold text-zinc-900">Reporte enviado</p>
                <p className="text-sm text-zinc-500 mt-1">Lo revisaremos lo antes posible</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-bold text-zinc-900 mb-1">Reportar a {otherName}</h3>
                <p className="text-sm text-zinc-500 mb-4">
                  Cuéntanos qué ha pasado. Revisaremos tu reporte y tomaremos medidas.
                </p>

                <textarea
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  placeholder="Describe el problema…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none mb-4"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowReportModal(false); setReportReason('') }}
                    className="flex-1 py-3 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReport}
                    disabled={!reportReason.trim()}
                    className="flex-1 py-3 text-sm bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-40"
                  >
                    Enviar reporte
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm px-6 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
