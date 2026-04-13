import { FounderType } from '../data/mockProfiles'

interface MatchProfile {
  founder_type: FounderType
  full_name: string
  bio: string
  skills: { label: string; cat: string }[]
  seeking: string[]
  location?: string
  role?: string
}

interface MatchResult {
  score: number
  score_hhm: number
  score_skills: number
  score_vision: number
  explanation: string
}

// Complementariedad de tipos base
function getTypeScore(a: FounderType, b: FounderType): number {
  const key = [a, b].sort().join('+')
  const scores: Record<string, [number, number]> = {
    'Hacker+Hustler': [92, 97],
    'Hacker+Legal':   [88, 94],
    'Hacker+Money':   [75, 85],
    'Hustler+Money':  [85, 92],
    'Hustler+Legal':  [70, 80],
    'Legal+Money':    [78, 88],
    'Hacker+Hacker':  [45, 60],
    'Hustler+Hustler':[45, 60],
    'Legal+Legal':    [45, 60],
    'Money+Money':    [45, 60],
  }
  const range = scores[key] || [50, 65]
  // Deterministic "random" based on names to keep it stable
  return range[0] + Math.floor((range[1] - range[0]) * 0.6)
}

// Check if seeking matches what the other offers
function getSeekingBonus(myProfile: MatchProfile, otherProfile: MatchProfile): number {
  const otherSkills = otherProfile.skills.map(s => s.label.toLowerCase()).join(' ')
  const otherBio = otherProfile.bio.toLowerCase()
  const otherType = otherProfile.founder_type.toLowerCase()
  const combined = `${otherSkills} ${otherBio} ${otherType}`

  let bonus = 0
  for (const seek of myProfile.seeking) {
    const words = seek.toLowerCase().split(/\s+/)
    for (const word of words) {
      if (word.length > 3 && combined.includes(word)) {
        bonus = 8
        break
      }
    }
    if (bonus > 0) break
  }
  return bonus
}

// Location bonus
function getLocationBonus(a: MatchProfile, b: MatchProfile): number {
  if (!a.location || !b.location) return 0
  const locA = a.location.toLowerCase().trim()
  const locB = b.location.toLowerCase().trim()
  if (locA === locB) return 5
  // Check if same country (both in Spain-related cities)
  const spainCities = ['madrid', 'barcelona', 'málaga', 'malaga', 'sevilla', 'valencia', 'bilbao', 'marbella', 'españa', 'spain']
  const aInSpain = spainCities.some(c => locA.includes(c))
  const bInSpain = spainCities.some(c => locB.includes(c))
  if (aInSpain && bInSpain) return 3
  return 0
}

// Legal context bonus
function getLegalBonus(a: MatchProfile, b: MatchProfile): number {
  const legalKeywords = ['contrato', 'contratos', 'legal', 'regulación', 'regulacion', 'inversión', 'inversion', 'compliance', 'fintech', 'legal tech', 'legaltech']

  const check = (legal: MatchProfile, other: MatchProfile): boolean => {
    if (legal.founder_type !== 'Legal') return false
    const otherText = `${other.bio} ${other.skills.map(s => s.label).join(' ')} ${other.seeking.join(' ')}`.toLowerCase()
    return legalKeywords.some(kw => otherText.includes(kw))
  }

  if (check(a, b) || check(b, a)) return 7
  return 0
}

// Generate natural explanation
function generateExplanation(myProfile: MatchProfile, otherProfile: MatchProfile, typeScore: number): string {
  const other = otherProfile.full_name.split(' ')[0]
  const myType = myProfile.founder_type
  const otherType = otherProfile.founder_type

  // Same type
  if (myType === otherType) {
    return `Ambos sois ${myType} — hay overlap de rol, pero podéis complementaros en habilidades concretas si definís bien quién lidera qué.`
  }

  const explanations: Record<string, string[]> = {
    'Hacker+Hustler': [
      `${other} construye producto y tú lo vendes — la combinación clásica de co-founders que funciona.`,
      `Complementariedad directa: ${other} aporta la parte técnica que tú necesitas para escalar.`,
    ],
    'Hacker+Legal': [
      `${other} tiene el producto y necesita cobertura legal — encaje directo con tu perfil.`,
      `Un Hacker con tracción real + un perfil Legal es una combinación muy sólida para escalar con seguridad.`,
    ],
    'Hacker+Money': [
      `${other} construye y tú financias — buena base si el producto tiene tracción.`,
      `Capital + producto técnico es una combinación potente si hay alineación de visión.`,
    ],
    'Hustler+Money': [
      `${other} sabe vender y tú pones el capital — juntos podéis acelerar rápido.`,
      `Red comercial + financiación es una combinación que abre puertas grandes desde el día 1.`,
    ],
    'Hustler+Legal': [
      `${other} tiene el canal comercial y tú la cobertura legal — complementariedad clara.`,
      `Un Hustler con red + un perfil Legal cubre dos de los pilares más importantes para escalar.`,
    ],
    'Legal+Money': [
      `${other} aporta capital y tú la seguridad jurídica — base sólida para invertir con confianza.`,
      `Capital + cobertura legal es la combinación que da confianza a todos los stakeholders.`,
    ],
  }

  const key = [myType, otherType].sort().join('+')
  const options = explanations[key] || [`${other} y tú tenéis perfiles complementarios que podrían generar sinergias interesantes.`]
  return options[0]
}

export function calculateMatchScore(myProfile: MatchProfile, otherProfile: MatchProfile): MatchResult {
  const typeScore = getTypeScore(myProfile.founder_type, otherProfile.founder_type)
  const seekingBonus = getSeekingBonus(myProfile, otherProfile)
  const locationBonus = getLocationBonus(myProfile, otherProfile)
  const legalBonus = getLegalBonus(myProfile, otherProfile)

  const rawScore = Math.min(99, typeScore + seekingBonus + locationBonus + legalBonus)

  // Break down into sub-scores
  const score_hhm = Math.min(99, typeScore + legalBonus)
  const score_skills = Math.min(99, 55 + seekingBonus + Math.floor(typeScore * 0.3))
  const score_vision = Math.min(99, 50 + locationBonus + Math.floor(typeScore * 0.25))

  const explanation = generateExplanation(myProfile, otherProfile, typeScore)

  return {
    score: rawScore,
    score_hhm,
    score_skills,
    score_vision,
    explanation,
  }
}
