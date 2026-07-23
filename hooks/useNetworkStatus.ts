import { useState, useEffect } from 'react';
import {
  getIsOnline,
  subscribeNetworkStatus,
  initNetworkStatus,
} from '../lib/networkStatus';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(getIsOnline());

  useEffect(() => {
    // Ensure network listener is active
    const cleanupInit = initNetworkStatus();
    // Subscribe to status changes
    const unsubscribe = subscribeNetworkStatus((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
      cleanupInit();
    };
  }, []);

  return { isOnline };
}
