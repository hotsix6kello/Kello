
import { getSupabaseServerClient, hasSupabaseServerAccess, getMissingSupabaseServerEnvVars } from './src/lib/supabaseServer.ts';

async function verify() {
  console.log('--- Supabase Server Ready Check ---');
  const hasAccess = hasSupabaseServerAccess();
  console.log('Has Access:', hasAccess);
  
  if (!hasAccess) {
    console.error('Missing Env Vars:', getMissingSupabaseServerEnvVars());
    return;
  }
  
  try {
    const client = getSupabaseServerClient();
    console.log('Supabase Client Initialized Successfully.');
    
    // Test a simple query to see if it actually communicates
    const { data, error } = await client.from('beauty_booking_requests').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Database Connection Error:', error.message);
    } else {
      console.log('Database Connection Success. Row count:', data);
    }
  } catch (err) {
    console.error('Initialization Failed:', err.message);
  }
}

verify();
