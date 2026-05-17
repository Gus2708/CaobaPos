import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
let rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// 1. Self-healing parser for Supabase URL (resolves copy-paste duplication typos in Vercel)
let supabaseUrl = rawUrl.trim();
if (supabaseUrl) {
  const firstSupabaseIndex = supabaseUrl.indexOf('.supabase.co');
  if (firstSupabaseIndex !== -1) {
    // Cut the URL exactly after ".supabase.co" (length of ".supabase.co" is 12)
    supabaseUrl = supabaseUrl.substring(0, firstSupabaseIndex + 12);
  }
}

// 2. Self-healing parser for Anon Key (resolves copy-paste duplication typos in Vercel)
let supabaseAnonKey = rawKey.trim();
if (supabaseAnonKey && supabaseAnonKey.length > 300) {
  const secondStart = supabaseAnonKey.indexOf('eyJhbGci', 10);
  if (secondStart !== -1) {
    supabaseAnonKey = supabaseAnonKey.substring(0, secondStart);
  }
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Usamos valores falsos si las variables no existen para evitar que el motor de JS haga un "crash" inmediato
export const supabase = createClient(
  supabaseUrl || 'https://missing.supabase.co',
  supabaseAnonKey || 'missing-key'
);

