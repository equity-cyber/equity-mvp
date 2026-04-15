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
    name: '1 Match',
    price: '4,99€',
    priceNote: 'pago único',
    desc: 'Desbloquea el chat con este co-founder',
    bullet: '✓ Chat ilimitado con 1 persona',
    priceId: 'price_1TMOBHU8xknUjRYeCsgbwze',
  },
  {
    id: 'pack3',
    name: '3 Matches',
    price: '12,99€',
    priceNote: '4,33€ por match',
    desc: 'Conecta con tus 3 mejores matches',
    bullet: '✓ Chat ilimitado con 3 personas',
    priceId: 'price_1TMBOrHU8xknUjRYb97ATzmD',
    popular: true,
  },
  {
    id: 'monthly',
    name: 'Pro',
    price: '16,99€',
    priceNote: '/mes · cancela cuando quieras',
    desc: 'Para fundadores que buscan activamente',
    bullet: '✓ Chat ilimitado con todos · Prioridad en el feed',
    priceId: 'price_1TMBPTHU8xknUjRYUNwtvgTm',
  },
  {
    id: 'yearly',
    name: 'Pro Anual',
    price: '149€',
    priceNote: '/año — 12,42€/mes',
    desc: 'El mejor precio para encontrar a tu co-founder',
    bullet: '✓ Todo ilimitado · 2 meses gratis',
    priceId: 'price_1TMBQCHU8xknUjRYcA3FnSYQ',
    savings: 'Ahorra 55€',
  },
]

const SUPABASE_FUNCTION_URL = 'https://eocfuhidteqlatkxhrac.supabase.co/functions/v1/clever-handler'
const SUPABASE_ANON_KEY = 'sb_publishable_NOfzEoKGisEUEOAwSMbRMA_O2Gdjb8d'

// Analytics: log paywall events to Supabase
// Table: paywall_events (id uuid PK, profile_id text, event text, metadata jsonb, created_at timestamptz)
// If the table doesn't exist yet, events silently fail — no impact on UX
async function logPaywallEvent(profileId: string | null, event: string, metadata?: Record<string, any>) {
  if (!profileId) return
  try {
    await supabase.from('paywall_events').insert({
      profile_id: profileId,
      event,
      metadata: metadata || {},
    })
  } catch {
    // Silent fail — analytics should never break the app
  }
}

interface Props {
  connectionId: string
  myProfileId: string | null
  otherProfileId: string
  otherName: string
  onBack: () => void
  paymentJustCompleted?: boolean
}

