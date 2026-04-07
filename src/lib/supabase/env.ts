const fallbackSupabaseUrl = 'https://txswessunrkuvsexxjuu.supabase.co'
const fallbackSupabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4c3dlc3N1bnJrdXZzZXh4anV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTIzMTIsImV4cCI6MjA4NjQyODMxMn0.mk3fKCk5_h_6_1Ne84smgKeqGR4yjVWXmMVqKwsGwSM'

type PublicEnvName = 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

function getPublicEnv(name: PublicEnvName) {
  const value = process.env[name]?.trim()

  if (value) {
    return value
  }

  if (typeof window !== 'undefined') {
    console.warn(`Missing ${name} in runtime. Using the default public Supabase config.`)
  }

  return name === 'NEXT_PUBLIC_SUPABASE_URL'
    ? fallbackSupabaseUrl
    : fallbackSupabaseAnonKey
}

export const supabaseUrl = getPublicEnv('NEXT_PUBLIC_SUPABASE_URL')
export const supabaseAnonKey = getPublicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
