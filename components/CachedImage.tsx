import React, { useState, useEffect, useRef } from 'react';
import { Image, ImageProps } from 'expo-image';
import { getCachedImage } from '../lib/imageCache';

interface CachedImageProps extends ImageProps {
  remoteUri: string;
}

/**
 * Optimized image component that:
 * 1. Shows remote URI immediately (no flash/blank)                      [instant-preview]
 * 2. Upgrades to local filesystem cache in the background               [bg-upgrade]
 * 3. Uses expo-image disk cache as secondary layer                      [disk-fallback]
 * 4. Skips redundant resolves when remoteUri hasn't changed             [stable-ref]
 */
export const CachedImage = ({ remoteUri, style, ...props }: CachedImageProps) => {
  // Start with remote so the image renders immediately while we check cache
  const [sourceUri, setSourceUri] = useState<string>(remoteUri);
  const resolvedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!remoteUri) return;

    // If we already resolved this URL, nothing to do
    if (resolvedRef.current === remoteUri) return;

    let cancelled = false;

    async function resolveImage() {
      const localUri = await getCachedImage(remoteUri);
      if (!cancelled && localUri && localUri !== remoteUri) {
        resolvedRef.current = remoteUri;
        setSourceUri(localUri);
      }
    }

    resolveImage();

    return () => {
      cancelled = true;
    };
  }, [remoteUri]);

  // Sync source when remoteUri changes to a new product
  useEffect(() => {
    if (remoteUri && sourceUri !== remoteUri && resolvedRef.current !== remoteUri) {
      setSourceUri(remoteUri);
    }
  }, [remoteUri]);

  return (
    <Image
      {...props}
      source={{ uri: sourceUri }}
      style={[style, { backgroundColor: 'rgba(184,123,90,0.05)' }]}
      // No fade if already local; smooth fade on first remote load
      transition={sourceUri.startsWith('file') ? 0 : 150}
      // expo-image handles disk cache as a tertiary fallback
      cachePolicy="disk"
    />
  );
};
