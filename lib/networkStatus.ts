import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkListener = (isOnline: boolean) => void;
type ReconnectListener = () => void;

let currentIsOnline: boolean = true;
const statusListeners: Set<NetworkListener> = new Set();
const reconnectListeners: Set<ReconnectListener> = new Set();
let isInitialized = false;

function determineIsOnline(state: NetInfoState): boolean {
  // If isConnected is explicitly false, we are offline.
  if (state.isConnected === false) return false;
  // If isInternetReachable is explicitly false, we are offline.
  if (state.isInternetReachable === false) return false;
  // Default to true if connected or status is pending/unknown
  return true;
}

export function initNetworkStatus(): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;

  // Initial fetch
  NetInfo.fetch().then((state) => {
    currentIsOnline = determineIsOnline(state);
  }).catch(() => {
    currentIsOnline = true;
  });

  // Subscribe to changes
  const unsubscribe = NetInfo.addEventListener((state) => {
    const newStatus = determineIsOnline(state);
    const wasOffline = !currentIsOnline;
    currentIsOnline = newStatus;

    statusListeners.forEach((listener) => listener(newStatus));

    // Fire reconnect listeners if transitioned from offline to online
    if (wasOffline && newStatus) {
      reconnectListeners.forEach((listener) => listener());
    }
  });

  return () => {
    unsubscribe();
    isInitialized = false;
  };
}

export function getIsOnline(): boolean {
  return currentIsOnline;
}

export function setIsOnlineOverride(isOnline: boolean) {
  const wasOffline = !currentIsOnline;
  currentIsOnline = isOnline;
  statusListeners.forEach((listener) => listener(isOnline));

  if (wasOffline && isOnline) {
    reconnectListeners.forEach((listener) => listener());
  }
}

export function subscribeNetworkStatus(listener: NetworkListener): () => void {
  statusListeners.add(listener);
  // Immediately emit current state
  listener(currentIsOnline);

  return () => {
    statusListeners.delete(listener);
  };
}

export function onReconnect(listener: ReconnectListener): () => void {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
}
