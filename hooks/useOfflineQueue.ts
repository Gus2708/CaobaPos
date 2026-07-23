import { useState, useEffect, useCallback } from 'react';
import {
  subscribeOfflineQueue,
  clearOfflineQueue,
  OfflineQueueItem,
} from '../lib/offlineQueue';
import {
  subscribeSyncState,
  processSyncQueue,
} from '../lib/syncEngine';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    const unsubscribeQueue = subscribeOfflineQueue((currentQueue) => {
      setQueue(currentQueue);
    });

    const unsubscribeSync = subscribeSyncState((syncing, progress) => {
      setIsSyncing(syncing);
      setSyncProgress(progress || null);
    });

    return () => {
      unsubscribeQueue();
      unsubscribeSync();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    return await processSyncQueue();
  }, []);

  const pendingCount = queue.filter((i) => i.status !== 'failed').length;

  return {
    queue,
    pendingCount,
    isSyncing,
    syncProgress,
    triggerSync,
    clearQueue: clearOfflineQueue,
  };
}
