const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  try {
    console.log('Querying sales table...');
    const { data: sales, error: e1 } = await supabase.from('sales').select('*').limit(1);
    if (e1) console.error('Error fetching sales:', e1);
    else console.log('Sales row keys:', sales.length > 0 ? Object.keys(sales[0]) : 'No rows found');

    console.log('Querying sale_items table...');
    const { data: saleItems, error: e2 } = await supabase.from('sale_items').select('*').limit(1);
    if (e2) console.error('Error fetching sale_items:', e2);
    else console.log('Sale items row keys:', saleItems.length > 0 ? Object.keys(saleItems[0]) : 'No rows found');

    console.log('Querying products table...');
    const { data: products, error: e3 } = await supabase.from('products').select('*').limit(1);
    if (e3) console.error('Error fetching products:', e3);
    else console.log('Products row keys:', products.length > 0 ? Object.keys(products[0]) : 'No rows found');

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
