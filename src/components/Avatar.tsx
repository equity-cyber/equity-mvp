import React from 'react'
import { FounderType } from '../data/mockProfiles'

const TYPE_COLORS: Record<FounderType, string> = {
  Hacker:  'bg-blue-100 text-blue-700',
  Hustler: 'bg-emerald-100 text-emerald-700',
  Money:   'bg-amber-100 text-amber-700',
  Legal:   'bg-rose-100 text-rose-700',
}

interface Props {
  name: string
  founderType: FounderType
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ name, founderType, avatarUrl, size = 'md' }: Props) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colorClass = TYPE_COLORS[founderType] || TYPE_COLORS.Hacker

  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-xl',
    lg: 'w-20 h-20 text-3xl',
  }

  const roundedClasses = {
    sm: 'rounded-full',
    md: 'rounded-2xl',
    lg: 'rounded-3xl',
  }

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses[size]} ${roundedClasses[size]} object-cover flex-shrink-0`}
      />
    )
  }

  return (
    <div className={`${sizeClasses[size]} ${roundedClasses[size]} flex items-center justify-center font-bold flex-shrink-0 ${colorClass}`}>
      {initials}
    </div>
  )
}
