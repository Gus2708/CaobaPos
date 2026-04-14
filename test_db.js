const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: c, error: e1 } = await supabase.from('clients').select('*');
  console.log('CLIENTS:', c);
  const { data: s, error: e2 } = await supabase.from('sales').select('*').eq('client_id', c?.[0]?.id || 'never');
  console.log('SALES FOR CLIENT 0:', s);
  const { data: b, error: e3 } = await supabase.from('client_balances').select('*');
  console.log('BALANCES:', b);
}
run();
