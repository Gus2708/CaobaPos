import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tyruvbavwbirlwsydfjj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnV2YmF2d2Jpcmx3c3lkZmpqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcwNjgxNywiZXhwIjoyMDkxMjgyODE3fQ.x7d5Cp0FBvSnI4nfpCDjuDFTY6c0JmyOPbw6sQkf77o';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupDatabase() {
  console.log('Creating tables...');

  const productsTable = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      barcode TEXT UNIQUE,
      stock_quantity INTEGER DEFAULT 0,
      category TEXT NOT NULL,
      image_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  const salesTable = `
    CREATE TABLE IF NOT EXISTS sales (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      total_amount NUMERIC(10,2) NOT NULL,
      payment_method TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  const saleItemsTable = `
    CREATE TABLE IF NOT EXISTS sale_items (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      subtotal NUMERIC(10,2) NOT NULL
    );
  `;

  const indexes = `
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
  `;

  const disableRLS = `
    ALTER TABLE products DISABLE ROW LEVEL SECURITY;
    ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
    ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
  `;

  const functionSQL = `
    CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
    RETURNS void
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE products
      SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0)
      WHERE id = p_product_id;
    END;
    $$;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: productsTable });
    console.log('✓ products table created');
  } catch (e) {
    console.log('Creating products via rpc failed, trying raw...');
    const { error } = await supabase.from('products').select('id').limit(1);
    if (error?.code === '42P01') {
      console.log('Table does not exist, need to run SQL manually');
    }
  }

  console.log('\nPlease run these SQL statements in Supabase SQL Editor:\n');
  console.log(productsTable);
  console.log('\n' + salesTable);
  console.log('\n' + saleItemsTable);
  console.log('\n' + indexes);
  console.log('\n' + disableRLS);
  console.log('\n' + functionSQL);
}

setupDatabase();