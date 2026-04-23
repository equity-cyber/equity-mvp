/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_FUNCTION_URL?: string
  readonly VITE_STRIPE_PRICE_SINGLE?: string
  readonly VITE_STRIPE_PRICE_PACK3?: string
  readonly VITE_STRIPE_PRICE_MONTHLY?: string
  readonly VITE_STRIPE_PRICE_YEARLY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
