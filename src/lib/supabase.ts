import { createClient } from '@supabase/supabase-js';

function readPublicEnv(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

const supabaseUrl = readPublicEnv(
  import.meta.env.VITE_SUPABASE_URL,
  'https://your-supabase-project.supabase.co',
);

const supabaseAnonKey = readPublicEnv(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_development',
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'onemore_supabase_auth_token',
  },
});

export default supabase;
