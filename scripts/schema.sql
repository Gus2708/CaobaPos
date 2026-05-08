-- ============================================
-- CAOBA POS - Database Schema
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Create products table
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

-- 2. Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- 5. Disable RLS (MVP - open app)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;

-- 6. Create stock decrement function
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

-- 7. Create stock increment function (used when deleting/editing sales to restore stock)
CREATE OR REPLACE FUNCTION increment_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id;
END;
$$;

-- ============================================
-- Seed Data (sample products)
-- ============================================

INSERT INTO products (name, price, stock_quantity, category) VALUES
('Copa de Helado', 35.00, 100, 'helados'),
('Sundae Chocolate', 45.00, 100, 'helados'),
('Malteada de Vainilla', 40.00, 50, 'helados'),
('Cono de Helado', 25.00, 100, 'helados'),
('Café Latte', 30.00, 50, 'cafe'),
('Cappuccino', 35.00, 50, 'cafe'),
('Americano', 25.00, 50, 'cafe'),
('Mocha', 40.00, 50, 'cafe'),
('Croissant', 25.00, 30, 'snacks'),
('Galletas', 15.00, 50, 'snacks'),
('Brownie', 30.00, 30, 'snacks'),
('Refresco', 20.00, 100, 'bebidas'),
('Agua', 15.00, 100, 'bebidas'),
('Jugo Natural', 25.00, 50, 'bebidas')
ON CONFLICT DO NOTHING;

console.log('✓ Database setup complete!');