import React from 'react'
import { MockProfile } from '../data/mockProfiles'
import { Avatar } from './Avatar'

function ScoreRing({ score }: { score: number }) {
  const percentage = Math.min(Math.max(score, 0), 100)
  const color = percentage >= 85 ? '#10b981' : percentage >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-14 h-14">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="22" fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle cx="25" cy="25" r="22" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${percentage * 1.38} 138`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{percentage}</span>
      </div>
    </div>
  )
}

function TrustBadges({ ext }: { ext: any }) {
  const githubVerified = !!ext.github_verified
  const hasGithub = !!ext.github_username
  const hasLinkedin = !!ext.linkedin_url

  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {githubVerified ? (
        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-600 text-white">
          ✓ GitHub
        </span>
      ) : hasGithub ? (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-300 text-zinc-600">
          🐙 GitHub
        </span>
      ) : null}
      {hasLinkedin && (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600 text-white">
          💼 LinkedIn
        </span>
      )}
    </div>
  )
}

const SOURCE_LABEL: Record<string, string> = {
  stripe: 'Stripe',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  doc: 'Propio',
}

interface Props {
  profile: MockProfile
  matchScore: number
  matchExplanation: string
  onOpen: (p: MockProfile) => void
  onPass: (id: string) => void
}

export function ProfileCard({ profile: p, matchScore, matchExplanation, onOpen, onPass }: Props) {
  const ext = p as any
  const githubVerified = !!ext.github_verified
  const hasGithub = !!ext.github_username
  const hasLinkedin = !!ext.linkedin_url

  // Trust signal: count verifications
  const trustLevel = [githubVerified, hasLinkedin].filter(Boolean).length
  const hasTrust = githubVerified || hasLinkedin || hasGithub

  return (
    <div
      className="bg-white rounded-3xl border border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={() => onOpen(p)}
    >
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar
            name={p.full_name}
            founderType={p.founder_type}
            avatarUrl={ext.avatar_url}
            size="md"
          />
          <div className="min-w-0">
            <h3 className="font-bold text-lg text-zinc-900 leading-tight truncate">{p.full_name}</h3>
            <p className="text-sm text-zinc-500 truncate">{p.role} · {p.location}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="px-3 py-0.5 text-xs font-medium rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600">
                {p.founder_type}
              </span>
              {githubVerified ? (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-600 text-white">✓ GitHub</span>
              ) : hasGithub ? (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-zinc-300 text-zinc-600">🐙 GitHub</span>
              ) : null}
              {hasLinkedin && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-600 text-white">💼 LinkedIn</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <ScoreRing score={matchScore} />
          <span className="text-xs text-zinc-400 mt-1 font-medium tracking-wide">MATCH</span>
        </div>
      </div>

      {/* Proof of Work */}
      <div className="mx-5 border-t border-zinc-100 pt-4 pb-3">
        <p className="uppercase text-xs font-semibold text-zinc-400 tracking-widest mb-2.5">Prueba de trabajo</p>
        <div className="flex gap-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
          <div className="px-2.5 py-1 bg-white text-xs font-semibold border border-zinc-200 rounded-lg self-start text-zinc-600 shrink-0">
            {SOURCE_LABEL[p.top_pow_source] ?? 'Doc'}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 leading-snug">{p.top_pow}</p>
            <p className="text-sm text-zinc-500 mt-0.5 leading-snug">{p.top_pow_metric}</p>
          </div>
        </div>
      </div>

      {/* Match explanation */}
      <div className="mx-5 mb-5 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
        <p className="uppercase text-xs font-semibold text-zinc-400 tracking-widest mb-1.5">Por qué la IA os sugiere</p>
        <p className="text-sm text-zinc-600 leading-relaxed line-clamp-2">
          {matchExplanation}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-5 pb-5" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onPass(p.id)}
          className="flex-1 py-3 text-sm font-medium border border-zinc-200 rounded-2xl text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Pasar
        </button>
        <button
          onClick={() => onOpen(p)}
          className="flex-1 py-3 bg-zinc-900 text-white text-sm font-semibold rounded-2xl hover:bg-black transition-colors"
        >
          Ver perfil →
        </button>
      </div>
    </div>
  )
}
