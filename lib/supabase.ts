import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Usamos valores falsos si las variables no existen para evitar que el motor de JS haga un "crash" inmediato
export const supabase = createClient(
  supabaseUrl || 'https://missing.supabase.co',
  supabaseAnonKey || 'missing-key'
);
