import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tyruvbavwbirlwsydfjj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnV2YmF2d2Jpcmx3c3lkZmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDY4MTcsImV4cCI6MjA5MTI4MjgxN30.Q8d47jDe4tX2ae8tYIfx3g0w-pEvGZ8LIwsLqfDJBhc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);