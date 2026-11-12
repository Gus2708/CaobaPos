-- ============================================================================
-- MIGRACIÓN 100% ADITIVA Y SEGURA (NO BORRA TABLAS NI DATOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'empleado' CHECK (role IN ('admin', 'empleado')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2) DEFAULT 0,
  barcode TEXT UNIQUE,
  stock_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  total_amount NUMERIC(10,2) NOT NULL,
  exchange_rate NUMERIC(14,4) DEFAULT 1.0000,
  total_amount_bs NUMERIC(16,2),
  payment_method TEXT NOT NULL,
  payment_details JSONB,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'paid',
  iva_enabled BOOLEAN DEFAULT false,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_name TEXT,
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS client_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT 'USD_VES',
  source TEXT NOT NULL DEFAULT 'bcv',
  rate NUMERIC(14,4) NOT NULL,
  raw_payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_current BOOLEAN DEFAULT true
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14,4) DEFAULT 1.0000;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_amount_bs NUMERIC(16,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_details JSONB;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS iva_enabled BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS created_by_email TEXT;

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
$$;

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0)
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION decrement_stock(UUID, INTEGER) FROM public, anon;
GRANT EXECUTE ON FUNCTION decrement_stock(UUID, INTEGER) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION increment_stock(UUID, INTEGER) FROM public, anon;
GRANT EXECUTE ON FUNCTION increment_stock(UUID, INTEGER) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_product ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_current ON exchange_rates(currency, is_current);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_user_roles" ON user_roles;
DROP POLICY IF EXISTS "admin_manage_user_roles" ON user_roles;
CREATE POLICY "auth_read_user_roles" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "admin_manage_user_roles" ON user_roles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_read_products" ON products;
DROP POLICY IF EXISTS "admin_manage_products" ON products;
CREATE POLICY "auth_read_products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_products" ON products FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_read_categories" ON categories;
DROP POLICY IF EXISTS "admin_manage_categories" ON categories;
CREATE POLICY "auth_read_categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_categories" ON categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_read_product_categories" ON product_categories;
DROP POLICY IF EXISTS "admin_manage_product_categories" ON product_categories;
CREATE POLICY "auth_read_product_categories" ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_product_categories" ON product_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_read_clients" ON clients;
DROP POLICY IF EXISTS "auth_insert_clients" ON clients;
DROP POLICY IF EXISTS "admin_manage_clients" ON clients;
CREATE POLICY "auth_read_clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_clients" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_clients" ON clients FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_read_sales" ON sales;
DROP POLICY IF EXISTS "auth_insert_sales" ON sales;
DROP POLICY IF EXISTS "admin_manage_sales" ON sales;
CREATE POLICY "auth_read_sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_sales" ON sales FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_read_sale_items" ON sale_items;
DROP POLICY IF EXISTS "auth_insert_sale_items" ON sale_items;
DROP POLICY IF EXISTS "admin_manage_sale_items" ON sale_items;
CREATE POLICY "auth_read_sale_items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_sale_items" ON sale_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_read_client_payments" ON client_payments;
DROP POLICY IF EXISTS "auth_insert_client_payments" ON client_payments;
DROP POLICY IF EXISTS "admin_manage_client_payments" ON client_payments;
CREATE POLICY "auth_read_client_payments" ON client_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_client_payments" ON client_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_client_payments" ON client_payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "auth_select_exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "anon_select_exchange_rates" ON exchange_rates;
DROP POLICY IF EXISTS "admin_manage_exchange_rates" ON exchange_rates;
CREATE POLICY "auth_select_exchange_rates" ON exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_select_exchange_rates" ON exchange_rates FOR SELECT TO anon USING (true);
CREATE POLICY "admin_manage_exchange_rates" ON exchange_rates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

INSERT INTO user_roles (user_id, role, display_name)
SELECT id, 'admin', email FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
