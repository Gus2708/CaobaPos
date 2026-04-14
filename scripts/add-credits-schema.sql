-- ============================================
-- CAOBA POS - Credits and Clients Update
-- Run in Supabase SQL Editor
-- ============================================

-- 1. Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Modify sales table to link to clients and track status
-- Add client reference (nullable for anonymous sales)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
-- Add status (paid, pending_payment)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'paid';

-- 3. Create client_payments table (Abonos)
CREATE TABLE IF NOT EXISTS client_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) NOT NULL,
  sale_id UUID REFERENCES sales(id), -- Optional link to a specific sale
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL, -- 'cash', 'card', 'transfer'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create indexes for rapid querying
CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_client_id ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_sale_id ON client_payments(sale_id);

-- 5. Disable RLS for MVP
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments DISABLE ROW LEVEL SECURITY;

-- 6. Helper View: Client Balances
-- This view helps fetch clients alongside their total money owed and paid.
CREATE OR REPLACE VIEW client_balances AS
SELECT 
  c.id,
  c.name,
  c.phone,
  c.is_active,
  c.created_at,
  COALESCE(SUM(s.total_amount), 0) AS total_credit_sales,
  (
    SELECT COALESCE(SUM(cp.amount), 0)
    FROM client_payments cp
    WHERE cp.client_id = c.id
  ) AS total_paid,
  (COALESCE(SUM(s.total_amount), 0) - (
    SELECT COALESCE(SUM(cp.amount), 0)
    FROM client_payments cp
    WHERE cp.client_id = c.id
  )) AS balance_due
FROM clients c
LEFT JOIN sales s ON s.client_id = c.id AND s.payment_method = 'credito'
GROUP BY 
  c.id, c.name, c.phone, c.is_active, c.created_at;
