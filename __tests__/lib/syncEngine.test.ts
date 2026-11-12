import { processSyncQueue, resetInMemoryTempIdMapForTests } from '../../lib/syncEngine';
import { enqueueOfflineItem, getOfflineQueue, clearOfflineQueue } from '../../lib/offlineQueue';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/networkStatus', () => ({
  getIsOnline: () => true,
}));

// Records every call so a test can assert which table and operation the engine hit.
const calls: { table: string; op: string; args: any[] }[] = [];
const rpcCalls: { fn: string; args: any }[] = [];
let mockDeleteSaleRows: any[] = [{ id: 'sale-del-1' }];
let mockSaleItemsRows: any[] = [{ product_id: 'p1', product_name: 'Café', quantity: 2, unit_price: 10, unit_cost: 4, subtotal: 20 }];
let mockProductsRows: any[] = [{ id: 'p1', name: 'Café', cost: 4, stock_quantity: 10 }];
let mockCreatedClientId = 'real-client-uuid-999';

jest.mock('../../lib/supabase', () => {
  const builder = (table: string) => {
    let lastOp = '';
    const record = (op: string) => (...args: any[]) => {
      lastOp = op;
      calls.push({ table, op, args });
      return chain;
    };
    const chain: any = {
      select: record('select'),
      insert: record('insert'),
      update: record('update'),
      delete: record('delete'),
      eq: record('eq'),
      in: record('in'),
      single: () => {
        calls.push({ table, op: 'single', args: [] });
        if (table === 'clients') {
          return Promise.resolve({ data: { id: mockCreatedClientId }, error: null });
        }
        if (table === 'sales') {
          return Promise.resolve({ data: { id: 'real-sale-uuid-1' }, error: null });
        }
        return Promise.resolve({ data: { id: 'row-1' }, error: null });
      },
      maybeSingle: () => {
        calls.push({ table, op: 'maybeSingle', args: [] });
        return Promise.resolve({ data: null, error: null });
      },
      order: record('order'),
      then: (resolve: any) => {
        if (table === 'sales' && lastOp === 'select') {
          return resolve({ data: mockDeleteSaleRows, error: null });
        }
        if (table === 'sale_items' && lastOp === 'eq') {
          return resolve({ data: mockSaleItemsRows, error: null });
        }
        if (table === 'products' && lastOp === 'in') {
          return resolve({ data: mockProductsRows, error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return chain;
  };
  return {
    supabase: {
      from: jest.fn((table: string) => builder(table)),
      rpc: jest.fn((fn: string, args: any) => {
        rpcCalls.push({ fn, args });
        return Promise.resolve({ data: null, error: null });
      }),
    },
  };
});

describe('SyncEngine', () => {
  beforeEach(async () => {
    await clearOfflineQueue();
    calls.length = 0;
    rpcCalls.length = 0;
    (supabase.from as jest.Mock).mockClear();
  });

  test('replays a queued client deletion as a soft delete', async () => {
    await enqueueOfflineItem('DELETE_CLIENT', { id: 'client-123' });

    const { successCount, errorCount } = await processSyncQueue();

    expect(errorCount).toBe(0);
    expect(successCount).toBe(1);

    const update = calls.find((c) => c.table === 'clients' && c.op === 'update');
    expect(update).toBeDefined();
    expect(update!.args[0]).toEqual({ is_active: false });

    const eq = calls.find((c) => c.table === 'clients' && c.op === 'eq');
    expect(eq!.args).toEqual(['id', 'client-123']);

    // A replayed item must leave the queue so it is not applied twice.
    expect(await getOfflineQueue()).toHaveLength(0);
  });

  test('marks an unhandled action as failed instead of silently dropping it', async () => {
    await enqueueOfflineItem('NOT_A_REAL_ACTION' as any, { id: 'x' });

    const { successCount, errorCount } = await processSyncQueue();

    expect(successCount).toBe(0);
    expect(errorCount).toBe(1);

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe('failed');
  });

  test('persists tempIdMap in AsyncStorage so a subsequent sync resolves offline client IDs after memory reset', async () => {
    await enqueueOfflineItem('CREATE_CLIENT', {
      tempId: 'offline-client-77',
      name: 'María Pérez',
      phone: '04141234567',
    });
    await processSyncQueue();

    // Simulate app restart by clearing the in-memory tempIdMap
    resetInMemoryTempIdMapForTests();

    await enqueueOfflineItem('ADD_PAYMENT', {
      clientId: 'offline-client-77',
      amount: 25,
      paymentMethod: 'cash',
    });

    const { successCount, errorCount } = await processSyncQueue();
    expect(errorCount).toBe(0);
    expect(successCount).toBe(1);

    const paymentInsert = calls.find((c) => c.table === 'client_payments' && c.op === 'insert');
    expect(paymentInsert).toBeDefined();
    expect(paymentInsert!.args[0]).toEqual(
      expect.objectContaining({
        client_id: 'real-client-uuid-999',
        amount: 25,
      })
    );
  });

  test('restores product stock when replaying DELETE_SALE', async () => {
    await enqueueOfflineItem('DELETE_SALE', { saleId: 'sale-del-1' });

    const { successCount, errorCount } = await processSyncQueue();
    expect(errorCount).toBe(0);
    expect(successCount).toBe(1);

    expect(rpcCalls).toContainEqual({
      fn: 'increment_stock',
      args: { p_product_id: 'p1', p_quantity: 2 },
    });
  });

  test('replays EDIT_SALE and adjusts stock and sale totals', async () => {
    await enqueueOfflineItem('EDIT_SALE', {
      saleId: 'sale-edit-1',
      items: [{ product_id: 'p1', product_name: 'Café', quantity: 3, unit_price: 10, subtotal: 30 }],
      newTotal: 30,
      ivaEnabled: false,
      taxAmount: 0,
      exchangeRate: 80,
    });

    const { successCount, errorCount } = await processSyncQueue();
    expect(errorCount).toBe(0);
    expect(successCount).toBe(1);

    expect(rpcCalls).toContainEqual({
      fn: 'increment_stock',
      args: { p_product_id: 'p1', p_quantity: 2 },
    });
    expect(rpcCalls).toContainEqual({
      fn: 'decrement_stock',
      args: { p_product_id: 'p1', p_quantity: 3 },
    });
    const saleUpdate = calls.find((c) => c.table === 'sales' && c.op === 'update');
    expect(saleUpdate?.args[0]).toEqual({
      total_amount: 30,
      iva_enabled: false,
      tax_amount: 0,
      total_amount_bs: 2400,
    });
  });
});
