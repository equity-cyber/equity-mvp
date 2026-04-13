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
  otherName: string
  onBack: () => void
}

export function ChatScreen({ connectionId, myProfileId, otherName, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('connection_id', connectionId)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
    setLoading(false)
  }

  useEffect(() => {
    loadMessages()

    // Poll for new messages every 3 seconds
    const interval = setInterval(loadMessages, 3000)
    return () => clearInterval(interval)
  }, [connectionId])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !myProfileId || sending) return
    setSending(true)

    const { error } = await supabase.from('messages').insert({
      connection_id: connectionId,
      from_profile_id: myProfileId,
      to_profile_id: '', // We don't strictly need this for display
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
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
              <p className="text-xs text-emerald-600">Conectados</p>
            </div>
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
        </div>
      </div>
    </div>
  )
}
