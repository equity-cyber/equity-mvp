import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Message {
  id: string
  from_profile_id: string
  content: string
  created_at: string
}

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
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)
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

  // Check if blocked
  useEffect(() => {
    supabase
      .from('connections')
      .select('status')
      .eq('id', connectionId)
      .single()
      .then(({ data }) => {
        if (data?.status === 'blocked') setBlocked(true)
      })
  }, [connectionId])

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [connectionId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !myProfileId || sending || blocked) return
    setSending(true)

    const { error } = await supabase.from('messages').insert({
      connection_id: connectionId,
      from_profile_id: myProfileId,
      to_profile_id: otherProfileId,
      content: input.trim(),
    })

    if (!error) {
      setInput('')
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
                <p className="text-xs text-emerald-600">{blocked ? 'Bloqueado' : 'Conectados'}</p>
              </div>
            </div>
          </div>

          {/* Menu button */}
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
                  {!blocked && (
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
          {blocked ? (
            <p className="flex-1 text-center text-sm text-zinc-400 py-3">
              Este usuario está bloqueado
            </p>
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
