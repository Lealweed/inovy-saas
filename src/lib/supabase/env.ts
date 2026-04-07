function getRequiredEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name]

  if (!value) {
    throw new Error(
      `Missing Supabase environment variable: ${name}. Set it locally and in Vercel.`
    )
  }

  return value
}

export const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
export const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