export function ChatScreen({ connectionId, myProfileId, otherProfileId, otherName, onBack, paymentJustCompleted }: Props) {
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
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentStep, setPaymentStep] = useState(0) // 0-3 animated steps
  const [showUnlockedModal, setShowUnlockedModal] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
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

    if (data?.is_premium) {
      setIsPremium(true)
    }
  }

  // Payment return flow — animated processing + celebration
  useEffect(() => {
    if (!paymentJustCompleted) return

    setPaymentProcessing(true)
    setPaymentStep(0)
    logPaywallEvent(myProfileId, 'payment_return')

    // Animate through steps
    const stepTimers = [
      setTimeout(() => setPaymentStep(1), 1200),
      setTimeout(() => setPaymentStep(2), 2800),
    ]

    // Poll for premium status
    let attempts = 0
    const pollInterval = setInterval(async () => {
      attempts++
      const { data } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', myProfileId)
        .single()

      if (data?.is_premium) {
        setIsPremium(true)
        setPaymentStep(3)
        logPaywallEvent(myProfileId, 'payment_confirmed')

        // Short delay then show celebration modal
        setTimeout(() => {
          setPaymentProcessing(false)
          setShowUnlockedModal(true)
          loadMessages() // Refresh chat
        }, 1000)

        clearInterval(pollInterval)
      } else if (attempts >= 15) {
        setPaymentProcessing(false)
        setPaymentStep(0)
        showToast('Tu pago se está confirmando. Recarga la página en un momento.')
        logPaywallEvent(myProfileId, 'payment_timeout')
        clearInterval(pollInterval)
      }
    }, 2000)

    return () => {
      stepTimers.forEach(clearTimeout)
      clearInterval(pollInterval)
    }
  }, [paymentJustCompleted, myProfileId])

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
      logPaywallEvent(myProfileId, 'paywall_hit_send')
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

  const handleOpenPaywall = () => {
    setShowPaywall(true)
    logPaywallEvent(myProfileId, 'paywall_opened')
  }

  const handleCheckout = async (priceId: string, planId: string) => {
    setLoadingCheckout(true)
    logPaywallEvent(myProfileId, 'checkout_started', { plan: planId })

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
        logPaywallEvent(myProfileId, 'checkout_redirected', { plan: planId })
        window.location.href = data.url
      } else {
        showToast('Error al crear el pago. Inténtalo de nuevo.')
        logPaywallEvent(myProfileId, 'checkout_error', { plan: planId, error: 'no_url' })
      }
    } catch (err) {
      showToast('Error de conexión. Inténtalo de nuevo.')
      logPaywallEvent(myProfileId, 'checkout_error', { plan: planId, error: 'network' })
    }
    setLoadingCheckout(false)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const PROCESSING_STEPS = [
    { icon: '🔄', text: 'Conectando con el banco…' },
    { icon: '✅', text: 'Pago recibido correctamente' },
    { icon: '🔓', text: 'Activando tu cuenta…' },
    { icon: '🎉', text: '¡Todo listo!' },
  ]

  // Payment processing overlay
  if (paymentProcessing) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
            <span className="text-4xl animate-pulse">
              {PROCESSING_STEPS[Math.min(paymentStep, 3)].icon}
            </span>
          </div>

          <h3 className="text-xl font-bold text-zinc-900 mb-6">Procesando tu pago</h3>

          <div className="space-y-3 text-left mb-6">
            {PROCESSING_STEPS.map((step, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  i <= paymentStep ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  i < paymentStep
                    ? 'bg-emerald-100 text-emerald-600'
                    : i === paymentStep
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-zinc-100 text-zinc-400'
                }`}>
                  {i < paymentStep ? '✓' : i === paymentStep ? (
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" />
                  ) : '·'}
                </div>
                <p className={`text-sm ${
                  i <= paymentStep ? 'text-zinc-700 font-medium' : 'text-zinc-400'
                }`}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-400">
            Esto suele tardar unos segundos. No cierres esta página.
          </p>
        </div>
      </div>
    )
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
                    <p className={`text-xs mt-1 text-zinc-400`}>
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
              onClick={handleOpenPaywall}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
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

      {/* ── Paywall Modal (redesigned) ── */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-6 max-h-[92vh] overflow-y-auto animate-slide-up">

            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">💎</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900">
                No pierdas esta conexión
              </h3>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Has usado tus {FREE_MESSAGE_LIMIT} mensajes gratis.<br/>
                <span className="font-medium text-zinc-700">{otherName}</span> ya está en tu red — desbloquea el chat para seguir conversando.
              </p>
            </div>

            {/* Plans */}
            <div className="space-y-2.5 mb-5">
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => handleCheckout(plan.priceId, plan.id)}
                  disabled={loadingCheckout}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md disabled:opacity-60 relative ${
                    plan.popular
                      ? 'border-amber-400 bg-amber-50 shadow-sm'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                      ⭐ Más popular
                    </span>
                  )}
                  {/* Savings badge */}
                  {plan.savings && (
                    <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500 text-white">
                      {plan.savings}
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-zinc-900">{plan.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{plan.desc}</p>
                      <p className="text-xs text-emerald-600 mt-1 font-medium">{plan.bullet}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-lg font-black text-zinc-900">{plan.price}</p>
                      <p className="text-xs text-zinc-400">{plan.priceNote}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Loading checkout */}
            {loadingCheckout && (
              <div className="text-center py-2 mb-3">
                <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto"/>
                <p className="text-xs text-zinc-400 mt-2">Preparando pago seguro…</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center">
              <button
                onClick={() => {
                  setShowPaywall(false)
                  logPaywallEvent(myProfileId, 'paywall_dismissed')
                }}
                className="text-sm text-zinc-400 hover:text-zinc-600"
              >
                Ahora no
              </button>
              <p className="text-xs text-zinc-300 mt-3">
                Pago seguro con Stripe 🔒 · Cancelación fácil
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Unlocked Celebration Modal ── */}
      {showUnlockedModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-5 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-5xl">🎉</span>
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 mb-2">
              ¡Ya tienes chat ilimitado!
            </h3>
            <p className="text-zinc-500 leading-relaxed mb-8">
              Tu suscripción está activa. Ahora puedes chatear sin límites con {otherName} y con todos tus matches.
            </p>
            <button
              onClick={() => {
                setShowUnlockedModal(false)
                loadMessages()
              }}
              className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              Seguir chateando →
            </button>
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
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-sm px-6 py-3 rounded-2xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* Inline CSS for animations */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.25s ease-out;
        }
      `}</style>
    </div>
  )
}
