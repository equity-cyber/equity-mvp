import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Message {
  id: string
  from_profile_id: string
  content: string
  created_at: string
}

interface MessageGroup {
  from_profile_id: string
  messages: Message[]
}

interface DaySection {
  dayLabel: string
  groups: MessageGroup[]
}

// Free plan: up to 5 distinct chat conversations (unlimited messages within each)
const FREE_CHAT_LIMIT = 5

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

async function logPaywallEvent(profileId: string | null, event: string, metadata?: Record<string, any>) {
  if (!profileId) return
  try {
    await supabase.from('paywall_events').insert({ profile_id: profileId, event, metadata: metadata || {} })
  } catch { /* silent fail */ }
}

// Group consecutive messages from same sender (within 5 min)
function buildDaySections(messages: Message[]): DaySection[] {
  const result: DaySection[] = []
  let currentDayKey = ''
  let currentGroups: MessageGroup[] = []
  let currentGroup: MessageGroup | null = null

  const flushGroup = () => {
    if (currentGroup) { currentGroups.push(currentGroup); currentGroup = null }
  }
  const flushDay = () => {
    flushGroup()
    if (currentGroups.length > 0) {
      result.push({ dayLabel: getDayLabel(currentDayKey), groups: currentGroups })
      currentGroups = []
    }
  }

  for (const msg of messages) {
    const d = new Date(msg.created_at)
    const dayKey = d.toDateString()
    if (dayKey !== currentDayKey) { flushDay(); currentDayKey = dayKey }

    const lastTime = currentGroup?.messages.at(-1)
      ? new Date(currentGroup.messages.at(-1)!.created_at).getTime() : 0
    const gap = d.getTime() - lastTime

    if (currentGroup && currentGroup.from_profile_id === msg.from_profile_id && gap < 5 * 60 * 1000) {
      currentGroup.messages.push(msg)
    } else {
      flushGroup()
      currentGroup = { from_profile_id: msg.from_profile_id, messages: [msg] }
    }
  }
  flushDay()
  return result
}

