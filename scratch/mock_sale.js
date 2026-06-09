const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  try {
    // 1. Get some active products
    console.log('Fetching active products...');
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, stock_quantity, price, cost')
      .eq('is_active', true)
      .gt('stock_quantity', 2)
      .limit(2);

    if (prodErr) {
      console.error('Error fetching products:', prodErr);
      return;
    }

    if (!products || products.length === 0) {
      console.log('No active products with stock > 2 found!');
      return;
    }

    console.log('Selected products for mock sale:', products);

    const items = products.map(p => ({
      product_id: p.id,
      product_name: p.name,
      quantity: 1,
      price: p.price,
    }));

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const selectedPayment = 'cash';
    const saleItems = items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity,
    }));

    console.log('Simulating useCreateSale logic...');

    // Step 1: Pre-checkout stock validation
    const productIds = saleItems.map(i => i.product_id);
    const { data: dbProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, cost')
      .in('id', productIds);

    if (fetchError) {
      console.error('Step 1 failed (fetchError):', fetchError);
      return;
    }

    for (const item of saleItems) {
      const dbProduct = dbProducts?.find(p => p.id === item.product_id);
      if (!dbProduct) {
        throw new Error(`Producto no encontrado: ${item.product_name}`);
      }
      if (dbProduct.stock_quantity < item.quantity) {
        throw new Error(`Stock insuficiente para ${dbProduct.name}. Disponible: ${dbProduct.stock_quantity}`);
      }
    }
    console.log('Step 1 (Stock check) passed.');

    // Step 2: Insert the sale record
    const status = selectedPayment === 'credito' ? 'pending_payment' : 'paid';
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: total,
        payment_method: selectedPayment,
        client_id: null,
        status,
        iva_enabled: false,
        tax_amount: 0,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Step 2 failed (saleError):', saleError);
      return;
    }
    console.log('Step 2 (Insert sale) passed. Sale ID:', sale.id);

    // Step 3: Insert sale items
    const dbSaleItems = saleItems.map((item) => {
      const dbProduct = dbProducts?.find(p => p.id === item.product_id);
      return {
        sale_id: sale.id,
        unit_cost: dbProduct?.cost || 0,
        ...item,
      };
    });

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(dbSaleItems);

    if (itemsError) {
      console.error('Step 3 failed (itemsError):', itemsError);
      console.log('Rolling back sale...');
      await supabase.from('sales').delete().eq('id', sale.id);
      return;
    }
    console.log('Step 3 (Insert sale items) passed.');

    // Step 4: Decrement stock via RPC
    console.log('Step 4: Decrementing stock via RPC decrement_stock...');
    for (const item of saleItems) {
      const { data, error: stockError } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      if (stockError) {
        console.error(`Step 4 failed (stockError for ${item.product_name}):`, stockError);
      } else {
        console.log(`Decremented stock for ${item.product_name}. Result:`, data);
      }
    }

    console.log('Mock sale simulation complete!');

  } catch (error) {
    console.error('Simulation crashed with error:', error);
  }
}

run();
