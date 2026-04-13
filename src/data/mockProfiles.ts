export type FounderType = 'Hacker' | 'Hustler' | 'Money' | 'Legal'

export interface MockProfile {
  id: string
  full_name: string
  founder_type: FounderType
  role: string
  location: string
  bio: string
  pow_score: number
  // Top PoW visible en la tarjeta
  top_pow: string
  top_pow_metric: string
  top_pow_source: 'github' | 'stripe' | 'linkedin' | 'doc'
  // Score breakdown
  score_hhm: number
  score_skills: number
  score_vision: number
  // Skills
  skills: { label: string; cat: 'tech' | 'biz' | 'money' | 'legal' | 'design' }[]
  // Busca en un socio
  seeking: string[]
  // Explicación de la IA
  ai_explain: string
  // Stats extra para el detalle
  github_repos?: number
  github_stars?: number
  github_commits?: number
  stripe_mrr?: number
  stripe_customers?: number
  // Colores del avatar
  avatar_bg: string
  avatar_text: string
}

export const MOCK_PROFILES: MockProfile[] = [
  {
    id: 'luis-m',
    full_name: 'Luis M.',
    founder_type: 'Hacker',
    role: 'Dev fullstack',
    location: 'Madrid',
    bio: 'Llevo 4 años construyendo SaaS B2B. Me apasionan los productos que resuelven problemas reales de empresas pequeñas. Busco alguien que sepa vender lo que yo construyo.',
    pow_score: 91,
    top_pow: 'SaaS B2B · 340 clientes activos',
    top_pow_metric: '1.847 € MRR verificado vía Stripe',
    top_pow_source: 'stripe',
    score_hhm: 95,
    score_skills: 88,
    score_vision: 90,
    skills: [
      { label: 'React / Node', cat: 'tech' },
      { label: 'PostgreSQL', cat: 'tech' },
      { label: 'SaaS B2B', cat: 'biz' },
      { label: 'APIs REST', cat: 'tech' },
    ],
    seeking: ['Legal / Contratos', 'Ventas B2B', 'Red inversores'],
    ai_explain: 'Tiene producto en producción con MRR real. Le falta la cobertura legal y el canal institucional. Complementariedad máxima con un perfil Legal/Hustler.',
    github_repos: 23,
    github_stars: 1284,
    github_commits: 147,
    stripe_mrr: 1847,
    stripe_customers: 340,
    avatar_bg: 'bg-blue-100',
    avatar_text: 'text-blue-800',
  },
  {
    id: 'amir-k',
    full_name: 'Amir K.',
    founder_type: 'Money',
    role: 'Angel investor',
    location: 'Dubai',
    bio: 'Dos exits en proptech MENA. Busco proyectos en España con potencial de escalar a mercados del Golfo. Capital disponible desde 30k€ para el co-founder adecuado.',
    pow_score: 88,
    top_pow: '2 exits en proptech · portfolio verificado',
    top_pow_metric: '7 startups activas en cartera',
    top_pow_source: 'linkedin',
    score_hhm: 80,
    score_skills: 82,
    score_vision: 88,
    skills: [
      { label: 'Capital 30k€+', cat: 'money' },
      { label: 'Real estate', cat: 'biz' },
      { label: 'MENA network', cat: 'biz' },
      { label: 'Due diligence', cat: 'money' },
    ],
    seeking: ['Legal internacional', 'Dev fullstack', 'Gestión operativa España'],
    ai_explain: 'Capital y red en Golfo Pérsico. Busca co-fundador con perfil jurídico para proptech española dirigida a inversores MENA. Encaje directo.',
    avatar_bg: 'bg-orange-100',
    avatar_text: 'text-orange-800',
  },
  {
    id: 'mei-l',
    full_name: 'Mei L.',
    founder_type: 'Hacker',
    role: 'Product designer',
    location: 'Valencia',
    bio: 'Diseñadora de producto con 10k usuarios activos en mi app de finanzas. Sé construir interfaces que la gente usa de verdad. Necesito backend y alguien que abra puertas.',
    pow_score: 79,
    top_pow: 'App finanzas · 10k DAU activos',
    top_pow_metric: 'Design system top en Figma Community',
    top_pow_source: 'doc',
    score_hhm: 80,
    score_skills: 74,
    score_vision: 78,
    skills: [
      { label: 'UX / UI', cat: 'design' },
      { label: 'Figma', cat: 'design' },
      { label: 'React (básico)', cat: 'tech' },
      { label: '10k DAU', cat: 'biz' },
    ],
    seeking: ['Dev backend senior', 'Capital pre-seed', 'Ventas B2C'],
    ai_explain: 'Diseño impecable y tracción real de usuarios. Necesita backend sólido y red de inversores. Perfil Legal puede resolver el go-to-market regulatorio en fintech.',
    github_repos: 8,
    github_stars: 312,
    github_commits: 64,
    avatar_bg: 'bg-purple-100',
    avatar_text: 'text-purple-800',
  },
  {
    id: 'sara-p',
    full_name: 'Sara P.',
    founder_type: 'Hustler',
    role: 'Growth hacker',
    location: 'Barcelona',
    bio: 'He llevado tres proyectos de 0 a tracción real usando growth orgánico. ROAS promedio de +8x en campañas documentadas. Busco un proyecto técnico sólido donde aplicar lo que sé.',
    pow_score: 74,
    top_pow: '0 → 50k usuarios orgánicos',
    top_pow_metric: '3 campañas ROAS +8x documentadas',
    top_pow_source: 'doc',
    score_hhm: 65,
    score_skills: 71,
    score_vision: 55,
    skills: [
      { label: 'SEO / SEM', cat: 'biz' },
      { label: 'Paid social', cat: 'biz' },
      { label: 'Growth loops', cat: 'biz' },
      { label: 'Email mkt', cat: 'biz' },
    ],
    seeking: ['Producto técnico', 'Capital pre-seed', 'Co-CEO técnico'],
    ai_explain: 'Perfil Hustler como el tuyo — hay overlap de rol. Buena complementariedad en habilidades concretas, pero requiere definir bien quién lidera qué antes de avanzar.',
    avatar_bg: 'bg-teal-100',
    avatar_text: 'text-teal-800',
  },
  {
    id: 'marco-v',
    full_name: 'Marco V.',
    founder_type: 'Hacker',
    role: 'ML Engineer',
    location: 'Barcelona',
    bio: 'Especialista en modelos de lenguaje y sistemas de recomendación. Trabajo en un proyecto de IA para legal tech que necesita un abogado co-fundador para validar el producto con clientes reales.',
    pow_score: 85,
    top_pow: 'Pipeline RAG en producción · 3 clientes B2B',
    top_pow_metric: '2.1k GitHub stars en librería open-source',
    top_pow_source: 'github',
    score_hhm: 95,
    score_skills: 85,
    score_vision: 92,
    skills: [
      { label: 'Python / ML', cat: 'tech' },
      { label: 'LLMs / RAG', cat: 'tech' },
      { label: 'Legal tech', cat: 'biz' },
      { label: 'APIs', cat: 'tech' },
    ],
    seeking: ['Abogado co-fundador', 'Red de despachos', 'Ventas B2B legal'],
    ai_explain: 'Construye IA para el sector legal y necesita exactamente un abogado que valide el producto y abra puertas con despachos. Match directo con tu perfil.',
    github_repos: 31,
    github_stars: 2100,
    github_commits: 203,
    avatar_bg: 'bg-indigo-100',
    avatar_text: 'text-indigo-800',
  },
  {
    id: 'nadia-r',
    full_name: 'Nadia R.',
    founder_type: 'Money',
    role: 'Family office',
    location: 'Málaga',
    bio: 'Gestiono capital familiar con ticket de 50-200k€ en startups early-stage. Especialmente interesada en legal tech y proptech en España. Busco co-founder operativo para co-invertir.',
    pow_score: 82,
    top_pow: 'Family office · 5 inversiones activas en España',
    top_pow_metric: 'Ticket promedio: 80k€ · 2 exits parciales',
    top_pow_source: 'doc',
    score_hhm: 80,
    score_skills: 79,
    score_vision: 85,
    skills: [
      { label: 'Capital 50-200k€', cat: 'money' },
      { label: 'Legal tech', cat: 'biz' },
      { label: 'Proptech', cat: 'biz' },
      { label: 'Networking Málaga', cat: 'biz' },
    ],
    seeking: ['Abogado gestor', 'Dev fullstack', 'Operaciones'],
    ai_explain: 'Capital disponible en tu ciudad, sector legal tech y proptech. Misma zona geográfica. De los matches con mejor alineación de visión del feed.',
    avatar_bg: 'bg-rose-100',
    avatar_text: 'text-rose-800',
  },
  {
    id: 'pablo-c',
    full_name: 'Pablo C.',
    founder_type: 'Hustler',
    role: 'Sales & BD',
    location: 'Sevilla',
    bio: 'Ex-director comercial en SaaS B2B. He cerrado contratos con empresas del Ibex 35. Quiero montar algo propio con un técnico sólido. Aporto red de C-levels y experiencia en ciclos de venta largos.',
    pow_score: 77,
    top_pow: 'Cerró contratos con 4 empresas del Ibex 35',
    top_pow_metric: 'Ex-Director Comercial · verificado en LinkedIn',
    top_pow_source: 'linkedin',
    score_hhm: 65,
    score_skills: 80,
    score_vision: 70,
    skills: [
      { label: 'Enterprise sales', cat: 'biz' },
      { label: 'B2B SaaS', cat: 'biz' },
      { label: 'Negociación', cat: 'biz' },
      { label: 'C-level network', cat: 'biz' },
    ],
    seeking: ['CTO / Dev senior', 'Producto tech', 'Co-fundador técnico'],
    ai_explain: 'Perfil comercial muy sólido con red enterprise real. Complementa bien si el proyecto necesita abrir puertas grandes desde el día 1. Overlap parcial en el eje Hustler.',
    avatar_bg: 'bg-amber-100',
    avatar_text: 'text-amber-800',
  },
  {
    id: 'chen-w',
    full_name: 'Chen W.',
    founder_type: 'Hacker',
    role: 'Backend engineer',
    location: 'Madrid',
    bio: 'Arquitecto de sistemas distribuidos con experiencia en fintech regulado. He construido plataformas que procesan 10M€/día. Quiero co-fundar algo en el espacio legal-financial.',
    pow_score: 88,
    top_pow: 'Plataforma fintech · 10M€/día procesados',
    top_pow_metric: '4 años en producción sin downtime mayor',
    top_pow_source: 'doc',
    score_hhm: 95,
    score_skills: 90,
    score_vision: 88,
    skills: [
      { label: 'Go / Rust', cat: 'tech' },
      { label: 'Sistemas distribuidos', cat: 'tech' },
      { label: 'Fintech regulado', cat: 'biz' },
      { label: 'Infraestructura', cat: 'tech' },
    ],
    seeking: ['Abogado fintech / legal', 'Producto y ventas', 'Capital semilla'],
    ai_explain: 'Experiencia técnica en fintech regulado + búsqueda explícita de perfil legal-financial. Proyecto potencial muy alineado con tu especialización.',
    github_repos: 18,
    github_stars: 890,
    github_commits: 189,
    avatar_bg: 'bg-green-100',
    avatar_text: 'text-green-800',
  },
]
