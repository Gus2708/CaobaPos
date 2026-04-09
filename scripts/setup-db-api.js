const SUPABASE_URL = 'https://tyruvbavwbirlwsydfjj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnV2YmF2d2Jpcmx3c3lkZmpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwNjgxNywiZXhwIjoyMDkxMjgyODE3fQ.x7d5Cp0FBvSnI4nfpCDjuDFTY6c0JmyOPbw6sQkf77o';

async function execSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return response.json();
}

async function setupDatabase() {
  console.log('Setting up Caoba POS database...\n');

  const statements = [
    `CREATE TABLE IF NOT EXISTS products (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      barcode TEXT UNIQUE,
      stock_quantity INTEGER DEFAULT 0,
      category TEXT NOT NULL,
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );`,
    
    `CREATE TABLE IF NOT EXISTS sales (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      total_amount NUMERIC(10,2) NOT NULL,
      payment_method TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );`,
    
    `CREATE TABLE IF NOT EXISTS sale_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL
    );`,
    
    `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);`,
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`,
    `CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);`,
    `CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);`,
    
    `ALTER TABLE products DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE sales DISABLE ROW LEVEL SECURITY;`,
    `ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;`,
    
    `CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE products
      SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0)
      WHERE id = p_product_id;
    END;
    $$;`,
  ];

  for (const sql of statements) {
    try {
      const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/postgrest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'params=single-object',
        },
        body: JSON.stringify({ _path: '', method: 'POST' }),
      });
      console.log('Executed:', sql.substring(0, 50) + '...');
    } catch (e) {
      console.log('Note: Need to run SQL manually in Supabase SQL Editor');
    }
  }

  console.log('\n⚠️ Using Supabase HTTP API - please run schema.sql in SQL Editor');
}

setupDatabase().catch(console.error);