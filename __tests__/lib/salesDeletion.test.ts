import { supabase } from '../../lib/supabase';
import { deleteSaleRowOrThrow } from '../../lib/salesDeletion';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
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
