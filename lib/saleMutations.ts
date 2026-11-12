import { supabase } from './supabase';
import { deleteSaleRowOrThrow } from './salesDeletion';

export interface EditableSaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  subtotal: number;
}

export interface UpdateSaleInput {
  saleId: string;
  items: EditableSaleItem[];
  newTotal: number;
  ivaEnabled: boolean;
  taxAmount: number;
  exchangeRate?: number;
}

async function restoreStockForItems(
  items: Array<{ product_id: string; quantity: number }>
): Promise<boolean> {
  let stockWarn = false;
  for (const item of items) {
    if (!item.product_id) continue;
    const { error: rpcError } = await supabase.rpc('increment_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
    if (rpcError) {
      const { data: prod } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single();
      if (prod) {
        const { error: updErr } = await supabase
          .from('products')
          .update({ stock_quantity: (prod.stock_quantity ?? 0) + item.quantity })
          .eq('id', item.product_id);
        if (updErr) {
          stockWarn = true;
        }
      } else {
        stockWarn = true;
      }
    }
  }
  return stockWarn;
}

export async function deleteSaleWithStockRestore(
  saleId: string
): Promise<{ success: true; stockWarn: boolean }> {
  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('product_id, quantity')
    .eq('sale_id', saleId);

  let stockWarn = false;
  if (itemsError) {
    console.warn('[Delete] Could not fetch sale items, skipping stock restore:', itemsError.message);
    stockWarn = true;
  } else if (items && items.length > 0) {
    stockWarn = await restoreStockForItems(items);
  }

  const { error: paymentsError } = await supabase
    .from('client_payments')
    .delete()
    .eq('sale_id', saleId);

  if (paymentsError) {
    throw paymentsError;
  }

  await deleteSaleRowOrThrow(saleId);
  return { success: true, stockWarn };
}

export async function updateSaleWithStockAdjustment({
  saleId,
  items,
  newTotal,
  ivaEnabled,
  taxAmount,
  exchangeRate,
}: UpdateSaleInput): Promise<void> {
  // 1. Fetch existing sale items BEFORE any destructive change
  const { data: oldItems, error: fetchError } = await supabase
    .from('sale_items')
    .select('product_id, product_name, quantity, unit_price, unit_cost, subtotal')
    .eq('sale_id', saleId);

  if (fetchError) throw fetchError;
  const previousItems = oldItems ?? [];

  // Map previous quantities and costs by product_id
  const oldQtyByProduct = new Map<string, number>();
  const oldCostByProduct = new Map<string, number>();
  for (const prev of previousItems) {
    if (!prev.product_id) continue;
    oldQtyByProduct.set(
      prev.product_id,
      (oldQtyByProduct.get(prev.product_id) ?? 0) + Number(prev.quantity || 0)
    );
    if (prev.unit_cost !== undefined && prev.unit_cost !== null) {
      oldCostByProduct.set(prev.product_id, Number(prev.unit_cost));
    }
  }

  // 2. Validate stock BEFORE deleting old sale_items or mutating stock
  const productIds = Array.from(new Set(items.map((i) => i.product_id).filter(Boolean)));
  const dbProductMap = new Map<string, { id: string; name: string; cost?: number; stock_quantity: number }>();

  if (productIds.length > 0) {
    const { data: dbProducts, error: stockCheckError } = await supabase
      .from('products')
      .select('id, name, cost, stock_quantity')
      .in('id', productIds);

    if (stockCheckError) throw stockCheckError;
    for (const p of dbProducts ?? []) {
      dbProductMap.set(p.id, p);
    }

    for (const item of items) {
      const dbProduct = dbProductMap.get(item.product_id);
      if (dbProduct) {
        const availableWithPrior = (dbProduct.stock_quantity ?? 0) + (oldQtyByProduct.get(item.product_id) ?? 0);
        if (availableWithPrior < item.quantity) {
          throw new Error(
            `Stock insuficiente para ${dbProduct.name}. Disponible: ${availableWithPrior}`
          );
        }
      }
    }
  }

  // 3. Restore stock for old items
  if (previousItems.length > 0) {
    await restoreStockForItems(previousItems);
  }

  // 4. Delete old sale_items
  const { error: deleteError } = await supabase
    .from('sale_items')
    .delete()
    .eq('sale_id', saleId);
  if (deleteError) throw deleteError;

  // 5. Insert updated sale_items (preserving unit_cost); rollback old items if insert fails
  const rowsToInsert = items.map((item) => {
    const preservedCost =
      item.unit_cost ??
      oldCostByProduct.get(item.product_id) ??
      dbProductMap.get(item.product_id)?.cost ??
      0;
    return {
      sale_id: saleId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_cost: preservedCost,
      subtotal: item.subtotal,
    };
  });

  const { error: insertError } = await supabase.from('sale_items').insert(rowsToInsert);
  if (insertError) {
    if (previousItems.length > 0) {
      await supabase.from('sale_items').insert(
        previousItems.map((prev) => ({
          sale_id: saleId,
          product_id: prev.product_id,
          product_name: prev.product_name,
          quantity: prev.quantity,
          unit_price: prev.unit_price,
          unit_cost: prev.unit_cost ?? 0,
          subtotal: prev.subtotal,
        }))
      );
      for (const prev of previousItems) {
        if (!prev.product_id) continue;
        await supabase.rpc('decrement_stock', {
          p_product_id: prev.product_id,
          p_quantity: prev.quantity,
        });
      }
    }
    throw insertError;
  }

  // 6. Decrement stock for new items
  for (const item of items) {
    if (!item.product_id) continue;
    const { error: decrementError } = await supabase.rpc('decrement_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
    if (decrementError) {
      throw new Error(`Error decrementando stock: ${decrementError.message}`);
    }
  }

  // 7. Resolve exchange_rate to keep total_amount_bs in sync
  let effectiveRate = exchangeRate;
  if (effectiveRate === undefined) {
    const saleQuery: any = supabase.from('sales').select('exchange_rate');
    if (saleQuery && typeof saleQuery.eq === 'function') {
      const eqRes = saleQuery.eq('id', saleId);
      if (eqRes && typeof eqRes.maybeSingle === 'function') {
        const { data: saleRow } = await eqRes.maybeSingle();
        if (saleRow?.exchange_rate) {
          effectiveRate = Number(saleRow.exchange_rate);
        }
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    total_amount: newTotal,
    iva_enabled: ivaEnabled,
    tax_amount: taxAmount,
  };
  if (effectiveRate && effectiveRate > 0) {
    updatePayload.total_amount_bs = Number((newTotal * effectiveRate).toFixed(2));
  }

  const { error: updateError } = await supabase
    .from('sales')
    .update(updatePayload)
    .eq('id', saleId);
  if (updateError) throw updateError;
}
