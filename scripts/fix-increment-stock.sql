-- ============================================
-- CAOBA POS - FIX: Add missing increment_stock RPC
-- Run this in Supabase SQL Editor (Dashboard → SQL → New query → Run)
-- ============================================
--
-- WHY THIS FIX IS NEEDED:
-- The HistoryPanel calls supabase.rpc('increment_stock', ...) when deleting
-- or editing a sale, to restore the stock that was decremented when the
-- sale was created. This function was never created in the database, so
-- every delete attempt fails before reaching the DELETE FROM sales step.
--
-- After running this once, sales will delete correctly and stock will be
-- restored automatically.
-- ============================================

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

-- Verify it was created:
-- SELECT proname FROM pg_proc WHERE proname IN ('increment_stock', 'decrement_stock');