function getDayLabel(dateKey: string): string {
  const d = new Date(dateKey)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Hoy'
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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
  // usedChats: distinct conversations where I've sent ≥1 message
  const [usedChats, setUsedChats] = useState(0)
  // hasStartedThisChat: I've already sent at least 1 message in THIS conversation
  const [hasStartedThisChat, setHasStartedThisChat] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [paymentStep, setPaymentStep] = useState(0)
  const [showUnlockedModal, setShowUnlockedModal] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const lastTypingSentRef = useRef(0)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages').select('*').eq('connection_id', connectionId).order('created_at', { ascending: true })
    if (data) setMessages(data)
    setLoading(false)
  }

  const loadChatStats = async () => {
    if (!myProfileId) return

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Count distinct conversations started THIS month (for quota)
    const { data: thisMonthData } = await supabase
      .from('messages')
      .select('connection_id')
      .eq('from_profile_id', myProfileId)
      .gte('created_at', monthStart.toISOString())

    // Check if I've EVER written in THIS specific chat (to allow continuation)
    const { data: thisChatData } = await supabase
      .from('messages')
      .select('id')
      .eq('from_profile_id', myProfileId)
      .eq('connection_id', connectionId)
      .limit(1)

    if (thisMonthData) {
      const distinctConns = new Set(thisMonthData.map(m => m.connection_id))
      setUsedChats(distinctConns.size)
    }
    setHasStartedThisChat((thisChatData?.length ?? 0) > 0)
  }

  const checkPremium = async () => {
    if (!myProfileId) return
    const { data } = await supabase.from('profiles').select('is_premium').eq('id', myProfileId).single()
    if (data?.is_premium) setIsPremium(true)
  }

  // Typing indicator via Supabase Realtime broadcast
  useEffect(() => {
    const channel = supabase.channel(`typing-${connectionId}`)
    channelRef.current = channel

    channel.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
      if (payload?.from !== myProfileId) {
        setOtherTyping(true)
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000)
      }
    }).subscribe()

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      supabase.removeChannel(channel)
    }
  }, [connectionId, myProfileId])

  const broadcastTyping = () => {
    const now = Date.now()
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { from: myProfileId } })
    }
  }

  // Payment return flow
  useEffect(() => {
    if (!paymentJustCompleted) return
    setPaymentProcessing(true); setPaymentStep(0)
    logPaywallEvent(myProfileId, 'payment_return')
    const t1 = setTimeout(() => setPaymentStep(1), 1200)
    const t2 = setTimeout(() => setPaymentStep(2), 2800)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', myProfileId).single()
      if (data?.is_premium) {
        setIsPremium(true); setPaymentStep(3)
        logPaywallEvent(myProfileId, 'payment_confirmed')
        setTimeout(() => { setPaymentProcessing(false); setShowUnlockedModal(true); loadMessages() }, 1000)
        clearInterval(poll)
      } else if (attempts >= 15) {
        setPaymentProcessing(false); setPaymentStep(0)
        showToast('Tu pago se está confirmando. Recarga en un momento.')
        logPaywallEvent(myProfileId, 'payment_timeout')
        clearInterval(poll)
      }
    }, 2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(poll) }
  }, [paymentJustCompleted, myProfileId])

  useEffect(() => {
    supabase.from('connections').select('status').eq('id', connectionId).single()
      .then(({ data }) => { if (data?.status === 'blocked') { setBlocked(true); setBlockedByOther(true) } })
  }, [connectionId])

  useEffect(() => {
    loadMessages(); loadChatStats(); checkPremium()
    const interval = setInterval(() => { loadMessages(); loadChatStats() }, 4000)
    return () => clearInterval(interval)
  }, [connectionId, myProfileId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, otherTyping])

  // Blocked only when starting a NEW conversation beyond the free limit
  // Already-started chats are always available regardless of limit
  const isOverLimit = !isPremium && !hasStartedThisChat && usedChats >= FREE_CHAT_LIMIT
  const remainingChats = Math.max(0, FREE_CHAT_LIMIT - usedChats)
  // Warn when 1 chat slot remains and this is still a new conversation
  const isLow = !isPremium && !hasStartedThisChat && remainingChats === 1

  const handleSend = async () => {
    if (!input.trim() || !myProfileId || sending || blocked || blockedByOther) return
    if (isOverLimit) { setShowPaywall(true); logPaywallEvent(myProfileId, 'paywall_hit_send'); return }
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      connection_id: connectionId, from_profile_id: myProfileId,
      to_profile_id: otherProfileId, content: input.trim(),
    })
    if (!error) { setInput(''); setHasStartedThisChat(true); setUsedChats(prev => prev + (hasStartedThisChat ? 0 : 1)); await loadMessages() }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleBlock = async () => {
    await supabase.from('connections').update({ status: 'blocked' }).eq('id', connectionId)
    setBlocked(true); setShowMenu(false); showToast('Usuario bloqueado')
  }

  const handleReport = async () => {
    if (!reportReason.trim() || !myProfileId) return
    await supabase.from('reports').insert({
      reporter_profile_id: myProfileId, reported_profile_id: otherProfileId,
      connection_id: connectionId, reason: reportReason.trim(),
    })
    setReportSent(true)
    setTimeout(() => { setShowReportModal(false); setReportReason(''); setReportSent(false); showToast('Reporte enviado.') }, 1500)
  }

  const handleCheckout = async (priceId: string, planId: string) => {
    setLoadingCheckout(true)
    logPaywallEvent(myProfileId, 'checkout_started', { plan: planId })
    try {
      const res = await fetch(SUPABASE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ priceId, profileId: myProfileId }),
      })
      const data = await res.json()
      if (data.url) { logPaywallEvent(myProfileId, 'checkout_redirected', { plan: planId }); window.location.href = data.url }
      else { showToast('Error al crear el pago. Inténtalo de nuevo.') }
    } catch { showToast('Error de conexión. Inténtalo de nuevo.') }
    setLoadingCheckout(false)
  }

  const otherInitials = otherName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const daySections = buildDaySections(messages)

  const PROCESSING_STEPS = [
    { icon: '🔄', text: 'Conectando con el banco…' },
    { icon: '✅', text: 'Pago recibido correctamente' },
    { icon: '🔓', text: 'Activando tu cuenta…' },
    { icon: '🎉', text: '¡Todo listo!' },
  ]

  if (paymentProcessing) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-xl">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
            <span className="text-4xl animate-pulse">{PROCESSING_STEPS[Math.min(paymentStep, 3)].icon}</span>
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-6">Procesando tu pago</h3>
          <div className="space-y-3 text-left mb-6">
            {PROCESSING_STEPS.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${i <= paymentStep ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${i < paymentStep ? 'bg-emerald-100 text-emerald-600' : i === paymentStep ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-400'}`}>
                  {i < paymentStep ? '✓' : i === paymentStep ? <span className="animate-spin inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full" /> : '·'}
                </div>
                <p className={`text-sm ${i <= paymentStep ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-400">Esto suele tardar unos segundos. No cierres esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors">
              ←
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                  {otherInitials}
                </div>
                {!blocked && !blockedByOther && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-zinc-900 leading-tight">{otherName}</p>
                <p className={`text-xs leading-tight ${blocked || blockedByOther ? 'text-red-500' : otherTyping ? 'text-emerald-600 italic' : 'text-zinc-400'}`}>
                  {blocked || blockedByOther ? 'Chat bloqueado' : otherTyping ? 'Escribiendo…' : isPremium ? '💎 Pro' : 'Conectados'}
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors text-lg">
              ⋯
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-11 z-20 bg-white rounded-2xl border border-zinc-200 shadow-lg w-52 overflow-hidden">
                  {!blocked && !blockedByOther && (
                    <button onClick={handleBlock} className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors border-b border-zinc-100">
                      🚫 Bloquear usuario
                    </button>
                  )}
                  <button onClick={() => { setShowMenu(false); setShowReportModal(true) }} className="w-full px-4 py-3 text-left text-sm text-amber-600 hover:bg-amber-50 transition-colors">
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
          <p className="text-sm text-red-600 text-center max-w-lg mx-auto">🚫 Este chat ha sido bloqueado.</p>
        </div>
      )}

      {/* Free chat slots banner — only show for new conversations not yet started */}
      {!blocked && !blockedByOther && !loading && !isPremium && !hasStartedThisChat && remainingChats > 0 && (
        <div className={`border-b px-4 py-2 transition-colors ${isLow ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
          <p className={`text-xs text-center max-w-lg mx-auto font-medium ${isLow ? 'text-red-700' : 'text-amber-700'}`}>
            {isLow
              ? `⚠️ Solo te queda 1 chat gratis este mes — se renuevan el día 1`
              : `💬 Chat ${usedChats + 1} de ${FREE_CHAT_LIMIT} gratuitos este mes`
            }
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-3"/>
            <p className="text-zinc-400 text-sm">Cargando mensajes…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl">👋</div>
            <p className="text-zinc-700 font-semibold">¡Estáis conectados!</p>
            <p className="text-zinc-400 text-sm mt-1">Empieza la conversación con {otherName.split(' ')[0]}</p>
            {!isPremium && !hasStartedThisChat && (
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 inline-block px-3 py-1.5 rounded-full">
                Chat {usedChats + 1} de {FREE_CHAT_LIMIT} gratuitos este mes
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {daySections.map((section, si) => (
              <div key={si}>
                {/* Day separator */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-zinc-200" />
                  <span className="text-xs text-zinc-400 font-medium">{section.dayLabel}</span>
                  <div className="flex-1 h-px bg-zinc-200" />
                </div>

                {/* Message groups */}
                <div className="space-y-4">
                  {section.groups.map((group, gi) => {
                    const isMe = group.from_profile_id === myProfileId
                    return (
                      <div key={gi} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {/* Messages in group */}
                        <div className={`flex flex-col gap-0.5 max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                          {group.messages.map((msg, mi) => {
                            const isFirst = mi === 0
                            const isLast = mi === group.messages.length - 1
                            const bubbleClass = isMe
                              ? `bg-zinc-900 text-white ${isFirst && !isLast ? 'rounded-2xl rounded-br-sm' : isLast && !isFirst ? 'rounded-2xl rounded-tr-sm' : !isFirst && !isLast ? 'rounded-2xl rounded-r-sm' : 'rounded-2xl rounded-br-sm'}`
                              : `bg-white border border-zinc-200 text-zinc-900 ${isFirst && !isLast ? 'rounded-2xl rounded-bl-sm' : isLast && !isFirst ? 'rounded-2xl rounded-tl-sm' : !isFirst && !isLast ? 'rounded-2xl rounded-l-sm' : 'rounded-2xl rounded-bl-sm'}`
                            return (
                              <div key={msg.id} className={`px-4 py-2.5 ${bubbleClass}`}>
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                              </div>
                            )
                          })}
                        </div>
                        {/* Timestamp on last message of group */}
                        <p className="text-xs text-zinc-400 mt-1 px-1">
                          {formatTime(group.messages.at(-1)!.created_at)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {otherTyping && (
              <div className="flex items-start">
                <div className="bg-white border border-zinc-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%]">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-zinc-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-2">
          {blocked || blockedByOther ? (
            <p className="flex-1 text-center text-sm text-red-400 py-3">🚫 Chat bloqueado</p>
          ) : isOverLimit ? (
            <button
              onClick={() => { setShowPaywall(true); logPaywallEvent(myProfileId, 'paywall_hit_send') }}
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold rounded-2xl hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
            >
              🔓 Continuar la conversación →
            </button>
          ) : (
            <>
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); broadcastTyping() }}
                onKeyDown={handleKeyDown}
                placeholder={`Escribe a ${otherName.split(' ')[0]}…`}
                className="flex-1 px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="px-5 py-3 bg-zinc-900 text-white rounded-2xl font-medium text-sm hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {sending ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : '↑'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Paywall Modal ── */}
      {showPaywall && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-6 max-h-[92vh] overflow-y-auto animate-slide-up">

            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">💬</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900">
                Sigue la conversación
              </h3>
              <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                Has usado tus {FREE_CHAT_LIMIT} chats gratuitos de este mes.<br/>
                Desbloquea Pro para hablar con <span className="font-semibold text-zinc-800">{otherName.split(' ')[0]}</span> y con todos tus matches sin límite.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                +340 co-founders conectados este mes
              </div>
            </div>

            <div className="space-y-2.5 mb-5">
              {PLANS.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => handleCheckout(plan.priceId, plan.id)}
                  disabled={loadingCheckout}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md disabled:opacity-60 relative ${
                    plan.popular ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  {plan.popular && <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">⭐ Más popular</span>}
                  {plan.savings && <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500 text-white">{plan.savings}</span>}
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

            {loadingCheckout && (
              <div className="text-center py-2 mb-3">
                <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto"/>
                <p className="text-xs text-zinc-400 mt-2">Preparando pago seguro…</p>
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => { setShowPaywall(false); logPaywallEvent(myProfileId, 'paywall_dismissed') }}
                className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                Ahora no
              </button>
              <p className="text-xs text-zinc-300 mt-3">🔒 Pago seguro con Stripe · Reembolso garantizado si no estás satisfecho</p>
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
            <h3 className="text-2xl font-bold text-zinc-900 mb-2">¡Ya tienes chat ilimitado!</h3>
            <p className="text-zinc-500 leading-relaxed mb-8">
              Tu suscripción está activa. Ahora puedes chatear sin límites con {otherName.split(' ')[0]} y con todos tus matches.
            </p>
            <button onClick={() => { setShowUnlockedModal(false); loadMessages() }} className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700 transition-all">
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
                <p className="text-sm text-zinc-500 mb-4">Cuéntanos qué ha pasado.</p>
                <textarea
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  placeholder="Describe el problema…"
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-none mb-4"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowReportModal(false); setReportReason('') }} className="flex-1 py-3 text-sm border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50">
                    Cancelar
                  </button>
                  <button onClick={handleReport} disabled={!reportReason.trim()} className="flex-1 py-3 text-sm bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-40">
                    Enviar
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

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        @keyframes fade-in { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .animate-fade-in { animation: fade-in 0.25s ease-out; }
      `}</style>
    </div>
  )
}
