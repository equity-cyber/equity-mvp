import React from 'react'
import { MockProfile } from '../data/mockProfiles'

const TYPE_COLORS = {
  Hacker:  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Hustler: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Money:   { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Legal:   { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

function ScoreRing({ score }) {
  const percentage = Math.min(Math.max(score, 0), 100)
  const color = percentage >= 85 ? '#10b981' : percentage >= 70 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="22" fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="25" cy="25" r="22" fill="none" stroke={color} strokeWidth="4" 
          strokeDasharray={`${percentage * 1.38} 138`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{percentage}</span>
      </div>
    </div>
  )
}

export function ProfileCard({ profile: p, onOpen, onPass }) {
  const typeStyle = TYPE_COLORS[p.founder_type] || TYPE_COLORS.Hacker

  return (
    <div 
      className="bg-white rounded-3xl border border-zinc-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
      onClick={() => onOpen(p)}
    >
      <div className="p-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${typeStyle.bg} ${typeStyle.text}`}>
            {p.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-xl text-zinc-900">{p.full_name}</h3>
            <p className="text-sm text-zinc-500">{p.role} · {p.location}</p>
            <span className={`inline-block mt-2 px-4 py-1 text-xs font-medium rounded-full border ${typeStyle.border} ${typeStyle.text}`}>
              {p.founder_type}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <ScoreRing score={p.pow_score} />
          <span className="text-xs text-zinc-400 mt-1">MATCH</span>
        </div>
      </div>

      <div className="mx-6 border-t border-zinc-100 pt-5 pb-4">
        <p className="uppercase text-xs font-semibold text-zinc-400 tracking-widest mb-3">Prueba de trabajo</p>
        <div className="flex gap-4 bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
          <div className="px-3.5 py-1 bg-white text-xs font-medium border rounded-xl self-start">Stripe</div>
          <div>
            <p className="font-medium text-zinc-900">{p.top_pow}</p>
            <p className="text-sm text-zinc-500 mt-1">{p.top_pow_metric}</p>
          </div>
        </div>
      </div>

      <div className="mx-6 mb-6 bg-zinc-50 rounded-2xl p-5 border border-zinc-100">
        <p className="uppercase text-xs font-semibold text-zinc-400 tracking-widest mb-2">Por qué la IA os sugiere</p>
        <p className="text-sm text-zinc-600 leading-relaxed line-clamp-3">
          {p.ai_explain}
        </p>
      </div>

      <div className="flex gap-3 px-6 pb-6" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onPass(p.id)}
          className="flex-1 py-3.5 text-sm font-medium border border-zinc-200 rounded-2xl hover:bg-zinc-50"
        >
          Pasar
        </button>
        <button
          onClick={() => onOpen(p)}
          className="flex-1 py-3.5 bg-zinc-900 text-white text-sm font-semibold rounded-2xl hover:bg-black"
        >
          Ver perfil
        </button>
      </div>
    </div>
  )
}