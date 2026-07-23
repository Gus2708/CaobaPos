import {
  saveCachedProducts,
  getCachedProducts,
  applyOfflineStockDecrement,
  saveCachedClients,
  getCachedClients,
  addOfflineClient,
  addOfflinePayment,
} from '../../lib/offlineCache';

describe('OfflineCache', () => {
  test('should cache products and apply local stock decrement', async () => {
    const initialProducts = [
      { id: 'p1', name: 'Cafe', price: 10, stock_quantity: 5, categories: [] } as any,
    ];
    await saveCachedProducts(initialProducts);

    let cached = await getCachedProducts();
    expect(cached[0].stock_quantity).toBe(5);

    await applyOfflineStockDecrement([{ product_id: 'p1', quantity: 2 }]);

    cached = await getCachedProducts();
    expect(cached[0].stock_quantity).toBe(3);
  });

  test('should add offline client and payment to cached clients', async () => {
    await saveCachedClients([]);

    const newClient = {
      id: 'offline-1',
      name: 'Maria G',
      phone: '123',
      created_at: '',
      total_credit_sales: 100,
      total_paid: 0,
      balance_due: 100,
      is_active: true,
    };

    await addOfflineClient(newClient);
    let clients = await getCachedClients();
    expect(clients.length).toBe(1);
    expect(clients[0].name).toBe('Maria G');

    await addOfflinePayment('offline-1', 40);
    clients = await getCachedClients();
    expect(clients[0].total_paid).toBe(40);
    expect(clients[0].balance_due).toBe(60);
  });
});
