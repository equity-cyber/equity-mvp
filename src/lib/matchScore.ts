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
    'Hacker+Hustler': [88, 95],
    'Hacker+Legal':   [82, 90],
    'Hacker+Money':   [72, 82],
    'Hustler+Money':  [82, 90],
    'Hustler+Legal':  [68, 78],
    'Legal+Money':    [75, 85],
    'Hacker+Hacker':  [42, 58],
    'Hustler+Hustler':[42, 58],
    'Legal+Legal':    [42, 58],
    'Money+Money':    [42, 58],
  }
  const range = scores[key] || [50, 65]
  return range[0] + Math.floor((range[1] - range[0]) * 0.6)
}

// Coincidencias concretas entre lo que YO busco y lo que el OTRO ofrece
function findSkillMatches(myProfile: MatchProfile, otherProfile: MatchProfile): string[] {
  const otherSkillLabels = otherProfile.skills.map(s => s.label)
  const otherSkillsLower = otherSkillLabels.map(s => s.toLowerCase())
  const otherBio = otherProfile.bio.toLowerCase()
  const matches: string[] = []

  for (const seek of myProfile.seeking) {
    const seekLower = seek.toLowerCase()
    // Match directo con skill
    const direct = otherSkillLabels.find(s => s.toLowerCase() === seekLower)
    if (direct) { matches.push(direct); continue }
    // Match parcial significativo
    const partial = otherSkillLabels.find((s, i) => {
      const sl = otherSkillsLower[i]
      return sl.length > 3 && (sl.includes(seekLower) || seekLower.includes(sl))
    })
    if (partial) { matches.push(partial); continue }
    // Mención en bio
    const words = seekLower.split(/\s+/).filter(w => w.length > 4)
    if (words.some(w => otherBio.includes(w))) {
      matches.push(seek)
    }
  }
  return Array.from(new Set(matches)).slice(0, 3)
}

function getSeekingBonus(matches: string[]): number {
  if (matches.length === 0) return 0
  if (matches.length === 1) return 6
  if (matches.length === 2) return 10
  return 12
}

function getLocationBonus(a: MatchProfile, b: MatchProfile): number {
  if (!a.location || !b.location) return 0
  const locA = a.location.toLowerCase().trim()
  const locB = b.location.toLowerCase().trim()
  if (locA === locB) return 5
  const spainCities = ['madrid', 'barcelona', 'málaga', 'malaga', 'sevilla', 'valencia', 'bilbao', 'marbella', 'españa', 'spain']
  const aInSpain = spainCities.some(c => locA.includes(c))
  const bInSpain = spainCities.some(c => locB.includes(c))
  if (aInSpain && bInSpain) return 3
  return 0
}

// Penalización por perfil incompleto del otro lado
function getCompletenessPenalty(p: MatchProfile): number {
  let penalty = 0
  if (!p.bio || p.bio.trim().length < 30) penalty += 25
  if (!p.skills || p.skills.length === 0) penalty += 15
  if (!p.seeking || p.seeking.length === 0) penalty += 10
  if (!p.full_name || p.full_name.trim().length < 3) penalty += 30
  return penalty
}

// Genera explicación personalizada usando datos reales del perfil
function generateExplanation(
  myProfile: MatchProfile,
  otherProfile: MatchProfile,
  matches: string[],
  locationBonus: number,
): string {
  const other = otherProfile.full_name.split(' ')[0] || 'Este fundador'
  const myType = myProfile.founder_type
  const otherType = otherProfile.founder_type

  // Perfil incompleto: explicación honesta
  if (!otherProfile.bio || otherProfile.bio.trim().length < 30) {
    return `${other} aún no ha completado su perfil — espera a que añada bio y experiencia para valorar el encaje.`
  }

  const parts: string[] = []

  // 1) Frase de complementariedad de tipos personalizada
  if (myType === otherType) {
    parts.push(`Ambos sois ${myType}, así que tendréis que repartir bien el liderazgo.`)
  } else {
    const combos: Record<string, string> = {
      'Hacker+Hustler': `${other} aporta ${otherType === 'Hustler' ? 'el músculo comercial' : 'la parte técnica'} que tu perfil ${myType} necesita`,
      'Hacker+Legal':   `${other} cubre ${otherType === 'Legal' ? 'la parte jurídica' : 'la ejecución técnica'} clave para escalar tu proyecto`,
      'Hacker+Money':   `${other} ${otherType === 'Money' ? 'puede aportar capital' : 'construye producto'} y eso encaja con lo que tú ofreces`,
      'Hustler+Money':  `${other} ${otherType === 'Money' ? 'aporta capital y red' : 'sabe vender y abrir mercado'}, complementa tu perfil`,
      'Hustler+Legal':  `${other} ${otherType === 'Legal' ? 'da cobertura legal' : 'tiene canal comercial'}, dos pilares que se refuerzan`,
      'Legal+Money':    `${other} ${otherType === 'Money' ? 'pone el capital' : 'aporta seguridad jurídica'}, base sólida para invertir con confianza`,
    }
    const key = [myType, otherType].sort().join('+')
    parts.push((combos[key] || `${other} tiene un perfil complementario al tuyo`) + '.')
  }

  // 2) Coincidencias concretas con lo que buscas
  if (matches.length > 0) {
    const list = matches.length === 1
      ? matches[0]
      : matches.slice(0, -1).join(', ') + ' y ' + matches[matches.length - 1]
    parts.push(`Coincide con lo que buscas: ${list}.`)
  }

  // 3) Localización si aplica
  if (locationBonus >= 5 && otherProfile.location) {
    parts.push(`Ambos en ${otherProfile.location}.`)
  } else if (locationBonus === 3) {
    parts.push(`Los dos operáis en España.`)
  }

  return parts.join(' ')
}

export function calculateMatchScore(myProfile: MatchProfile, otherProfile: MatchProfile): MatchResult {
  const typeScore = getTypeScore(myProfile.founder_type, otherProfile.founder_type)
  const matches = findSkillMatches(myProfile, otherProfile)
  const seekingBonus = getSeekingBonus(matches)
  const locationBonus = getLocationBonus(myProfile, otherProfile)
  const penalty = getCompletenessPenalty(otherProfile)

  const rawScore = Math.max(20, Math.min(99, typeScore + seekingBonus + locationBonus - penalty))

  const score_hhm = Math.max(20, Math.min(99, typeScore - Math.floor(penalty * 0.5)))
  const score_skills = Math.max(15, Math.min(99, 55 + seekingBonus + Math.floor(typeScore * 0.3) - Math.floor(penalty * 0.6)))
  const score_vision = Math.max(15, Math.min(99, 50 + locationBonus + Math.floor(typeScore * 0.25) - Math.floor(penalty * 0.4)))

  const explanation = generateExplanation(myProfile, otherProfile, matches, locationBonus)

  return {
    score: rawScore,
    score_hhm,
    score_skills,
    score_vision,
    explanation,
  }
}
