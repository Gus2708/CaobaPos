import { supabase } from './supabase';

/**
 * Deletes a sale row and proves it is gone.
 *
 * Supabase answers a DELETE blocked by RLS with success and zero affected rows, so a
 * caller that only inspects `error` reports "sale deleted" for a sale that is still
 * there — and, in the credit-sale flow, restores stock for a sale that was never
 * removed. Every delete path must go through here.
 */
export async function deleteSaleRowOrThrow(saleId: string): Promise<void> {
  const { data: deleted, error } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)
    .select();

  if (error) {
    console.error('[Delete] Supabase error deleting sale:', error);
    throw error;
  }

  if (!deleted || deleted.length === 0) {
    console.error('[Delete] DELETE affected 0 rows — likely RLS blocking. sale.id:', saleId);
    throw new Error('La base de datos rechazó el borrado (revisa RLS en sales)');
  }

  // Sanity-check: confirm the row is really gone before reporting success.
  const { data: stillThere } = await supabase
    .from('sales')
    .select('id')
    .eq('id', saleId)
    .maybeSingle();

  if (stillThere) {
    console.error('[Delete] Sale still exists in DB after delete. sale.id:', saleId);
    throw new Error('La venta no se borró en la base de datos');
  }
}
