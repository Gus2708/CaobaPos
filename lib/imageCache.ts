import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}product_images/`;

/**
 * Ensures the cache folder exists using Legacy API (stable in SDK 54)
 */
async function ensureDirExists() {
  const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
  }
}

/**
 * Gets a stable filename for a URL
 */
async function getFilename(url: string) {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    url
  );
  return `${hash}.png`;
}

/**
 * Resolves a remote URL to a local file URI.
 */
export async function getCachedImage(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('file://') || url.startsWith('content://')) return url;
  
  try {
    await ensureDirExists();
    const filename = await getFilename(url);
    const fileUri = `${CACHE_FOLDER}${filename}`;
    
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      return fileInfo.uri;
    }

    const { uri } = await FileSystem.downloadAsync(url, fileUri);
    return uri;
  } catch (error) {
    if (!error?.message?.includes('deprecated')) {
      console.error('[ImageCache] Error caching image:', error);
    }
    return url; // Fallback to remote URL
  }
}

/**
 * Pre-downloads a batch of images
 */
export async function prefetchImages(urls: string[]) {
  try {
    await ensureDirExists();
    for (const url of urls) {
      if (url) await getCachedImage(url);
    }
  } catch (error) {
     console.warn(`[ImageCache] Prefetch cycle failed`, error);
  }
}

/**
 * Clears the image cache
 */
export async function clearCache() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
    }
  } catch (error) {
    console.error('[ImageCache] Error clearing cache:', error);
  }
}
