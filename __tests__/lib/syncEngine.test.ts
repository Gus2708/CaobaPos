import { processSyncQueue } from '../../lib/syncEngine';
import { enqueueOfflineItem, getOfflineQueue, clearOfflineQueue } from '../../lib/offlineQueue';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/networkStatus', () => ({
  getIsOnline: () => true,
}));

// Records every call so a test can assert which table and operation the engine hit.
const calls: { table: string; op: string; args: any[] }[] = [];

jest.mock('../../lib/supabase', () => {
  const builder = (table: string) => {
    const record = (op: string) => (...args: any[]) => {
      calls.push({ table, op, args });
      return chain;
    };
    const chain: any = {
      select: record('select'),
      insert: record('insert'),
      update: record('update'),
      delete: record('delete'),
      eq: record('eq'),
      single: record('single'),
      order: record('order'),
      then: (resolve: any) => resolve({ data: [], error: null }),
    };
    return chain;
  };
  return { supabase: { from: jest.fn((table: string) => builder(table)) } };
});

describe('SyncEngine', () => {
  beforeEach(async () => {
    await clearOfflineQueue();
    calls.length = 0;
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
});
