const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  console.log('Querying categories...');
  const { data: cats, error: err1 } = await supabase.from('categories').select('*');
  console.log('Categories:', cats, 'Error:', err1);

  console.log('Querying products...');
  const { data: prods, error: err2 } = await supabase
    .from('products')
    .select('*, product_categories(categories(name))')
    .eq('is_active', true)
    .order('name');
  console.log('Products count:', prods?.length, 'Error:', err2);
}

run();
