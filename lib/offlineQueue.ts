import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type OfflineActionType =
  | 'CREATE_SALE'
  | 'CREATE_CLIENT'
  | 'ADD_PAYMENT'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'DELETE_CLIENT'
  | 'EDIT_SALE'
  | 'DELETE_SALE';

export interface OfflineQueueItem<T = any> {
  id: string;
  type: OfflineActionType;
  payload: T;
  createdAt: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

const STORAGE_KEY = '@caobapos_offline_queue_v1';
const queueListeners: Set<(queue: OfflineQueueItem[]) => void> = new Set();

let inMemoryQueue: OfflineQueueItem[] | null = null;

function generateUUID(): string {
  try {
    if (Crypto.randomUUID) {
      return Crypto.randomUUID();
    }
  } catch (e) {
    // Fallback if native module not ready in test/mock environment
  }
  return 'offline-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

function notifyListeners(queue: OfflineQueueItem[]) {
  queueListeners.forEach((listener) => listener(queue));
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  if (inMemoryQueue !== null) {
    return inMemoryQueue;
  }
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      inMemoryQueue = JSON.parse(data);
    } else {
      inMemoryQueue = [];
    }
  } catch (err) {
    console.error('[OfflineQueue] Error reading from AsyncStorage:', err);
    inMemoryQueue = [];
  }
  return inMemoryQueue || [];
}

async function saveQueue(queue: OfflineQueueItem[]): Promise<void> {
  inMemoryQueue = queue;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('[OfflineQueue] Error saving queue to AsyncStorage:', err);
  }
  notifyListeners(queue);
}

export async function enqueueOfflineItem<T>(
  type: OfflineActionType,
  payload: T
): Promise<OfflineQueueItem<T>> {
  const currentQueue = await getOfflineQueue();
  const newItem: OfflineQueueItem<T> = {
    id: generateUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  };

  const updatedQueue = [...currentQueue, newItem];
  await saveQueue(updatedQueue);
  return newItem;
}

export async function removeOfflineItem(id: string): Promise<void> {
  const currentQueue = await getOfflineQueue();
  const updatedQueue = currentQueue.filter((item) => item.id !== id);
  await saveQueue(updatedQueue);
}

export async function updateOfflineItem(
  id: string,
  updates: Partial<OfflineQueueItem>
): Promise<void> {
  const currentQueue = await getOfflineQueue();
  const updatedQueue = currentQueue.map((item) =>
    item.id === id ? { ...item, ...updates } : item
  );
  await saveQueue(updatedQueue);
}

export async function clearOfflineQueue(): Promise<void> {
  await saveQueue([]);
}

export function subscribeOfflineQueue(
  listener: (queue: OfflineQueueItem[]) => void
): () => void {
  queueListeners.add(listener);
  // Send current state asynchronously
  getOfflineQueue().then((queue) => listener(queue));

  return () => {
    queueListeners.delete(listener);
  };
}
