const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tyruvbavwbirlwsydfjj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5cnV2YmF2d2Jpcmx3c3lkZmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MDY4MTcsImV4cCI6MjA5MTI4MjgxN30.Q8d47jDe4tX2ae8tYIfx3g0w-pEvGZ8LIwsLqfDJBhc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Starting test checkout...');
  
  // Test payload
  const items = [
    {
      product_id: '9bf5befd-53a5-45f0-a28d-ce6b303522ec', // Torta marmoleada
      product_name: 'Torta marmoleada',
      quantity: 1,
      unit_price: 1.00,
      subtotal: 1.00
    }
  ];
  const totalAmount = 1.00;
  const paymentMethod = 'cash';
  
  try {
    // 1. Fetch products
    console.log('1. Validating stock...');
    const productIds = items.map(i => i.product_id);
    const { data: dbProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, name, stock_quantity, cost')
      .in('id', productIds);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return;
    }
    console.log('Fetched products:', dbProducts);

    for (const item of items) {
      const dbProduct = dbProducts?.find(p => p.id === item.product_id);
      if (!dbProduct) {
        throw new Error(`Producto no encontrado: ${item.product_name}`);
      }
      if (dbProduct.stock_quantity < item.quantity) {
        throw new Error(`Stock insuficiente para ${dbProduct.name}. Disponible: ${dbProduct.stock_quantity}`);
      }
    }

    // 2. Insert sale
    console.log('2. Inserting sale record...');
    const status = paymentMethod === 'credito' ? 'pending_payment' : 'paid';
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        total_amount: totalAmount,
        payment_method: paymentMethod,
        client_id: null,
        status,
        iva_enabled: false,
        tax_amount: 0,
      })
      .select()
      .single();

    if (saleError) {
      console.error('Sale error:', saleError);
      return;
    }
    console.log('Inserted sale:', sale);

    // 3. Insert items
    console.log('3. Inserting sale items...');
    const saleItems = items.map((item) => {
      const dbProduct = dbProducts?.find(p => p.id === item.product_id);
      return {
        sale_id: sale.id,
        unit_cost: dbProduct?.cost || 0,
        ...item,
      };
    });

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems);

    if (itemsError) {
      console.error('Items error:', itemsError);
      console.log('Rolling back...');
      await supabase.from('sales').delete().eq('id', sale.id);
      return;
    }
    console.log('Inserted items successfully');

    // 4. Decrement stock
    console.log('4. Decrementing stock...');
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      if (stockError) {
        console.error(`[Stock] Failed to decrement ${item.product_name}:`, stockError.message);
      } else {
        console.log(`Decremented stock for ${item.product_name}`);
      }
    }
    
    console.log('Checkout completed successfully!');
  } catch (err) {
    console.error('Error during run:', err);
  }
}

run();
