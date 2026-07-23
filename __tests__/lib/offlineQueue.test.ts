import {
  getOfflineQueue,
  enqueueOfflineItem,
  removeOfflineItem,
  updateOfflineItem,
  clearOfflineQueue,
} from '../../lib/offlineQueue';

describe('OfflineQueue', () => {
  beforeEach(async () => {
    await clearOfflineQueue();
  });

  test('should enqueue items into the queue', async () => {
    const item1 = await enqueueOfflineItem('CREATE_SALE', { totalAmount: 100, items: [] });
    const item2 = await enqueueOfflineItem('CREATE_CLIENT', { name: 'Juan Perez' });

    const queue = await getOfflineQueue();
    expect(queue.length).toBe(2);
    expect(queue[0].type).toBe('CREATE_SALE');
    expect(queue[1].type).toBe('CREATE_CLIENT');
  });

  test('should update item status', async () => {
    const item = await enqueueOfflineItem('ADD_PAYMENT', { amount: 50 });
    await updateOfflineItem(item.id, { status: 'failed', errorMessage: 'Test Error' });

    const queue = await getOfflineQueue();
    expect(queue[0].status).toBe('failed');
    expect(queue[0].errorMessage).toBe('Test Error');
  });

  test('should remove item from queue', async () => {
    const item = await enqueueOfflineItem('CREATE_SALE', { totalAmount: 200 });
    await removeOfflineItem(item.id);

    const queue = await getOfflineQueue();
    expect(queue.length).toBe(0);
  });
});
