import { supabase } from '../../lib/supabase';
import { deleteSaleRowOrThrow } from '../../lib/salesDeletion';
import { updateSaleWithStockAdjustment } from '../../lib/saleMutations';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const from = supabase.from as jest.Mock;

/** `.delete().eq('id', saleId).select()` */
const deleteReturning = (result: { data: unknown[] | null; error?: unknown }) => ({
  delete: () => ({
    eq: () => ({
      select: () => Promise.resolve({ error: null, ...result }),
    }),
  }),
});

/** `.select('id').eq('id', saleId).maybeSingle()` */
const recheckReturning = (result: { data: unknown }) => ({
  select: () => ({
    eq: () => ({
      maybeSingle: () => Promise.resolve({ error: null, ...result }),
    }),
  }),
});

describe('deleteSaleRowOrThrow', () => {
  beforeEach(() => {
    from.mockReset();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves when the row is deleted and no longer there', async () => {
    from
      .mockImplementationOnce(() => deleteReturning({ data: [{ id: 'sale-1' }] }))
      .mockImplementationOnce(() => recheckReturning({ data: null }));

    await expect(deleteSaleRowOrThrow('sale-1')).resolves.toBeUndefined();
  });

  it('throws when the delete affects zero rows, which is how RLS refuses', async () => {
    from.mockImplementationOnce(() => deleteReturning({ data: [] }));

    await expect(deleteSaleRowOrThrow('sale-1')).rejects.toThrow(
      'La base de datos rechazó el borrado (revisa RLS en sales)'
    );
  });

  it('rethrows a Supabase error', async () => {
    const error = new Error('permission denied for table sales');
    from.mockImplementationOnce(() => deleteReturning({ data: null, error }));

    await expect(deleteSaleRowOrThrow('sale-1')).rejects.toThrow('permission denied for table sales');
  });

  it('throws when the sale is still readable after the delete', async () => {
    from
      .mockImplementationOnce(() => deleteReturning({ data: [{ id: 'sale-1' }] }))
      .mockImplementationOnce(() => recheckReturning({ data: { id: 'sale-1' } }));

    await expect(deleteSaleRowOrThrow('sale-1')).rejects.toThrow(
      'La venta no se borró en la base de datos'
    );
  });
});

describe('updateSaleWithStockAdjustment', () => {
  const rpc = supabase.rpc as jest.Mock;

  beforeEach(() => {
    from.mockReset();
    rpc.mockReset();
  });

  it('rejects before deleting sale_items when requested quantity exceeds available + prior quantity', async () => {
    const deleteSpy = jest.fn();

    from.mockImplementation((table: string) => {
      if (table === 'sale_items') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ product_id: 'p1', product_name: 'Café', quantity: 1, unit_price: 10, unit_cost: 4, subtotal: 10 }],
                error: null,
              }),
          }),
          delete: deleteSpy,
        };
      }
      if (table === 'products') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: 'p1', name: 'Café', cost: 4, stock_quantity: 2 }],
                error: null,
              }),
          }),
        };
      }
      return {};
    });

    await expect(
      updateSaleWithStockAdjustment({
        saleId: 'sale-1',
        items: [{ product_id: 'p1', product_name: 'Café', quantity: 5, unit_price: 10, subtotal: 50 }],
        newTotal: 50,
        ivaEnabled: false,
        taxAmount: 0,
      })
    ).rejects.toThrow('Stock insuficiente para Café. Disponible: 3');

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('preserves unit_cost and recalculates total_amount_bs when updating a sale', async () => {
    let insertedRows: any[] = [];
    let updatedSalePayload: any = null;

    rpc.mockResolvedValue({ error: null });

    from.mockImplementation((table: string) => {
      if (table === 'sale_items') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ product_id: 'p1', product_name: 'Café', quantity: 1, unit_price: 10, unit_cost: 4.5, subtotal: 10 }],
                error: null,
              }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: (rows: any[]) => {
            insertedRows = rows;
            return Promise.resolve({ error: null });
          },
        };
      }
      if (table === 'products') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: 'p1', name: 'Café', cost: 5, stock_quantity: 10 }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'sales') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { exchange_rate: 80 }, error: null }),
            }),
          }),
          update: (payload: any) => {
            updatedSalePayload = payload;
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      return {};
    });

    await updateSaleWithStockAdjustment({
      saleId: 'sale-1',
      items: [{ product_id: 'p1', product_name: 'Café', quantity: 2, unit_price: 10, subtotal: 20 }],
      newTotal: 23.2,
      ivaEnabled: true,
      taxAmount: 3.2,
    });

    expect(insertedRows).toEqual([
      expect.objectContaining({
        sale_id: 'sale-1',
        product_id: 'p1',
        quantity: 2,
        unit_cost: 4.5,
        subtotal: 20,
      }),
    ]);
    expect(updatedSalePayload).toEqual({
      total_amount: 23.2,
      iva_enabled: true,
      tax_amount: 3.2,
      total_amount_bs: 1856,
    });
  });
});
