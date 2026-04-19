import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}product_images/`;
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const PREFETCH_CONCURRENCY = 4; // Download up to 4 images in parallel

/**
 * In-memory map: remoteUrl → localUri
 * Avoids SHA256 hash + FileSystem stat on every render.
 */
const memoryCache = new Map<string, string>();

let dirReady: Promise<void> | null = null;

function ensureDirExists(): Promise<void> {
  if (!dirReady) {
    dirReady = (async () => {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
      }
    })();
  }
  return dirReady;
}

async function getFilename(url: string): Promise<string> {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    url
  );
  return `${hash}.jpg`;
}

/**
 * Resolves a remote URL to a local file URI.
 * Uses in-memory cache first to avoid repeated hashing and stat calls.
 */
export async function getCachedImage(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('file://') || url.startsWith('content://')) return url;

  // 1. Check in-memory cache (fastest path)
  const memHit = memoryCache.get(url);
  if (memHit) return memHit;

  try {
    await ensureDirExists();
    const filename = await getFilename(url);
    const fileUri = `${CACHE_FOLDER}${filename}`;

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      // Check age — evict if stale
      const modTime = (fileInfo as any).modificationTime;
      const isStale = modTime && Date.now() / 1000 - modTime > MAX_CACHE_AGE_MS / 1000;
      if (!isStale) {
        memoryCache.set(url, fileInfo.uri);
        return fileInfo.uri;
      }
    }

    // 2. Download and cache
    const { uri } = await FileSystem.downloadAsync(url, fileUri);
    memoryCache.set(url, uri);
    return uri;
  } catch (error: any) {
    if (!error?.message?.includes('deprecated')) {
      console.warn('[ImageCache] Could not cache image, using remote URL:', url);
    }
    return url; // Fallback to remote URL
  }
}

/**
 * Pre-downloads a batch of images with bounded parallelism.
 * Uses a concurrency limit to avoid overwhelming the network.
 */
export async function prefetchImages(urls: string[]): Promise<void> {
  const uniqueUrls = [...new Set(urls.filter(Boolean))];
  if (uniqueUrls.length === 0) return;

  // Filter out URLs already in memory cache
  const toFetch = uniqueUrls.filter(url => !memoryCache.has(url));
  if (toFetch.length === 0) return;

  try {
    await ensureDirExists();

    // Process in parallel batches for speed
    for (let i = 0; i < toFetch.length; i += PREFETCH_CONCURRENCY) {
      const batch = toFetch.slice(i, i + PREFETCH_CONCURRENCY);
      await Promise.allSettled(batch.map(url => getCachedImage(url)));
    }
  } catch (error) {
    console.warn('[ImageCache] Prefetch cycle failed', error);
  }
}

/**
 * Clears both in-memory and filesystem cache.
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear();
  dirReady = null;
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
    }
  } catch (error) {
    console.error('[ImageCache] Error clearing cache:', error);
  }
}

/**
 * Primes the memory cache with pre-known URLs (useful for startup).
 * Does not download — only marks already-local URIs as ready.
 */
export function primeMemoryCache(entries: { remote: string; local: string }[]): void {
  for (const { remote, local } of entries) {
    memoryCache.set(remote, local);
  }
}
