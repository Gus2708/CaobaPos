-- CAOBA POS - Unified Production Database Schema & RLS Policies
-- Execute in the Supabase SQL Editor

-- 0. Required extensions
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 1. User Roles & Admin Helper
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'empleado' CHECK (role IN ('admin', 'empleado')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

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

-- 2. Categories & Products
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

-- 3. Clients & Credit Accounts
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sales & Sale Items
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

-- 5. Client Payments (Abonos)
CREATE TABLE IF NOT EXISTS client_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Client Balances View
CREATE OR REPLACE VIEW client_balances AS
SELECT
  c.id,
  c.name,
  c.phone,
  c.created_at,
  true AS is_active,
  COALESCE(s.total_debt, 0) AS total_credit_sales,
  COALESCE(p.total_paid, 0) AS total_paid,
  GREATEST(COALESCE(s.total_debt, 0) - COALESCE(p.total_paid, 0), 0) AS balance_due
FROM clients c
LEFT JOIN (
  SELECT client_id, SUM(total_amount) AS total_debt
  FROM sales
  WHERE payment_method = 'credito'
  GROUP BY client_id
) s ON s.client_id = c.id
LEFT JOIN (
  SELECT client_id, SUM(amount) AS total_paid
  FROM client_payments
  GROUP BY client_id
) p ON p.client_id = c.id;

-- 7. Exchange Rates (BCV & Manual Contingency)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT 'USD_VES',
  source TEXT NOT NULL DEFAULT 'bcv',
  rate NUMERIC(14,4) NOT NULL,
  raw_payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_current BOOLEAN DEFAULT true
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_product ON product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_current ON exchange_rates(currency, is_current);

-- 9. Row-Level Security (RLS)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated staff
CREATE POLICY "auth_read_user_roles" ON user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "admin_manage_user_roles" ON user_roles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_products" ON products FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_products" ON products FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_categories" ON categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_product_categories" ON product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_product_categories" ON product_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_clients" ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_clients" ON clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_clients" ON clients FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_sales" ON sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sales" ON sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_sales" ON sales FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_sale_items" ON sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sale_items" ON sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_sale_items" ON sale_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_read_client_payments" ON client_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_client_payments" ON client_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_manage_client_payments" ON client_payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "auth_select_exchange_rates" ON exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_select_exchange_rates" ON exchange_rates FOR SELECT TO anon USING (true);
CREATE POLICY "admin_manage_exchange_rates" ON exchange_rates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 10. Stock RPC Functions
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

-- 11. Exchange Rate Update RPC & Cron
CREATE OR REPLACE FUNCTION update_exchange_rate(
  p_rate NUMERIC,
  p_source TEXT DEFAULT 'bcv',
  p_payload JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  IF current_user NOT IN ('postgres', 'service_role') AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can update the exchange rate manually';
  END IF;

  UPDATE exchange_rates
  SET is_current = false
  WHERE currency = 'USD_VES' AND is_current = true;

  INSERT INTO exchange_rates (currency, source, rate, raw_payload, updated_at, is_current)
  VALUES ('USD_VES', p_source, p_rate, p_payload, now(), true)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_exchange_rate(NUMERIC, TEXT, JSONB) FROM public, anon;
GRANT EXECUTE ON FUNCTION update_exchange_rate(NUMERIC, TEXT, JSONB) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION process_bcv_http_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB;
  v_rate NUMERIC;
BEGIN
  IF NEW.status_code = 200 AND NEW.content IS NOT NULL THEN
    BEGIN
      v_payload := NEW.content::JSONB;
      v_rate := COALESCE(
        (v_payload->>'promedio')::NUMERIC,
        (v_payload->>'venta')::NUMERIC,
        (v_payload->>'compra')::NUMERIC
      );

      IF v_rate IS NOT NULL AND v_rate > 0 AND (v_payload->>'moneda') = 'USD' THEN
        PERFORM update_exchange_rate(v_rate, 'bcv', v_payload);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION process_bcv_http_response() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_process_bcv_response ON net._http_response;
CREATE TRIGGER trg_process_bcv_response
AFTER INSERT ON net._http_response
FOR EACH ROW
EXECUTE FUNCTION process_bcv_http_response();

SELECT cron.schedule(
  'sync-bcv-exchange-rate',
  '0 * * * *',
  $$SELECT net.http_get('https://ve.dolarapi.com/v1/dolares/oficial');$$
);
