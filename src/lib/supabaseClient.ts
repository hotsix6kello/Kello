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
  // 콘솔 에러에서 만료된 세션 경고 숨김 처리 (불필요한 AuthApiError 로깅 억제)
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const msg = typeof args[0] === 'string' ? args[0] : args[0]?.message;
    if (msg && (msg.includes('Invalid Refresh Token') || msg.includes('Refresh Token Not Found'))) {
      return;
    }
    originalConsoleError(...args);
  };

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
      console.warn('[Supabase] Invalid session detected, clearing locally.')
      // scope: 'local'을 추가해 불필요한 서버 호출 없이 로컬 세션 정보만 안전하게 지움
      supabase.auth.signOut({ scope: 'local' })
      localStorage.removeItem('user')
    }
  })
}
