import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Automatically clean up invalid/expired sessions
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

// Handle invalid refresh token errors globally — clear stale session silently
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') return
    if (event === 'SIGNED_OUT' || (!session && event === 'INITIAL_SESSION')) {
      // Clear any stale localStorage user data so the UI resets cleanly
      // (Don't redirect — just clean up silently)
    }
  })

  // Listen for auth errors and clear corrupted session data
  supabase.auth.getSession().then(({ error }) => {
    if (error?.message?.includes('Refresh Token Not Found') ||
      error?.message?.includes('Invalid Refresh Token')) {
      console.warn('[Supabase] Invalid session detected, clearing...')
      supabase.auth.signOut()
      localStorage.removeItem('user')
    }
  })
}
