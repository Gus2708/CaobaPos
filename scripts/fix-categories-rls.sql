-- ============================================
-- CAOBA POS - FIX: Disable RLS on category tables
-- Run in Supabase Dashboard → SQL Editor → Run
-- ============================================
--
-- WHY:
-- product_categories and categories had RLS enabled but no DELETE policy.
-- When InventoryPanel tries to update a product, it does:
--   1. DELETE FROM product_categories WHERE product_id = X
--   2. INSERT INTO product_categories (product_id, category_id) VALUES ...
--
-- RLS silently blocks step 1 (returns success, deletes 0 rows). Then step 2
-- collides with the still-present rows on the (product_id, category_id)
-- primary key and throws:
--   "duplicate key value violates unique constraint product_categories_pkey"
--
-- This is the same RLS pattern we fixed earlier on sales/sale_items/etc.
-- The InventoryPanel code was also made resilient (upsert with
-- ignoreDuplicates), but disabling RLS is the cleaner fix and matches
-- the rest of the schema.
-- ============================================

ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Verify:
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('product_categories', 'categories', 'sales', 'sale_items', 'products', 'clients', 'client_payments');
